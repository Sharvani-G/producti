// public/ui.js
import { saveTasksToBackend } from "./storage.js";

// Helper: get Monday for the week
export function getPresentWeek(date) {
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(date);
  monday.setDate(date.getDate() + diff);
  return monday;
}

// Format YYYY-MM-DD
export function formatWeekKey(date) {
  const monday = getPresentWeek(date);
  return monday.toISOString().split("T")[0];
}

// Main UI render function
export function updateWeekUI(tasksForWeek, weekKey) {
  // ensure globals
  window.currentWeekKey = weekKey;
  window.tasksByWeek[weekKey] = tasksForWeek || {};

  const monday = new Date(weekKey);

  for (let i = 0; i < 7; i++) {
    const dayDate = new Date(monday);
    dayDate.setDate(monday.getDate() + i);

    const dayDiv = document.getElementById("d" + (i + 1));
    if (!dayDiv) continue; // safe guard

    // Set date number (make sure .date exists)
    const dateEl = dayDiv.querySelector(".date");
    if (dateEl) dateEl.textContent = dayDate.getDate();

    // Remove old tasks (safe)
    const existingTasks = dayDiv.querySelectorAll(".task-card");
    existingTasks.forEach((t) => t.remove());

    // Render saved tasks
    if (window.tasksByWeek[weekKey] && window.tasksByWeek[weekKey][i]) {
      window.tasksByWeek[weekKey][i].forEach((taskData) => {
        const card = createTaskCard(
          taskData.text,
          taskData.status,
          taskData.id,
          i
        );
        dayDiv.appendChild(card);
      });
    }
  }

  // After rendering UI, ensure add-task buttons have listeners
  attachAddTaskListeners();
}

// Create task card element
export function createTaskCard(
  text = "",
  status = "default",
  id = null,
  dayIndex
) {
  const taskCard = document.createElement("div");
  taskCard.classList.add("task-card");

  const taskId = id || Date.now() + Math.random().toString().slice(2);

  const st = (status || "default").toLowerCase().replace(" ", "-");
  taskCard.classList.add(st);

  const input = document.createElement("input");
  input.type = "text";
  input.value = text || "";
  input.placeholder = "Enter task";

  const saveBtn = document.createElement("button");
  saveBtn.textContent = text ? "Edit" : "Save";
  saveBtn.dataset.mode = text ? "edit" : "save";

  const statusDiv = document.createElement("div");
  statusDiv.classList.add("status");

  const options = ["Completed", "Abandoned", "In Process"];
  options.forEach((opt) => {
    const label = document.createElement("label");
    const radio = document.createElement("input");
    radio.type = "radio";
    radio.name = "status_" + taskId;
    radio.value = opt;
    if (opt === status) radio.checked = true;

    // 🔹 Change color instantly when status changes
    radio.addEventListener("change", () => {
      const newStatus = radio.value.toLowerCase().replace(" ", "-");
      taskCard.classList.remove(
        "completed",
        "abandoned",
        "in-process",
        "default"
      );
      taskCard.classList.add(newStatus);
    });

    label.appendChild(radio);
    label.appendChild(document.createTextNode(opt));
    statusDiv.appendChild(label);
  });

  // Initial display
  if (text) {
    const savedText = document.createElement("p");
    savedText.textContent = `${text} - ${status}`;
    taskCard.appendChild(savedText);
    statusDiv.querySelectorAll("input").forEach((r) => (r.disabled = true));
  } else {
    taskCard.appendChild(input);
  }

  taskCard.appendChild(saveBtn);
  taskCard.appendChild(statusDiv);

  // Save/Edit click handler
  saveBtn.addEventListener("click", async () => {
    const weekKey = window.currentWeekKey;

    if (!window.tasksByWeek[weekKey]) window.tasksByWeek[weekKey] = {};
    if (!window.tasksByWeek[weekKey][dayIndex])
      window.tasksByWeek[weekKey][dayIndex] = [];

    if (saveBtn.dataset.mode === "save") {
      const taskText = (
        taskCard.querySelector("input") || { value: "" }
      ).value.trim();
      const selectedRadio = statusDiv.querySelector(
        "input[type='radio']:checked"
      );
      const taskStatus = selectedRadio ? selectedRadio.value : "No status";

      // Update text on UI
      const savedText = document.createElement("p");
      savedText.textContent = `${taskText} - ${taskStatus}`;
      const existingInput = taskCard.querySelector("input");
      if (existingInput) taskCard.replaceChild(savedText, existingInput);

      statusDiv.querySelectorAll("input").forEach((r) => (r.disabled = true));

      saveBtn.dataset.mode = "edit";
      saveBtn.textContent = "Edit";

      // Update storage
      const existingIndex = window.tasksByWeek[weekKey][dayIndex].findIndex(
        (t) => t.id === taskId
      );
      if (existingIndex === -1) {
        window.tasksByWeek[weekKey][dayIndex].push({
          id: taskId,
          text: taskText,
          status: taskStatus,
        });
      } else {
        window.tasksByWeek[weekKey][dayIndex][existingIndex] = {
          id: taskId,
          text: taskText,
          status: taskStatus,
        };
      }

      try {
        await saveTasksToBackend(window.currentWeekKey);
      } catch (err) {
        console.error("Save failed:", err);
      }
    } else {
      // Edit mode
      const pEl = taskCard.querySelector("p");
      const existingText = pEl ? pEl.textContent.split(" - ")[0] : "";
      const newInput = document.createElement("input");
      newInput.type = "text";
      newInput.value = existingText;
      taskCard.replaceChild(newInput, pEl);

      statusDiv.querySelectorAll("input").forEach((r) => (r.disabled = false));

      saveBtn.dataset.mode = "save";
      saveBtn.textContent = "Save";
    }
  });

  return taskCard;
}

/* Attach add-task listeners to all day columns.
   We call this after every render so dynamically created days/buttons pick up handlers.
*/
function attachAddTaskListeners() {
  const addBtns = document.querySelectorAll(".add-task");
  addBtns.forEach((btn, idx) => {
    // remove existing listener first (prevent duplicate handlers)
    btn.replaceWith(btn.cloneNode(true));
  });

  // re-select after clone
  const freshBtns = document.querySelectorAll(".add-task");
  freshBtns.forEach((btn, idx) => {
    const dayIndex = idx; // idx 0->d1, idx 1->d2 ...
    btn.addEventListener("click", () => {
      const dayDiv = document.getElementById("d" + (dayIndex + 1));
      if (!dayDiv) return;
      const card = createTaskCard("", "default", null, dayIndex);
      dayDiv.appendChild(card);
      // optionally save right away to backend
      if (!window.tasksByWeek[window.currentWeekKey])
        window.tasksByWeek[window.currentWeekKey] = {};
      if (!window.tasksByWeek[window.currentWeekKey][dayIndex])
        window.tasksByWeek[window.currentWeekKey][dayIndex] = [];
      // do NOT auto-push empty task; it will be saved when user clicks Save inside the card
    });
  });
}

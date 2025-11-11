// Use a shared global store so other modules (main/ui/storage) can access tasks.
window.tasksByWeek = window.tasksByWeek || {};


document.addEventListener('DOMContentLoaded', () => {

/* Format date on left */
const today = new Date();
const options = { year: 'numeric', month: 'long', day: 'numeric' };
document.getElementById("date").textContent = today.toLocaleDateString(undefined, options);

/* Setting dates for week grid */
const date = new Date();

function getPresentWeek(date) {
/* getDay() gives 0-6 representing Sun=0, setDate() sets the date you pass */
const day = date.getDay();
const tosubtractdays = day === 0 ? -6 : 1 - day;
const monday = new Date(date);
monday.setDate(date.getDate() + tosubtractdays);
return monday;
}

const left = document.getElementById('pre-week');
const right = document.getElementById('post-week');

  /* Ensure global tasks store is available */
  window.tasksByWeek = window.tasksByWeek || {};

function formatWeekKey(date) {
/* Format key as YYYY-MM-DD for week Monday */
const monday = getPresentWeek(date);
return monday.toISOString().split('T')[0];
}

function updateWeek() {
const monday = getPresentWeek(date);
const weekKey = formatWeekKey(date);

  /* Set day numbers in the week */
  for (let i = 0; i < 7; i++) {
      const dayDate = new Date(monday);
      dayDate.setDate(monday.getDate() + i);
      const dayDiv = document.getElementById('d' + (i + 1));
      dayDiv.querySelector('.date').textContent = dayDate.getDate();

      /* Clear existing tasks in the day div */
      const existingTasks = dayDiv.querySelectorAll('.task-card');
      existingTasks.forEach(t => t.remove());

      /* Load tasks for this week if any */
      if (tasksByWeek[weekKey] && tasksByWeek[weekKey][i]) {
          tasksByWeek[weekKey][i].forEach(taskData => {
              const taskCard = createTaskCard(taskData.text, taskData.status);
              dayDiv.appendChild(taskCard);
          });
      }
  }

}

/* Previous / Next week buttons */
left.addEventListener("click", () => {
date.setDate(date.getDate() - 7);
updateWeek();
});

right.addEventListener("click", () => {
date.setDate(date.getDate() + 7);
updateWeek();
});

/* ==================== CHANGES START BELOW ==================== */

/* Load from localStorage (if any) */
const savedData = localStorage.getItem("tasksByWeek");
if (savedData) {
  Object.assign(tasksByWeek, JSON.parse(savedData));
}

/* Save helper: persist to backend if possible; fall back to localStorage */
function saveToStorage() {
  try {
    const weekKey = formatWeekKey(date);
    const days = window.tasksByWeek[weekKey] || {};

    // Fire-and-forget POST to backend API (doesn't require modules/imports)
    fetch(`/api/tasks/${weekKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ days })
    }).catch(err => {
      console.warn('Failed to save to server, falling back to localStorage', err);
      // fallback: persist full store locally so nothing is lost
      try { localStorage.setItem("tasksByWeek", JSON.stringify(window.tasksByWeek)); } catch (e) { /* ignore */ }
    });

    // Also update localStorage as a secondary persistence layer
    try { localStorage.setItem("tasksByWeek", JSON.stringify(window.tasksByWeek)); } catch (e) { /* ignore */ }
  } catch (err) {
    console.error('saveToStorage error', err);
  }
}

/* Function to create task card element */
function createTaskCard(text = '', status = 'default') {
  const taskCard = document.createElement('div');
  taskCard.classList.add('task-card');
  taskCard.classList.add(status.toLowerCase().replace(' ', '-') || 'default');

  /* Input box */
  const input = document.createElement('input');
  input.type = 'text';
  input.value = text;
  input.placeholder = 'Enter task';

  /* Save/Edit button */
  const saveBtn = document.createElement('button');
  saveBtn.textContent = 'Save';
  saveBtn.dataset.mode = 'save';

  /* Status radio buttons */
  const statusDiv = document.createElement('div');
  statusDiv.classList.add('status');
  const options = ['Completed', 'Abandoned', 'In Process'];
  options.forEach(opt => {
      const label = document.createElement('label');
      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = 'status_' + Date.now();
      radio.value = opt;
      if (opt === status) radio.checked = true;
      label.appendChild(radio);
      label.appendChild(document.createTextNode(opt));
      statusDiv.appendChild(label);
  });

  taskCard.appendChild(input);
  taskCard.appendChild(saveBtn);
  taskCard.appendChild(statusDiv);

  /* Save/Edit click handler */
  saveBtn.addEventListener('click', () => {
      const weekKey = formatWeekKey(date);
      const dayDiv = taskCard.parentElement;
      const dayIndex = parseInt(dayDiv.id.replace('d', '')) - 1;

      if (saveBtn.dataset.mode === 'save') {
          const taskText = input.value.trim();
          const selectedRadio = statusDiv.querySelector('input[type="radio"]:checked');
          const taskStatus = selectedRadio ? selectedRadio.value : 'No status';

          /* Update class based on status */
          taskCard.classList.remove('completed', 'abandoned', 'in-process', 'default');
          if (taskStatus === 'Completed') taskCard.classList.add('completed');
          else if (taskStatus === 'Abandoned') taskCard.classList.add('abandoned');
          else if (taskStatus === 'In Process') taskCard.classList.add('in-process');
          else taskCard.classList.add('default');

          /* Replace input with static text */
          const savedText = document.createElement('p');
          savedText.textContent = `${taskText} - ${taskStatus}`;
          taskCard.replaceChild(savedText, input);

          /* Disable radios */
          statusDiv.querySelectorAll('input').forEach(r => r.disabled = true);

          saveBtn.dataset.mode = 'edit';
          saveBtn.textContent = 'Edit';

          /* Store task */
          if (!tasksByWeek[weekKey]) tasksByWeek[weekKey] = {};
          if (!tasksByWeek[weekKey][dayIndex]) tasksByWeek[weekKey][dayIndex] = [];

          /* Prevent duplicates */
          const existingIndex = tasksByWeek[weekKey][dayIndex].findIndex(t => t.text === taskText);
          if (existingIndex === -1) {
              tasksByWeek[weekKey][dayIndex].push({ text: taskText, status: taskStatus });
          } else {
              tasksByWeek[weekKey][dayIndex][existingIndex] = { text: taskText, status: taskStatus };
          }

          saveToStorage(); // persist

      } else if (saveBtn.dataset.mode === 'edit') {
          const existingText = taskCard.querySelector('p').textContent.split(' - ')[0];
          const newInput = document.createElement('input');
          newInput.type = 'text';
          newInput.value = existingText;
          taskCard.replaceChild(newInput, taskCard.querySelector('p'));

          /* Enable radios */
          statusDiv.querySelectorAll('input').forEach(r => r.disabled = false);

          saveBtn.dataset.mode = 'save';
          saveBtn.textContent = 'Save';
      }
  });

  return taskCard;
}

/* Attach +Task button functionality */
const addBtns = document.querySelectorAll('.add-task');
addBtns.forEach(addBtn => {
  addBtn.addEventListener('click', () => {
    const dayDiv = addBtn.closest('.day') || addBtn.closest('.content') || addBtn.parentElement;
    const taskCard = createTaskCard();
    dayDiv.appendChild(taskCard);
  });
});

/* Initial week load after storage ready */
updateWeek();

/* Optional: Clear all data button for testing */
const clearBtn = document.createElement('button');
clearBtn.textContent = "Clear All Tasks";
clearBtn.style.position = 'fixed';
clearBtn.style.bottom = '10px';
clearBtn.style.right = '10px';
clearBtn.style.padding = '8px 12px';
clearBtn.style.background = '#f44';
clearBtn.style.color = '#fff';
clearBtn.style.border = 'none';
clearBtn.style.borderRadius = '6px';
clearBtn.style.cursor = 'pointer';
document.body.appendChild(clearBtn);

clearBtn.addEventListener('click', () => {
  localStorage.removeItem("tasksByWeek");
  location.reload();
});

}); // end DOMContentLoaded

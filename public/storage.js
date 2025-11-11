const API_BASE = "";

export async function loadTasksFromBackend(weekKey) {
  const res = await fetch(`${API_BASE}/api/tasks/${weekKey}`);
  if (!res.ok) return {};
  return await res.json();
}

export async function saveTasksToBackend(weekKey) {
  const days = window.tasksByWeek[weekKey] || {};

  await fetch(`${API_BASE}/api/tasks/${weekKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ days })
  });
}

export async function clearWeekOnBackend(weekKey) {
  await fetch(`${API_BASE}/api/tasks/${weekKey}`, { method: "DELETE" });
}

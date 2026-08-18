const STORAGE_KEY = "cocoloco_live_data";

export function saveData(data) {
  if (typeof localStorage === "undefined") return;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch (error) { console.warn("[StorageManager] saveData failed:", error); }
}

export function loadData() {
  if (typeof localStorage === "undefined") return null;
  try { const data = localStorage.getItem(STORAGE_KEY); return data ? JSON.parse(data) : null; } catch (error) { console.warn("[StorageManager] loadData failed:", error); return null; }
}

export function clearData() {
  if (typeof localStorage === "undefined") return;
  try { localStorage.removeItem(STORAGE_KEY); } catch (error) { console.warn("[StorageManager] clearData failed:", error); }
}

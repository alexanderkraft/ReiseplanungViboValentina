export function saveState(storageKey, payload) {
  localStorage.setItem(storageKey, JSON.stringify(payload));
}

export function loadState(storageKey) {
  const raw = localStorage.getItem(storageKey);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    localStorage.removeItem(storageKey);
    return null;
  }
}

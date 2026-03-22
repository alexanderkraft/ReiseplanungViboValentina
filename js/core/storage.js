export function saveState(storageKey, payload) {
  localStorage.setItem(storageKey, JSON.stringify(payload));
}

export function loadState(storageKey) {
  const raw = localStorage.getItem(storageKey);
  return raw ? JSON.parse(raw) : null;
}

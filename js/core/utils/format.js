export function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function formatCurrency(value) {
  return `EUR ${Math.round(Number(value || 0))}`;
}

export function formatDistance(value) {
  return `${Math.round(Number(value || 0))} km`;
}

export function formatDuration(minutes) {
  const safeMinutes = Math.max(0, Math.round(Number(minutes || 0)));
  const hours = Math.floor(safeMinutes / 60);
  const mins = safeMinutes % 60;
  return `${hours}h ${mins}min`;
}

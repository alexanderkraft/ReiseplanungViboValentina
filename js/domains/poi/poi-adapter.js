import { createPoiModel } from './poi-model.js';

export function normalizePoiPlace(raw = {}, category = 'generic', { id, index, etappe } = {}) {
  return createPoiModel({
    id: id || raw.place_id || raw.id || `${category}-${etappe ?? 0}-${index ?? 0}`,
    category,
    name: raw.name || raw.address_line1 || `${category} ${index ?? ''}`.trim(),
    lat: raw.lat ?? null,
    lng: raw.lon ?? raw.lng ?? null,
    description: raw.address_line2 || raw.formatted || '',
    duration: 30,
    etappe: etappe ?? null
  });
}

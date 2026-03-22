import { createTankstelleModel } from './tankstelle-model.js';

export function normalizeTankstellePlace(raw = {}, { id, index, etappe } = {}) {
  return createTankstelleModel({
    id: id || raw.place_id || raw.id || `tank-${etappe ?? 0}-${index ?? 0}`,
    name: raw.name || raw.address_line1 || `Tankstelle ${index ?? ''}`.trim(),
    lat: raw.lat ?? null,
    lng: raw.lon ?? raw.lng ?? null,
    priceLiter: 0,
    info: raw.address_line2 || raw.formatted || '',
    etappe: etappe ?? null
  });
}

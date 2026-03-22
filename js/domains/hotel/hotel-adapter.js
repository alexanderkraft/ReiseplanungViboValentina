import { createHotelModel } from './hotel-model.js';

export function normalizeHotelPlace(raw = {}, { id, index, etappe } = {}) {
  const source = raw.datasource?.raw || {};
  return createHotelModel({
    id: id || raw.place_id || raw.id || `hotel-${etappe ?? 0}-${index ?? 0}`,
    name: raw.name || raw.address_line1 || `Hotel ${index ?? ''}`.trim(),
    lat: raw.lat ?? null,
    lng: raw.lon ?? raw.lng ?? null,
    rating: source.stars || source.star_rating || '-',
    price: 0,
    info: raw.address_line2 || raw.formatted || '',
    website: raw.website || source.website || '',
    phone: raw.contact?.phone || source.phone || '',
    placeId: raw.place_id || '',
    etappe: etappe ?? null
  });
}

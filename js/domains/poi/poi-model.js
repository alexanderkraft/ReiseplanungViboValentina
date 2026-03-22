export function createPoiModel(overrides = {}) {
  return {
    id: '',
    category: '',
    name: '',
    lat: null,
    lng: null,
    description: '',
    duration: 30,
    etappe: null,
    ...overrides
  };
}

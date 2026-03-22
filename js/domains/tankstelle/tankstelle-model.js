export function createTankstelleModel(overrides = {}) {
  return {
    id: '',
    name: '',
    lat: null,
    lng: null,
    priceLiter: 0,
    info: '',
    etappe: null,
    ...overrides
  };
}

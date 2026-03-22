export function createHotelModel(overrides = {}) {
  return {
    id: '',
    name: '',
    lat: null,
    lng: null,
    rating: '-',
    price: 0,
    info: '',
    website: '',
    phone: '',
    placeId: '',
    etappe: null,
    xoteloKey: '',
    pricePerNight: 0,
    priceSource: '',
    allRates: [],
    ...overrides
  };
}

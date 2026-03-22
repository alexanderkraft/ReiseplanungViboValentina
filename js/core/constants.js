export const DEFAULTS = {
  start: '',
  destination: '',
  date: '',
  persons: 2,
  maxKmPerDay: 650,
  fuelPriceLiter: 1.75,
  fuelConsumption: 7,
  hotelPerNight: 80,
  tollPer100Km: 9
};

export const DEFAULT_TRIP_INPUTS = {
  start: DEFAULTS.start,
  destination: DEFAULTS.destination,
  date: DEFAULTS.date,
  persons: DEFAULTS.persons,
  maxKmPerDay: DEFAULTS.maxKmPerDay,
  fuelPrice: DEFAULTS.fuelPriceLiter,
  fuelConsumption: DEFAULTS.fuelConsumption,
  hotelPrice: DEFAULTS.hotelPerNight,
  routeMode: 'balanced',
  fixedLegCount: 0
};

export const STORAGE_KEYS = {
  trip: 'reiseplanerTripV3',
  theme: 'theme'
};

export const DOMAIN_KEYS = ['hotel', 'tankstelle', 'poi', 'maut'];
export const ROUTE_SELECTOR_LABELS = ['Route A', 'Route B', 'Route C'];
export const OVERLAY_TABS = ['hotels', 'tankstellen', 'pausen'];

import { DEFAULT_TRIP_INPUTS } from './constants.js';

export function createInitialState() {
  return {
    trip: {
      inputs: { ...DEFAULT_TRIP_INPUTS },
      routes: [],
      selectedRouteIndex: 0,
      route: {
        start: null,
        destination: null,
        geometry: [],
        distanceKm: 0,
        durationMinutes: 0,
        boundingBox: null
      },
      legs: [],
      pois: {
        hotels: [],
        tankstellen: [],
        pausen: []
      },
      selectedItems: {
        hotels: [],
        tankstellen: [],
        pausen: []
      },
      budget: {
        toll: 0,
        fuel: 0,
        hotels: 0,
        extras: 0,
        total: 0,
        perPerson: 0
      }
    },
    ui: {
      activeTab: 'hotels',
      routeLayer: null,
      markerLayer: null,
      poiLayers: {
        hotels: null,
        tankstellen: null,
        pausen: null
      },
      routeMarkers: [],
      isLoading: false,
      lastRouteBuiltAt: null
    }
  };
}

import { calculateFuelCost } from '../../services/fuel/fuel-service.js';
import { sumSelectedHotelCosts } from '../../domains/hotel/hotel-budget.js';

export function buildBudgetSnapshot({ route, legs, pois, selectedItems, inputs }) {
  const totalKm = route.distanceKm || 0;
  const toll = legs.reduce((sum, leg) => sum + Number(leg.tollEstimate || 0), 0);
  const fuel = calculateFuelCost({
    distanceKm: totalKm,
    fuelConsumption: inputs.fuelConsumption,
    fuelPrice: inputs.fuelPrice
  });
  const hotelNights = Math.max(0, legs.length - 1);
  const hotels = hotelNights * Number(inputs.hotelPrice || 0);

  const extraHotels = sumSelectedHotelCosts(
    selectedItems.hotels.map(id => pois.hotels.find(entry => entry.id === id)).filter(Boolean)
  );
  const extraPausen = selectedItems.pausen.reduce((sum, id) => {
    const item = pois.pausen.find(entry => entry.id === id);
    return sum + (item && item.duration >= 45 ? 12 : 0);
  }, 0);

  const extras = extraHotels + extraPausen;
  const total = toll + fuel + hotels + extras;
  const perPerson = total / Math.max(1, Number(inputs.persons || 1));

  return {
    toll,
    fuel,
    hotels,
    extras,
    total,
    perPerson,
    hotelNights,
    extraHotels,
    extraPausen
  };
}

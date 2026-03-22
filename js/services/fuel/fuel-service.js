export function calculateFuelCost({ distanceKm = 0, fuelConsumption = 0, fuelPrice = 0 }) {
  return (Number(distanceKm) / 100) * Number(fuelConsumption) * Number(fuelPrice);
}

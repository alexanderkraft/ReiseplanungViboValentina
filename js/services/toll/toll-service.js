import { estimateTollFromDistance } from '../../domains/maut/maut-estimator.js';

export function calculateTollEstimate(distanceKm, ratePer100Km) {
  return estimateTollFromDistance(distanceKm, ratePer100Km).amount;
}

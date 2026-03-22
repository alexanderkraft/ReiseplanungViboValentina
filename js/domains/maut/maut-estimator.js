import { createMautModel } from './maut-model.js';

export function estimateTollFromDistance(distanceKm = 0, ratePer100Km = 9) {
  return createMautModel({
    amount: Math.round((Number(distanceKm) / 100) * Number(ratePer100Km))
  });
}

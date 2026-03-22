import { ROUTE_SELECTOR_LABELS } from '../../core/constants.js';

export function getRouteSelectorLabel(index) {
  return ROUTE_SELECTOR_LABELS[index] || `Route ${index + 1}`;
}

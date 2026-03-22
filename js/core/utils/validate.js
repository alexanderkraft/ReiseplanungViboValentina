export function hasRequiredRouteInputs(inputs) {
  return Boolean(inputs?.start?.trim() && inputs?.destination?.trim());
}

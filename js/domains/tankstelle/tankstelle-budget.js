export function summarizeTankstellenSelection(stops = []) {
  return {
    count: stops.length,
    withKnownPrice: stops.filter(stop => Number.isFinite(stop?.priceLiter) && stop.priceLiter > 0).length
  };
}

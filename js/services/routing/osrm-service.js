export async function fetchOsrmRoutes({ start, destination }) {
  const url = `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson&steps=false&alternatives=true`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Routing fehlgeschlagen (${response.status})`);
  }

  const data = await response.json();
  if (!data.routes || !data.routes.length) {
    throw new Error('Keine Route gefunden');
  }

  return data.routes.slice(0, 3).map((route, index) => ({
    index,
    geometry: route.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
    distanceKm: Math.round(route.distance / 1000),
    durationMinutes: Math.round(route.duration / 60)
  }));
}

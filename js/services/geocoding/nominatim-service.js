export async function geocodeLocation(query) {
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(query)}`;
  const response = await fetch(url, {
    headers: { Accept: 'application/json' }
  });

  if (!response.ok) {
    throw new Error(`Geocoding fehlgeschlagen (${response.status})`);
  }

  const results = await response.json();
  if (!results.length) {
    throw new Error(`Ort nicht gefunden: ${query}`);
  }

  const result = results[0];
  return {
    name: result.display_name,
    lat: parseFloat(result.lat),
    lng: parseFloat(result.lon)
  };
}

export async function reverseGeocodeLocation(lat, lng) {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=10`;
  const response = await fetch(url, {
    headers: { Accept: 'application/json' }
  });

  if (!response.ok) {
    throw new Error(`Reverse-Geocoding fehlgeschlagen (${response.status})`);
  }

  const data = await response.json();
  return data.address?.city || data.address?.town || data.address?.village || data.name || null;
}

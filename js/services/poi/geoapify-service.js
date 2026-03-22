export function getGeoapifyApiKey() {
  return (typeof window !== 'undefined' && window.GEOAPIFY_API_KEY) || '';
}

export async function fetchGeoapifyPois({ lat, lng, category, limit = 5, radiusM = 10000 }) {
  const apiKey = getGeoapifyApiKey();
  if (!apiKey) {
    return [];
  }

  const url = `https://api.geoapify.com/v2/places?categories=${category}&filter=circle:${lng},${lat},${radiusM}&limit=${limit}&apiKey=${apiKey}`;
  try {
    const response = await fetch(url);
    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    return (data.features || []).map(feature => feature.properties);
  } catch {
    return [];
  }
}

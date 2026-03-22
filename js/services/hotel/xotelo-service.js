const searchCache = new Map();
const ratesCache = new Map();

export async function searchXoteloHotel(hotelName) {
  if (!hotelName) return null;

  const cacheKey = hotelName.toLowerCase().trim();
  if (searchCache.has(cacheKey)) return searchCache.get(cacheKey);

  const url = `https://data.xotelo.com/api/search?query=${encodeURIComponent(hotelName)}`;
  try {
    const response = await fetch(url);
    if (!response.ok) {
      searchCache.set(cacheKey, null);
      return null;
    }
    const data = await response.json();
    const list = data?.result?.list;
    if (!Array.isArray(list) || list.length === 0) {
      searchCache.set(cacheKey, null);
      return null;
    }

    const nameLower = hotelName.toLowerCase();
    const match = list.find(h => h.name && h.name.toLowerCase().includes(nameLower))
      || list.find(h => nameLower.includes(h.name?.toLowerCase()))
      || list[0];

    const result = { hotel_key: match.hotel_key, name: match.name };
    searchCache.set(cacheKey, result);
    return result;
  } catch {
    searchCache.set(cacheKey, null);
    return null;
  }
}

export async function fetchXoteloRates(hotelKey, checkIn, checkOut) {
  if (!hotelKey || !checkIn || !checkOut) return null;

  const cacheKey = `${hotelKey}_${checkIn}_${checkOut}`;
  if (ratesCache.has(cacheKey)) return ratesCache.get(cacheKey);

  const url = `https://data.xotelo.com/api/rates?hotel_key=${encodeURIComponent(hotelKey)}&chk_in=${checkIn}&chk_out=${checkOut}`;
  try {
    const response = await fetch(url);
    if (!response.ok) {
      ratesCache.set(cacheKey, null);
      return null;
    }
    const data = await response.json();
    const rates = data?.result?.rates;
    if (!Array.isArray(rates) || rates.length === 0) {
      ratesCache.set(cacheKey, null);
      return null;
    }

    const validRates = rates.filter(r => r.rate > 0);
    if (validRates.length === 0) {
      ratesCache.set(cacheKey, null);
      return null;
    }

    validRates.sort((a, b) => a.rate - b.rate);
    const result = {
      minRate: validRates[0].rate,
      minSource: validRates[0].name,
      rates: validRates.map(r => ({ name: r.name, rate: r.rate }))
    };
    ratesCache.set(cacheKey, result);
    return result;
  } catch {
    ratesCache.set(cacheKey, null);
    return null;
  }
}

const USD_TO_EUR = 0.92;

export async function enrichHotelWithPricing(hotel, checkIn, checkOut) {
  const searchResult = await searchXoteloHotel(hotel.name);
  if (!searchResult) return hotel;

  const ratesResult = await fetchXoteloRates(searchResult.hotel_key, checkIn, checkOut);
  if (!ratesResult) {
    hotel.xoteloKey = searchResult.hotel_key;
    return hotel;
  }

  hotel.xoteloKey = searchResult.hotel_key;
  hotel.pricePerNight = Math.round(ratesResult.minRate * USD_TO_EUR);
  hotel.priceSource = ratesResult.minSource;
  hotel.allRates = ratesResult.rates.map(r => ({ name: r.name, rate: Math.round(r.rate * USD_TO_EUR) }));

  return hotel;
}

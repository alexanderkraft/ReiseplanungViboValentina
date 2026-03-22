const DEFAULTS = {
  start: '',
  destination: '',
  date: '',
  persons: 2,
  maxKmPerDay: 650,
  fuelPriceLiter: 1.75,
  fuelConsumption: 7,
  hotelPerNight: 80,
  tollPer100Km: 9
};

const APP_STATE = {
  trip: {
    inputs: {
      start: DEFAULTS.start,
      destination: DEFAULTS.destination,
      date: DEFAULTS.date,
      persons: DEFAULTS.persons,
      maxKmPerDay: DEFAULTS.maxKmPerDay,
      fuelPrice: DEFAULTS.fuelPriceLiter,
      fuelConsumption: DEFAULTS.fuelConsumption,
      hotelPrice: DEFAULTS.hotelPerNight,
      routeMode: 'balanced'
    },
    route: {
      start: null,
      destination: null,
      geometry: [],
      distanceKm: 0,
      durationMinutes: 0,
      boundingBox: null
    },
    legs: [],
    pois: {
      hotels: [],
      tankstellen: [],
      pausen: []
    },
    selectedItems: {
      hotels: [],
      tankstellen: [],
      pausen: []
    },
    budget: {
      toll: 0,
      fuel: 0,
      hotels: 0,
      extras: 0,
      total: 0,
      perPerson: 0
    }
  },
  ui: {
    activeTab: 'hotels',
    routeLayer: null,
    markerLayer: null,
    poiLayers: {
      hotels: null,
      tankstellen: null,
      pausen: null
    },
    routeMarkers: [],
    isLoading: false,
    lastRouteBuiltAt: null
  }
};


let map;

function $(id) {
  return document.getElementById(id);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function formatCurrency(value) {
  return `EUR ${Math.round(value)}`;
}

function formatDistance(value) {
  return `${Math.round(value)} km`;
}

function formatDuration(minutes) {
  const safeMinutes = Math.max(0, Math.round(minutes));
  const hours = Math.floor(safeMinutes / 60);
  const mins = safeMinutes % 60;
  return `${hours}h ${mins}min`;
}

function haversineKm(a, b) {
  const toRad = deg => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b[0] - a[0]);
  const dLng = toRad(b[1] - a[1]);
  const lat1 = toRad(a[0]);
  const lat2 = toRad(b[0]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function interpolatePoint(a, b, ratio) {
  return [
    a[0] + (b[0] - a[0]) * ratio,
    a[1] + (b[1] - a[1]) * ratio
  ];
}

function setLoadingState(isLoading, message = 'Route wird berechnet ...') {
  APP_STATE.ui.isLoading = isLoading;
  $('routeSummaryBadge').textContent = isLoading ? 'Live-Berechnung ...' : 'Aktuell';
  $('calculateBtn').disabled = isLoading;
  $('calculateBtn').innerHTML = isLoading
    ? `<i class="fas fa-spinner fa-spin"></i> ${message}`
    : '<i class="fas fa-calculator"></i> Route berechnen';
}

function readInputsIntoState() {
  APP_STATE.trip.inputs = {
    ...APP_STATE.trip.inputs,
    start: $('startInput').value.trim(),
    destination: $('zielInput').value.trim(),
    date: $('dateInput').value,
    persons: Math.max(1, parseInt($('personenInput').value, 10) || DEFAULTS.persons),
    maxKmPerDay: Math.max(150, parseInt($('maxKmPerDayInput').value, 10) || DEFAULTS.maxKmPerDay),
    fuelPrice: parseFloat($('fuelPrice').value) || DEFAULTS.fuelPriceLiter,
    fuelConsumption: parseFloat($('fuelConsumption').value) || DEFAULTS.fuelConsumption,
    hotelPrice: parseFloat($('hotelPrice').value) || DEFAULTS.hotelPerNight,
    routeMode: APP_STATE.trip.inputs.routeMode || 'balanced'
  };
}

function writeStateToInputs() {
  const { inputs } = APP_STATE.trip;
  $('startInput').value = inputs.start;
  $('zielInput').value = inputs.destination;
  $('dateInput').value = inputs.date;
  $('personenInput').value = inputs.persons || DEFAULTS.persons;
  $('maxKmPerDayInput').value = inputs.maxKmPerDay || DEFAULTS.maxKmPerDay;
  $('fuelPrice').value = inputs.fuelPrice || DEFAULTS.fuelPriceLiter;
  $('fuelConsumption').value = inputs.fuelConsumption || DEFAULTS.fuelConsumption;
  $('hotelPrice').value = inputs.hotelPrice || DEFAULTS.hotelPerNight;
  document.querySelectorAll('.route-opt').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === inputs.routeMode);
  });
}

function initMap() {
  map = L.map('map').setView([48.2, 11.7], 5);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 18
  }).addTo(map);

  APP_STATE.ui.markerLayer = L.layerGroup().addTo(map);
  APP_STATE.ui.poiLayers.hotels = L.layerGroup().addTo(map);
  APP_STATE.ui.poiLayers.tankstellen = L.layerGroup().addTo(map);
  APP_STATE.ui.poiLayers.pausen = L.layerGroup().addTo(map);
}

function createIcon(type, emoji) {
  const classMap = { hotels: 'marker-hotel', tankstellen: 'marker-tank', pausen: 'marker-pause' };
  return L.divIcon({
    className: '',
    html: `<div class="custom-marker ${classMap[type]}">${emoji}</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -18]
  });
}

function createRouteMarkerIcon(label) {
  return L.divIcon({
    className: 'route-pin-wrapper',
    html: `<div class="route-pin">${escapeHtml(label)}</div>`,
    iconSize: [38, 38],
    iconAnchor: [19, 19]
  });
}

function clearRouteOverlays() {
  if (APP_STATE.ui.routeLayer) {
    map.removeLayer(APP_STATE.ui.routeLayer);
    APP_STATE.ui.routeLayer = null;
  }
  APP_STATE.ui.markerLayer.clearLayers();
  Object.values(APP_STATE.ui.poiLayers).forEach(layer => layer.clearLayers());
  APP_STATE.ui.routeMarkers = [];
}

async function geocodeLocation(query) {
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

async function fetchRoute(start, destination) {
  const url = `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson&steps=false`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Routing fehlgeschlagen (${response.status})`);
  }

  const data = await response.json();
  if (!data.routes || !data.routes.length) {
    throw new Error('Keine Route gefunden');
  }

  return data.routes[0];
}

function computeBoundingBox(coords) {
  const bounds = L.latLngBounds(coords.map(coord => [coord[0], coord[1]]));
  return bounds;
}

function buildLegsFromGeometry(geometry, totalDistanceKm, totalDurationMinutes, inputs) {
  if (geometry.length < 2) {
    return [];
  }

  const targetKm = inputs.routeMode === 'short-day'
    ? Math.max(150, inputs.maxKmPerDay - 100)
    : inputs.maxKmPerDay;

  const segmentDistances = [];
  let accumulated = 0;

  for (let i = 0; i < geometry.length - 1; i++) {
    const segmentKm = haversineKm(geometry[i], geometry[i + 1]);
    segmentDistances.push(segmentKm);
    accumulated += segmentKm;
  }

  const totalKmApprox = accumulated || totalDistanceKm;
  const stopPoints = [geometry[0]];

  let runningKm = 0;
  let nextBreakAt = targetKm;
  for (let i = 0; i < segmentDistances.length; i++) {
    const start = geometry[i];
    const end = geometry[i + 1];
    const segmentKm = segmentDistances[i];

    while (runningKm + segmentKm >= nextBreakAt && nextBreakAt < totalKmApprox - 20) {
      const remainingToBreak = nextBreakAt - runningKm;
      const ratio = segmentKm === 0 ? 0 : remainingToBreak / segmentKm;
      stopPoints.push(interpolatePoint(start, end, Math.min(1, Math.max(0, ratio))));
      nextBreakAt += targetKm;
    }

    runningKm += segmentKm;
  }

  stopPoints.push(geometry[geometry.length - 1]);

  const hotelNights = Math.max(0, stopPoints.length - 2);
  $('hotelNightCount').textContent = String(hotelNights);

  const legs = [];
  for (let i = 0; i < stopPoints.length - 1; i++) {
    const fromCoord = stopPoints[i];
    const toCoord = stopPoints[i + 1];
    const isFirst = i === 0;
    const isLast = i === stopPoints.length - 2;

    const fromLabel = isFirst ? inputs.start : `Stopp ${i}`;
    const toLabel = isLast ? inputs.destination : `Stopp ${i + 1}`;
    const km = totalDistanceKm * (haversineKm(fromCoord, toCoord) / totalKmApprox || 0);
    const ratio = totalKmApprox === 0 ? 0 : haversineKm(fromCoord, toCoord) / totalKmApprox;
    const minutes = Math.max(20, totalDurationMinutes * ratio);

    legs.push({
      id: `leg-${i + 1}`,
      index: i,
      fromLabel,
      toLabel,
      km: Math.max(1, Math.round(km)),
      minutes: Math.round(minutes),
      fromCoord,
      toCoord,
      midpoint: interpolatePoint(fromCoord, toCoord, 0.5),
      tollEstimate: Math.round((km / 100) * DEFAULTS.tollPer100Km)
    });
  }

  return legs;
}

function getGeoapifyApiKey() {
  return (typeof window !== 'undefined' && window.GEOAPIFY_API_KEY) || '';
}

async function fetchGeoapifyPois(lat, lng, category, limit = 5, radiusM = 10000) {
  const apiKey = getGeoapifyApiKey();
  if (!apiKey) return [];

  const url = `https://api.geoapify.com/v2/places?categories=${category}&filter=circle:${lng},${lat},${radiusM}&limit=${limit}&apiKey=${apiKey}`;
  try {
    const response = await fetch(url);
    if (!response.ok) return [];
    const data = await response.json();
    return (data.features || []).map(f => f.properties);
  } catch {
    return [];
  }
}

async function fetchRealPois(legs) {
  const apiKey = getGeoapifyApiKey();
  const hotels = [];
  const tankstellen = [];
  const pausen = [];

  if (!apiKey) {
    console.warn('Kein Geoapify API-Key konfiguriert. Bitte window.GEOAPIFY_API_KEY in js/config.js setzen.');
    return { hotels, tankstellen, pausen };
  }

  const promises = legs.map(async (leg, index) => {
    const legHotels = [];
    const legTanks = [];
    const legPausen = [];

    const hotelFetch = (index < legs.length - 1)
      ? fetchGeoapifyPois(leg.toCoord[0], leg.toCoord[1], 'accommodation.hotel', 5, 10000)
      : Promise.resolve([]);

    const tankFetch = fetchGeoapifyPois(leg.midpoint[0], leg.midpoint[1], 'service.vehicle.fuel', 5, 15000);
    const pauseFetch = fetchGeoapifyPois(leg.midpoint[0], leg.midpoint[1], 'catering.restaurant', 5, 10000);

    const [hotelResults, tankResults, pauseResults] = await Promise.all([hotelFetch, tankFetch, pauseFetch]);

    hotelResults.forEach((p, i) => {
      legHotels.push({
        id: `hotel-${index + 1}-${i + 1}`,
        name: p.name || p.address_line1 || `Hotel ${i + 1}`,
        price: 0,
        rating: p.datasource?.raw?.stars || '-',
        lat: p.lat,
        lng: p.lon,
        etappe: index,
        info: p.address_line2 || p.formatted || ''
      });
    });

    tankResults.forEach((p, i) => {
      legTanks.push({
        id: `tank-${index + 1}-${i + 1}`,
        name: p.name || p.address_line1 || `Tankstelle ${i + 1}`,
        priceLiter: 0,
        lat: p.lat,
        lng: p.lon,
        etappe: index,
        info: p.address_line2 || p.formatted || ''
      });
    });

    pauseResults.forEach((p, i) => {
      legPausen.push({
        id: `pause-${index + 1}-${i + 1}`,
        name: p.name || p.address_line1 || `Restaurant ${i + 1}`,
        duration: 30,
        lat: p.lat,
        lng: p.lon,
        etappe: index,
        description: p.address_line2 || p.formatted || ''
      });
    });

    return { legHotels, legTanks, legPausen };
  });

  const results = await Promise.all(promises);
  results.forEach(r => {
    hotels.push(...r.legHotels);
    tankstellen.push(...r.legTanks);
    pausen.push(...r.legPausen);
  });

  return { hotels, tankstellen, pausen };
}

async function reverseGeocode(lat, lng) {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=10`;
  try {
    const response = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!response.ok) return null;
    const data = await response.json();
    return data.address?.city || data.address?.town || data.address?.village || data.name || null;
  } catch {
    return null;
  }
}

async function resolveStopNames(legs) {
  const intermediateLegs = legs.filter((_, i) => i > 0 && i < legs.length);
  const coords = [];

  legs.forEach((leg, i) => {
    if (i > 0) {
      coords.push({ legIndex: i, field: 'fromLabel', coord: leg.fromCoord });
    }
    if (i < legs.length - 1) {
      coords.push({ legIndex: i, field: 'toLabel', coord: leg.toCoord });
    }
  });

  const uniqueCoords = [];
  const seen = new Set();
  coords.forEach(c => {
    const key = `${c.coord[0].toFixed(4)},${c.coord[1].toFixed(4)}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueCoords.push({ key, coord: c.coord });
    }
  });

  const nameMap = {};
  const results = await Promise.all(
    uniqueCoords.map(async uc => {
      const name = await reverseGeocode(uc.coord[0], uc.coord[1]);
      return { key: uc.key, name };
    })
  );
  results.forEach(r => { nameMap[r.key] = r.name; });

  coords.forEach(c => {
    const key = `${c.coord[0].toFixed(4)},${c.coord[1].toFixed(4)}`;
    const name = nameMap[key];
    if (name) {
      legs[c.legIndex][c.field] = name;
    }
  });
}

function resetSelectionsForNewRoute() {
  APP_STATE.trip.selectedItems = {
    hotels: [],
    tankstellen: [],
    pausen: []
  };
}

function renderRoute() {
  clearRouteOverlays();

  const coords = APP_STATE.trip.route.geometry;
  if (!coords.length) {
    return;
  }

  APP_STATE.ui.routeLayer = L.polyline(coords, {
    color: '#3b82f6',
    weight: 5,
    opacity: 0.85
  }).addTo(map);

  const points = [];
  if (APP_STATE.trip.route.start) {
    points.push({ label: 'S', name: APP_STATE.trip.inputs.start, coord: [APP_STATE.trip.route.start.lat, APP_STATE.trip.route.start.lng] });
  }
  APP_STATE.trip.legs.forEach((leg, index) => {
    if (index < APP_STATE.trip.legs.length - 1) {
      points.push({ label: String(index + 1), name: leg.toLabel, coord: leg.toCoord });
    }
  });
  if (APP_STATE.trip.route.destination) {
    points.push({ label: 'Z', name: APP_STATE.trip.inputs.destination, coord: [APP_STATE.trip.route.destination.lat, APP_STATE.trip.route.destination.lng] });
  }

  points.forEach(point => {
    const marker = L.marker(point.coord, { icon: createRouteMarkerIcon(point.label) }).addTo(APP_STATE.ui.markerLayer);
    marker.bindPopup(`<b>${escapeHtml(point.name)}</b>`);
    APP_STATE.ui.routeMarkers.push(marker);
  });

  const bounds = computeBoundingBox(coords);
  map.fitBounds(bounds, { padding: [30, 30] });
}

function renderEtappen() {
  const grid = $('etappenGrid');
  grid.innerHTML = '';

  if (!APP_STATE.trip.legs.length) {
    grid.innerHTML = '<div class="empty-state">Noch keine Etappen vorhanden. Bitte eine Route berechnen.</div>';
    return;
  }

  APP_STATE.trip.legs.forEach((leg, index) => {
    const card = document.createElement('div');
    card.className = 'etappe-card';
    card.onclick = () => zoomToLeg(index);
    card.innerHTML = `
      <h3><i class="fas fa-route"></i> Etappe ${index + 1}</h3>
      <div class="detail"><i class="fas fa-map-marker-alt"></i> ${escapeHtml(leg.fromLabel)} - ${escapeHtml(leg.toLabel)}</div>
      <div class="detail"><i class="fas fa-road"></i> ${leg.km} km</div>
      <div class="detail"><i class="fas fa-clock"></i> ~${formatDuration(leg.minutes)}</div>
      <div class="detail"><i class="fas fa-coins"></i> Maut-Schaetzung: ${formatCurrency(leg.tollEstimate)}</div>
      <div class="detail" style="margin-top:0.5rem;font-style:italic;opacity:0.7">Auto-generiert mit max. ${APP_STATE.trip.inputs.maxKmPerDay} km/Tag</div>
    `;
    grid.appendChild(card);
  });
}

function zoomToLeg(index) {
  const leg = APP_STATE.trip.legs[index];
  if (!leg) return;
  const bounds = L.latLngBounds([leg.fromCoord, leg.toCoord]);
  map.fitBounds(bounds, { padding: [60, 60] });
}

function renderOverlayItems(type) {
  const container = $('overlayContent');
  const data = APP_STATE.trip.pois[type] || [];

  if (!APP_STATE.trip.legs.length) {
    container.innerHTML = '<div class="empty-state">Berechne zuerst eine Route, um Vorschlaege zu sehen.</div>';
    return;
  }

  if (!data.length) {
    const apiKey = getGeoapifyApiKey();
    const hint = apiKey
      ? 'Keine Ergebnisse fuer diese Route gefunden.'
      : 'Bitte Geoapify API-Key in js/config.js konfigurieren (window.GEOAPIFY_API_KEY = "...").';
    container.innerHTML = `<div class="empty-state">${hint}</div>`;
    return;
  }

  const emojiMap = { hotels: '🏨', tankstellen: '⛽', pausen: '☕' };
  let html = '';

  APP_STATE.trip.legs.forEach((leg, legIndex) => {
    const legItems = data.filter(item => item.etappe === legIndex);
    if (!legItems.length) return;

    html += `<div class="overlay-etappe-label">${emojiMap[type]} Etappe ${legIndex + 1}: ${escapeHtml(leg.fromLabel)} - ${escapeHtml(leg.toLabel)}</div>`;

    legItems.forEach(item => {
      const isSelected = APP_STATE.trip.selectedItems[type].includes(item.id);
      let priceText = '';
      let infoText = '';

      if (type === 'hotels') {
        priceText = `${formatCurrency(item.price)}`;
        infoText = `Bewertung: ${item.rating}/5`;
      } else if (type === 'tankstellen') {
        priceText = `EUR ${item.priceLiter.toFixed(2)}/L`;
        infoText = item.info;
      } else {
        priceText = `${item.duration} min`;
        infoText = item.description;
      }

      html += `
        <div class="overlay-item ${isSelected ? 'selected' : ''}" data-type="${type}" data-id="${item.id}">
          <div class="overlay-item-left">
            <div class="overlay-item-name">${isSelected ? '&#10003; ' : ''}${escapeHtml(item.name)}</div>
            <div class="overlay-item-info">${escapeHtml(infoText)}</div>
          </div>
          <div class="overlay-item-price">${priceText}</div>
        </div>
      `;
    });
  });

  container.innerHTML = html;
  container.querySelectorAll('.overlay-item').forEach(item => {
    item.addEventListener('click', () => toggleSelection(item.dataset.type, item.dataset.id));
  });
}

function addMarkerForItem(type, itemId) {
  const layer = APP_STATE.ui.poiLayers[type];
  const item = (APP_STATE.trip.pois[type] || []).find(entry => entry.id === itemId);
  if (!layer || !item) return;

  const config = {
    hotels: { emoji: '🏨', popup: `<b>🏨 ${escapeHtml(item.name)}</b><br>${formatCurrency(item.price)}/Nacht<br>Bewertung: ${item.rating}/5` },
    tankstellen: { emoji: '⛽', popup: `<b>⛽ ${escapeHtml(item.name)}</b><br>EUR ${item.priceLiter.toFixed(2)}/Liter` },
    pausen: { emoji: '☕', popup: `<b>☕ ${escapeHtml(item.name)}</b><br>${item.duration} min<br>${escapeHtml(item.description)}` }
  }[type];

  const marker = L.marker([item.lat, item.lng], { icon: createIcon(type, config.emoji) }).addTo(layer);
  marker.bindPopup(config.popup);
  marker._itemType = type;
  marker._itemId = itemId;
  marker.openPopup();
}

function removeMarkerForItem(type, itemId) {
  const layer = APP_STATE.ui.poiLayers[type];
  if (!layer) return;
  layer.eachLayer(marker => {
    if (marker._itemType === type && marker._itemId === itemId) {
      layer.removeLayer(marker);
    }
  });
}

function toggleSelection(type, itemId) {
  const arr = APP_STATE.trip.selectedItems[type];
  const idx = arr.indexOf(itemId);

  if (idx >= 0) {
    arr.splice(idx, 1);
    removeMarkerForItem(type, itemId);
  } else {
    arr.push(itemId);
    addMarkerForItem(type, itemId);
  }

  renderOverlayItems(APP_STATE.ui.activeTab);
  calculateBudget();
  updateInfoBanner();
  saveTripToLocalStorage();
}

function calculateBudget() {
  readInputsIntoState();
  const { route, legs, pois, selectedItems, inputs } = APP_STATE.trip;
  const totalKm = route.distanceKm || 0;
  const toll = legs.reduce((sum, leg) => sum + leg.tollEstimate, 0);
  const fuel = (totalKm / 100) * inputs.fuelConsumption * inputs.fuelPrice;
  const hotelNights = Math.max(0, legs.length - 1);
  const hotels = hotelNights * inputs.hotelPrice;

  const extraHotels = selectedItems.hotels.reduce((sum, id) => {
    const item = pois.hotels.find(entry => entry.id === id);
    return sum + (item ? item.price : 0);
  }, 0);

  const extraPausen = selectedItems.pausen.reduce((sum, id) => {
    const item = pois.pausen.find(entry => entry.id === id);
    return sum + (item && item.duration >= 45 ? 12 : 0);
  }, 0);

  const extras = extraHotels + extraPausen;
  const total = toll + fuel + hotels + extras;
  const perPerson = total / Math.max(1, inputs.persons);

  APP_STATE.trip.budget = {
    toll,
    fuel,
    hotels,
    extras,
    total,
    perPerson
  };

  $('budgetDistance').textContent = totalKm ? formatDistance(totalKm) : '-';
  $('budgetMaut').textContent = formatCurrency(toll);
  $('budgetBenzin').textContent = formatCurrency(fuel);
  $('budgetHotels').textContent = formatCurrency(hotels);
  $('budgetTotal').textContent = formatCurrency(total);
  $('budgetPerPerson').textContent = `${formatCurrency(perPerson)} pro Person`;
  $('hotelNightCount').textContent = String(hotelNights);

  let extrasHtml = '';
  if (extraHotels > 0) {
    extrasHtml += `<div class="budget-item extra"><span>🏨 Zusatz-Hotels</span><span>+${formatCurrency(extraHotels)}</span></div>`;
  }
  if (extraPausen > 0) {
    extrasHtml += `<div class="budget-item extra"><span>☕ Pausen / Eintritte</span><span>+${formatCurrency(extraPausen)}</span></div>`;
  }
  $('budgetExtras').innerHTML = extrasHtml;
}

function updateInfoBanner() {
  const selected = APP_STATE.trip.selectedItems;
  const total = selected.hotels.length + selected.tankstellen.length + selected.pausen.length;
  const banner = $('infoBanner');

  if (!total) {
    banner.style.display = 'none';
    return;
  }

  const parts = [];
  if (selected.hotels.length) parts.push(`${selected.hotels.length} Hotel(s)`);
  if (selected.tankstellen.length) parts.push(`${selected.tankstellen.length} Tankstelle(n)`);
  if (selected.pausen.length) parts.push(`${selected.pausen.length} Pause(n)`);

  banner.style.display = 'flex';
  $('bannerText').innerHTML = `<i class="fas fa-check-circle"></i> ${total} Stops ausgewaehlt: ${parts.join(', ')} | Gesamt ${formatCurrency(APP_STATE.trip.budget.total)}`;
}

function updateFooter() {
  const { inputs, route, legs } = APP_STATE.trip;
  if (!route.distanceKm) {
    $('footerRouteText').textContent = 'Reiseplaner v3.0 | Bereit fuer beliebige Autoreisen';
    return;
  }

  $('footerRouteText').textContent = `Reiseplaner v3.0 | ${inputs.start} → ${inputs.destination} | ${formatDistance(route.distanceKm)} | ${formatDuration(route.durationMinutes)} | ${legs.length} Etappe(n)`;
}

function darkModeToggle() {
  const root = document.documentElement;
  const isDark = root.getAttribute('data-theme') === 'dark';
  root.setAttribute('data-theme', isDark ? 'light' : 'dark');
  $('themeToggle').innerHTML = isDark
    ? '<i class="fas fa-moon"></i> Dark Mode'
    : '<i class="fas fa-sun"></i> Light Mode';
  localStorage.setItem('theme', isDark ? 'light' : 'dark');
}

function toggleSidebar() {
  const sidebar = $('sidebar');
  const overlay = $('sidebarOverlay');
  const willOpen = !sidebar.classList.contains('active');
  sidebar.classList.toggle('active');
  overlay.classList.toggle('active');
  if (willOpen) {
    renderOverlayItems(APP_STATE.ui.activeTab);
  }
}

function switchTab(type) {
  APP_STATE.ui.activeTab = type;
  document.querySelectorAll('.overlay-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.tab === type);
  });
  renderOverlayItems(type);
}

function applyRouteMode(mode) {
  APP_STATE.trip.inputs.routeMode = mode;
  document.querySelectorAll('.route-opt').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === mode);
  });
  if (APP_STATE.trip.route.geometry.length) {
    APP_STATE.trip.legs = buildLegsFromGeometry(
      APP_STATE.trip.route.geometry,
      APP_STATE.trip.route.distanceKm,
      APP_STATE.trip.route.durationMinutes,
      APP_STATE.trip.inputs
    );
    resetSelectionsForNewRoute();
    clearRouteOverlays();
    renderRoute();
    renderEtappen();
    calculateBudget();
    updateInfoBanner();
    updateFooter();
    saveTripToLocalStorage();
    fetchRealPois(APP_STATE.trip.legs).then(pois => {
      APP_STATE.trip.pois = pois;
      renderOverlayItems(APP_STATE.ui.activeTab);
      saveTripToLocalStorage();
    });
  }
}

async function rebuildTrip() {
  readInputsIntoState();
  const { start, destination } = APP_STATE.trip.inputs;
  if (!start || !destination) {
    $('etappenGrid').innerHTML = '<div class="empty-state">Bitte Start und Ziel eingeben.</div>';
    return;
  }
  setLoadingState(true);

  try {
    const start = await geocodeLocation(APP_STATE.trip.inputs.start);
    const destination = await geocodeLocation(APP_STATE.trip.inputs.destination);
    const routeData = await fetchRoute(start, destination);
    const geometry = routeData.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
    const distanceKm = Math.round(routeData.distance / 1000);
    const durationMinutes = Math.round(routeData.duration / 60);

    APP_STATE.trip.route = {
      start,
      destination,
      geometry,
      distanceKm,
      durationMinutes,
      boundingBox: computeBoundingBox(geometry)
    };

    APP_STATE.trip.legs = buildLegsFromGeometry(geometry, distanceKm, durationMinutes, APP_STATE.trip.inputs);
    resetSelectionsForNewRoute();

    renderRoute();
    renderEtappen();
    calculateBudget();
    updateInfoBanner();
    updateFooter();
    APP_STATE.ui.lastRouteBuiltAt = new Date().toISOString();
    saveTripToLocalStorage();

    await resolveStopNames(APP_STATE.trip.legs);
    renderEtappen();
    renderRoute();

    APP_STATE.trip.pois = await fetchRealPois(APP_STATE.trip.legs);
    renderOverlayItems(APP_STATE.ui.activeTab);
    saveTripToLocalStorage();
  } catch (error) {
    console.error(error);
    APP_STATE.trip.route = { start: null, destination: null, geometry: [], distanceKm: 0, durationMinutes: 0, boundingBox: null };
    APP_STATE.trip.legs = [];
    APP_STATE.trip.pois = { hotels: [], tankstellen: [], pausen: [] };
    resetSelectionsForNewRoute();
    clearRouteOverlays();
    calculateBudget();
    updateInfoBanner();
    $('etappenGrid').innerHTML = `<div class="empty-state">${escapeHtml(error.message)}</div>`;
    $('overlayContent').innerHTML = '<div class="empty-state">Route konnte nicht geladen werden.</div>';
    $('footerRouteText').textContent = `Reiseplaner v3.0 | Fehler: ${error.message}`;
  } finally {
    setLoadingState(false);
  }
}

function exportToCSV() {
  const { inputs, route, legs, selectedItems, pois, budget } = APP_STATE.trip;
  const rows = [
    ['Start', inputs.start],
    ['Ziel', inputs.destination],
    ['Datum', inputs.date],
    ['Personen', inputs.persons],
    ['Max km/Tag', inputs.maxKmPerDay],
    ['Gesamtdistanz', route.distanceKm],
    ['Gesamtdauer (min)', route.durationMinutes],
    [],
    ['Etappe', 'Von', 'Nach', 'Kilometer', 'Dauer', 'Maut geschaetzt'],
    ...legs.map((leg, index) => [index + 1, leg.fromLabel, leg.toLabel, leg.km, formatDuration(leg.minutes), leg.tollEstimate]),
    [],
    ['Budget Position', 'Betrag'],
    ['Maut', Math.round(budget.toll)],
    ['Kraftstoff', Math.round(budget.fuel)],
    ['Hotels', Math.round(budget.hotels)],
    ['Extras', Math.round(budget.extras)],
    ['Gesamt', Math.round(budget.total)],
    [],
    ['Ausgewaehlte Stops']
  ];

  selectedItems.hotels.forEach(id => {
    const item = pois.hotels.find(entry => entry.id === id);
    if (item) rows.push(['Hotel', item.name, item.price]);
  });
  selectedItems.tankstellen.forEach(id => {
    const item = pois.tankstellen.find(entry => entry.id === id);
    if (item) rows.push(['Tankstelle', item.name, item.priceLiter.toFixed(2)]);
  });
  selectedItems.pausen.forEach(id => {
    const item = pois.pausen.find(entry => entry.id === id);
    if (item) rows.push(['Pause', item.name, item.duration]);
  });

  const csv = rows.map(row => row.join(';')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'reiseplan_generic.csv';
  link.click();
  URL.revokeObjectURL(link.href);
}

function exportAsJSON() {
  const blob = new Blob([
    JSON.stringify({ exportedAt: new Date().toISOString(), trip: APP_STATE.trip }, null, 2)
  ], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'reiseplan_generic.json';
  link.click();
  URL.revokeObjectURL(link.href);
}

function saveTripToLocalStorage() {
  readInputsIntoState();
  localStorage.setItem('reiseplanerTripV3', JSON.stringify({
    trip: APP_STATE.trip,
    ui: { activeTab: APP_STATE.ui.activeTab }
  }));
}

function restoreSelectedPoiMarkers() {
  Object.entries(APP_STATE.trip.selectedItems).forEach(([type, ids]) => {
    ids.forEach(id => addMarkerForItem(type, id));
  });
}

function loadTripFromLocalStorage() {
  const saved = localStorage.getItem('reiseplanerTripV3');
  if (!saved) return false;

  try {
    const data = JSON.parse(saved);
    if (!data.trip) return false;

    APP_STATE.trip = {
      ...APP_STATE.trip,
      ...data.trip,
      inputs: { ...APP_STATE.trip.inputs, ...data.trip.inputs },
      selectedItems: { hotels: [], tankstellen: [], pausen: [], ...(data.trip.selectedItems || {}) },
      pois: { hotels: [], tankstellen: [], pausen: [], ...(data.trip.pois || {}) }
    };
    APP_STATE.ui.activeTab = data.ui?.activeTab || 'hotels';
    writeStateToInputs();
    document.querySelectorAll('.overlay-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.tab === APP_STATE.ui.activeTab);
    });

    if (APP_STATE.trip.route?.geometry?.length) {
      renderRoute();
      renderEtappen();
      renderOverlayItems(APP_STATE.ui.activeTab);
      restoreSelectedPoiMarkers();
      calculateBudget();
      updateInfoBanner();
      updateFooter();
      return true;
    }
  } catch (error) {
    console.error('Konnte gespeicherte Reise nicht laden', error);
  }

  return false;
}

function bindEventListeners() {
  $('themeToggle').addEventListener('click', darkModeToggle);
  $('calculateBtn').addEventListener('click', rebuildTrip);
  $('exportBtn').addEventListener('click', exportToCSV);
  $('sidebarToggle').addEventListener('click', toggleSidebar);
  $('sidebarClose').addEventListener('click', toggleSidebar);
  $('sidebarOverlay').addEventListener('click', toggleSidebar);
  $('saveRouteBtn').addEventListener('click', () => {
    saveTripToLocalStorage();
    const btn = $('saveRouteBtn');
    btn.innerHTML = '<i class="fas fa-check"></i> Gespeichert!';
    setTimeout(() => {
      btn.innerHTML = '<i class="fas fa-save"></i> Reise speichern';
    }, 2000);
  });
  $('exportJsonBtn').addEventListener('click', exportAsJSON);

  document.querySelectorAll('.overlay-tab').forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
  });

  document.querySelectorAll('.route-opt').forEach(btn => {
    btn.addEventListener('click', () => applyRouteMode(btn.dataset.mode));
  });

  ['fuelPrice', 'fuelConsumption', 'hotelPrice', 'personenInput'].forEach(id => {
    $(id).addEventListener('input', () => {
      calculateBudget();
      saveTripToLocalStorage();
    });
  });

  ['startInput', 'zielInput', 'dateInput', 'maxKmPerDayInput'].forEach(id => {
    $(id).addEventListener('change', saveTripToLocalStorage);
  });
}

function initTheme() {
  const savedTheme = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
  if (savedTheme === 'dark') {
    $('themeToggle').innerHTML = '<i class="fas fa-sun"></i> Light Mode';
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  initTheme();
  initMap();
  bindEventListeners();
  writeStateToInputs();

  const restored = loadTripFromLocalStorage();
  if (!restored) {
    renderEtappen();
    renderOverlayItems(APP_STATE.ui.activeTab);
    calculateBudget();
    updateFooter();
  }
});

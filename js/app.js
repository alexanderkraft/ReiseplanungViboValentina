const DEFAULTS = {
  start: 'Frankfurt am Main',
  destination: "Sant'Agata di Esaro",
  date: '2026-08-13',
  persons: 2,
  maxKmPerDay: 650,
  fuelPriceLiter: 1.65,
  fuelConsumption: 7,
  hotelPerNight: 175,
  tollPer100Km: 9,
  fallbackAvgSpeedKmh: 88
};

const LOCAL_LOCATION_INDEX = [
  { name: 'Berlin', lat: 52.5200, lng: 13.4050, aliases: ['berlin'] },
  { name: 'Hamburg', lat: 53.5511, lng: 9.9937, aliases: ['hamburg'] },
  { name: 'Muenchen', lat: 48.1374, lng: 11.5755, aliases: ['muenchen', 'munich', 'münchen'] },
  { name: 'Frankfurt am Main', lat: 50.1109, lng: 8.6821, aliases: ['frankfurt', 'frankfurt am main'] },
  { name: 'Koeln', lat: 50.9375, lng: 6.9603, aliases: ['koeln', 'köln', 'cologne'] },
  { name: 'Stuttgart', lat: 48.7758, lng: 9.1829, aliases: ['stuttgart'] },
  { name: 'Wien', lat: 48.2082, lng: 16.3738, aliases: ['wien', 'vienna'] },
  { name: 'Salzburg', lat: 47.8095, lng: 13.0550, aliases: ['salzburg'] },
  { name: 'Innsbruck', lat: 47.2692, lng: 11.4041, aliases: ['innsbruck'] },
  { name: 'Zuerich', lat: 47.3769, lng: 8.5417, aliases: ['zuerich', 'zurich', 'zürich'] },
  { name: 'Genf', lat: 46.2044, lng: 6.1432, aliases: ['genf', 'geneva'] },
  { name: 'Mailand', lat: 45.4642, lng: 9.1900, aliases: ['mailand', 'milan', 'milano'] },
  { name: 'Turin', lat: 45.0703, lng: 7.6869, aliases: ['turin', 'torino'] },
  { name: 'Bologna', lat: 44.4949, lng: 11.3426, aliases: ['bologna'] },
  { name: 'Florenz', lat: 43.7696, lng: 11.2558, aliases: ['florenz', 'florence', 'firenze'] },
  { name: 'Rom', lat: 41.9028, lng: 12.4964, aliases: ['rom', 'rome', 'roma'] },
  { name: 'Neapel', lat: 40.8518, lng: 14.2681, aliases: ['neapel', 'naples', 'napoli'] },
  { name: "Sant'Agata di Esaro", lat: 39.8627, lng: 15.9827, aliases: ["sant'agata di esaro", 'santagata di esaro'] },
  { name: 'Paris', lat: 48.8566, lng: 2.3522, aliases: ['paris'] },
  { name: 'Lyon', lat: 45.7640, lng: 4.8357, aliases: ['lyon'] },
  { name: 'Marseille', lat: 43.2965, lng: 5.3698, aliases: ['marseille'] },
  { name: 'Nizza', lat: 43.7102, lng: 7.2620, aliases: ['nizza', 'nice'] },
  { name: 'Barcelona', lat: 41.3874, lng: 2.1686, aliases: ['barcelona'] },
  { name: 'Madrid', lat: 40.4168, lng: -3.7038, aliases: ['madrid'] },
  { name: 'Valencia', lat: 39.4699, lng: -0.3763, aliases: ['valencia'] },
  { name: 'Lissabon', lat: 38.7223, lng: -9.1393, aliases: ['lissabon', 'lisbon'] },
  { name: 'Porto', lat: 41.1579, lng: -8.6291, aliases: ['porto'] },
  { name: 'Amsterdam', lat: 52.3676, lng: 4.9041, aliases: ['amsterdam'] },
  { name: 'Bruessel', lat: 50.8503, lng: 4.3517, aliases: ['bruessel', 'brüssel', 'brussels'] },
  { name: 'Luxemburg', lat: 49.6116, lng: 6.1319, aliases: ['luxemburg', 'luxembourg'] },
  { name: 'Prag', lat: 50.0755, lng: 14.4378, aliases: ['prag', 'prague'] },
  { name: 'Warschau', lat: 52.2297, lng: 21.0122, aliases: ['warschau', 'warsaw'] },
  { name: 'Krakau', lat: 50.0647, lng: 19.9450, aliases: ['krakau', 'krakow'] },
  { name: 'Budapest', lat: 47.4979, lng: 19.0402, aliases: ['budapest'] },
  { name: 'Ljubljana', lat: 46.0569, lng: 14.5058, aliases: ['ljubljana'] },
  { name: 'Zagreb', lat: 45.8150, lng: 15.9819, aliases: ['zagreb'] },
  { name: 'Split', lat: 43.5081, lng: 16.4402, aliases: ['split'] },
  { name: 'Dubrovnik', lat: 42.6507, lng: 18.0944, aliases: ['dubrovnik'] },
  { name: 'Kopenhagen', lat: 55.6761, lng: 12.5683, aliases: ['kopenhagen', 'copenhagen'] }
];

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
      boundingBox: null,
      source: null
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

function normalizeLocationQuery(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9, .'-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseCoordinateQuery(query) {
  const match = String(query).trim().match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
  if (!match) return null;

  const lat = parseFloat(match[1]);
  const lng = parseFloat(match[2]);
  if (Number.isNaN(lat) || Number.isNaN(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return null;
  }

  return {
    name: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
    lat,
    lng,
    source: 'coordinates'
  };
}

function findLocalLocation(query) {
  const normalized = normalizeLocationQuery(query);
  if (!normalized) return null;

  const exactMatch = LOCAL_LOCATION_INDEX.find(entry =>
    entry.aliases.some(alias => alias === normalized)
  );
  if (exactMatch) {
    return { name: exactMatch.name, lat: exactMatch.lat, lng: exactMatch.lng, source: 'local' };
  }

  const partialMatch = LOCAL_LOCATION_INDEX.find(entry =>
    entry.aliases.some(alias => normalized.includes(alias) || alias.includes(normalized))
  );
  if (partialMatch) {
    return { name: partialMatch.name, lat: partialMatch.lat, lng: partialMatch.lng, source: 'local' };
  }

  return null;
}

async function fetchJsonWithTimeout(url, timeoutMs = 6000, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

function buildFallbackRoute(start, destination) {
  const directKm = haversineKm([start.lat, start.lng], [destination.lat, destination.lng]);
  const estimatedDistanceKm = Math.max(1, Math.round(directKm * 1.18));
  const estimatedDurationMinutes = Math.max(20, Math.round((estimatedDistanceKm / DEFAULTS.fallbackAvgSpeedKmh) * 60));
  const pointCount = Math.max(12, Math.min(36, Math.round(estimatedDistanceKm / 35)));
  const geometry = [];

  for (let i = 0; i <= pointCount; i++) {
    const ratio = i / pointCount;
    const curve = Math.sin(Math.PI * ratio) * 0.12;
    geometry.push([
      start.lat + ((destination.lat - start.lat) * ratio) + ((destination.lng - start.lng) * curve * 0.15),
      start.lng + ((destination.lng - start.lng) * ratio) - ((destination.lat - start.lat) * curve * 0.15)
    ]);
  }

  return {
    geometry: { coordinates: geometry.map(([lat, lng]) => [lng, lat]) },
    distance: estimatedDistanceKm * 1000,
    duration: estimatedDurationMinutes * 60,
    source: 'fallback'
  };
}

function setLoadingState(isLoading, message = 'Route wird berechnet ...') {
  APP_STATE.ui.isLoading = isLoading;
  if (isLoading) {
    $('routeSummaryBadge').textContent = 'Live-Berechnung ...';
  } else {
    updateRouteBadge();
  }
  $('calculateBtn').disabled = isLoading;
  $('calculateBtn').innerHTML = isLoading
    ? `<i class="fas fa-spinner fa-spin"></i> ${message}`
    : '<i class="fas fa-calculator"></i> Route berechnen';
}

function readInputsIntoState() {
  APP_STATE.trip.inputs = {
    ...APP_STATE.trip.inputs,
    start: $('startInput').value.trim() || DEFAULTS.start,
    destination: $('zielInput').value.trim() || DEFAULTS.destination,
    date: $('dateInput').value || DEFAULTS.date,
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
  $('startInput').value = inputs.start || DEFAULTS.start;
  $('zielInput').value = inputs.destination || DEFAULTS.destination;
  $('dateInput').value = inputs.date || DEFAULTS.date;
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
  const coordinateMatch = parseCoordinateQuery(query);
  if (coordinateMatch) {
    return coordinateMatch;
  }

  const localMatch = findLocalLocation(query);
  if (localMatch) {
    return localMatch;
  }

  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(query)}`;

  try {
    const response = await fetchJsonWithTimeout(url, 5000, {
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
      lng: parseFloat(result.lon),
      source: 'remote'
    };
  } catch (error) {
    throw new Error(`Ort nicht gefunden oder Geocoding-Dienst nicht erreichbar: ${query}`);
  }
}

async function fetchRoute(start, destination) {
  const url = `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson&steps=false`;

  try {
    const response = await fetchJsonWithTimeout(url, 7000);

    if (!response.ok) {
      throw new Error(`Routing fehlgeschlagen (${response.status})`);
    }

    const data = await response.json();
    if (!data.routes || !data.routes.length) {
      throw new Error('Keine Route gefunden');
    }

    return { ...data.routes[0], source: 'osrm' };
  } catch (error) {
    return buildFallbackRoute(start, destination);
  }
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

    const fromLabel = isFirst ? inputs.start : `Etappenstopp ${i}`;
    const toLabel = isLast ? inputs.destination : `Etappenstopp ${i + 1}`;
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

function generateDynamicPois(legs) {
  const hotels = [];
  const tankstellen = [];
  const pausen = [];

  legs.forEach((leg, index) => {
    if (index < legs.length - 1) {
      hotels.push({
        id: `hotel-${index + 1}`,
        name: `Hotel-Vorschlag Etappe ${index + 1}`,
        price: 95 + (index * 20),
        rating: (4.0 + (index * 0.2)).toFixed(1),
        lat: leg.toCoord[0] + 0.03,
        lng: leg.toCoord[1] + 0.03,
        etappe: index,
        info: `${leg.toLabel} - kurzer Umweg fuer Uebernachtung`
      });
    }

    tankstellen.push({
      id: `tank-${index + 1}`,
      name: `Tankstopp Etappe ${index + 1}`,
      priceLiter: Math.max(1.55, 1.89 - (index * 0.04)),
      lat: leg.midpoint[0] + 0.02,
      lng: leg.midpoint[1] - 0.015,
      etappe: index,
      info: `${leg.fromLabel} - ${leg.toLabel}`
    });

    pausen.push({
      id: `pause-${index + 1}`,
      name: `Pause Etappe ${index + 1}`,
      duration: 20 + (index * 15),
      lat: leg.midpoint[0] - 0.018,
      lng: leg.midpoint[1] + 0.02,
      etappe: index,
      description: `Empfohlene Pause nach etwa ${Math.round(leg.km / 2)} km`
    });
  });

  return { hotels, tankstellen, pausen };
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
    container.innerHTML = '<div class="empty-state">Keine Vorschlaege fuer diese Route vorhanden.</div>';
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

function updateRouteBadge() {
  if (!APP_STATE.trip.route.distanceKm) {
    $('routeSummaryBadge').textContent = 'Bereit';
    return;
  }

  $('routeSummaryBadge').textContent = APP_STATE.trip.route.source === 'fallback'
    ? 'Fallback-Route'
    : 'Live-Route';
}

function updateFooter() {
  const { inputs, route, legs } = APP_STATE.trip;
  if (!route.distanceKm) {
    $('footerRouteText').textContent = 'Reiseplaner v3.0 | Bereit fuer beliebige Autoreisen';
    updateRouteBadge();
    return;
  }

  const sourceLabel = route.source === 'fallback' ? 'geschaetzte Fallback-Route' : 'Live-Route';
  $('footerRouteText').textContent = `Reiseplaner v3.0 | ${inputs.start} → ${inputs.destination} | ${formatDistance(route.distanceKm)} | ${formatDuration(route.durationMinutes)} | ${legs.length} Etappe(n) | ${sourceLabel}`;
  updateRouteBadge();
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
    APP_STATE.trip.pois = generateDynamicPois(APP_STATE.trip.legs);
    resetSelectionsForNewRoute();
    clearRouteOverlays();
    renderRoute();
    renderEtappen();
    renderOverlayItems(APP_STATE.ui.activeTab);
    calculateBudget();
    updateInfoBanner();
    updateFooter();
    saveTripToLocalStorage();
  }
}

async function rebuildTrip() {
  readInputsIntoState();
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
      boundingBox: computeBoundingBox(geometry),
      source: routeData.source || 'osrm'
    };

    APP_STATE.trip.legs = buildLegsFromGeometry(geometry, distanceKm, durationMinutes, APP_STATE.trip.inputs);
    APP_STATE.trip.pois = generateDynamicPois(APP_STATE.trip.legs);
    resetSelectionsForNewRoute();

    renderRoute();
    renderEtappen();
    renderOverlayItems(APP_STATE.ui.activeTab);
    calculateBudget();
    updateInfoBanner();
    updateFooter();
    APP_STATE.ui.lastRouteBuiltAt = new Date().toISOString();
    saveTripToLocalStorage();
  } catch (error) {
    console.error(error);
    APP_STATE.trip.route = { start: null, destination: null, geometry: [], distanceKm: 0, durationMinutes: 0, boundingBox: null, source: null };
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
    await rebuildTrip();
  }
});

import { DEFAULTS, STORAGE_KEYS } from './core/constants.js';
import { createInitialState } from './core/state.js';
import { loadState, saveState } from './core/storage.js';
import { byId } from './core/utils/dom.js';
import { escapeHtml, formatCurrency, formatDistance, formatDuration } from './core/utils/format.js';
import { haversineKm, interpolatePoint } from './core/utils/geo.js';
import { hasRequiredRouteInputs } from './core/utils/validate.js';
import { summarizeSelectedItems } from './features/selected-trip/selected-trip-controller.js';
import { buildBudgetSnapshot } from './features/budget/budget-controller.js';
import { buildCsvRows, downloadTextFile } from './features/exports/export-controller.js';
import { readTripInputsFromForm, writeTripInputsToForm } from './features/trip-input/trip-input-controller.js';
import { getRouteSelectorLabel } from './features/route-planner/route-controller.js';
import { normalizeHotelPlace } from './domains/hotel/hotel-adapter.js';
import { normalizePoiPlace } from './domains/poi/poi-adapter.js';
import { normalizeTankstellePlace } from './domains/tankstelle/tankstelle-adapter.js';
import { geocodeLocation, reverseGeocodeLocation } from './services/geocoding/nominatim-service.js';
import { fetchGeoapifyPois, getGeoapifyApiKey } from './services/poi/geoapify-service.js';
import { fetchOsrmRoutes } from './services/routing/osrm-service.js';
import { calculateTollEstimate } from './services/toll/toll-service.js';
import { enrichHotelWithPricing } from './services/hotel/xotelo-service.js';

const APP_STATE = createInitialState();

function versionTag() {
  const v = window.APP_VERSION;
  if (!v) return 'dev';
  return `${v.branch}@${v.commit}`;
}

let map;

const $ = byId;

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
    ...readTripInputsFromForm($),
    routeMode: APP_STATE.trip.inputs.routeMode || 'balanced',
    fixedLegCount: APP_STATE.trip.inputs.fixedLegCount || 0
  };
}

function writeStateToInputs() {
  const { inputs } = APP_STATE.trip;
  writeTripInputsToForm($, inputs);
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


function computeBoundingBox(coords) {
  const bounds = L.latLngBounds(coords.map(coord => [coord[0], coord[1]]));
  return bounds;
}

function buildLegsFromGeometry(geometry, totalDistanceKm, totalDurationMinutes, inputs) {
  if (geometry.length < 2) {
    return [];
  }

  const segmentDistances = [];
  let accumulated = 0;

  for (let i = 0; i < geometry.length - 1; i++) {
    const segmentKm = haversineKm(geometry[i], geometry[i + 1]);
    segmentDistances.push(segmentKm);
    accumulated += segmentKm;
  }

  const totalKmApprox = accumulated || totalDistanceKm;
  const stopPoints = [geometry[0]];

  const fixedLegs = inputs.fixedLegCount || 0;

  if (fixedLegs > 0) {
    const segmentTarget = totalKmApprox / fixedLegs;
    let runningKm = 0;
    let nextBreakAt = segmentTarget;
    for (let i = 0; i < segmentDistances.length; i++) {
      const start = geometry[i];
      const end = geometry[i + 1];
      const segmentKm = segmentDistances[i];
      while (runningKm + segmentKm >= nextBreakAt && stopPoints.length < fixedLegs) {
        const remainingToBreak = nextBreakAt - runningKm;
        const ratio = segmentKm === 0 ? 0 : remainingToBreak / segmentKm;
        stopPoints.push(interpolatePoint(start, end, Math.min(1, Math.max(0, ratio))));
        nextBreakAt += segmentTarget;
      }
      runningKm += segmentKm;
    }
  } else {
    const targetKm = inputs.routeMode === 'short-day'
      ? Math.max(150, inputs.maxKmPerDay - 100)
      : inputs.maxKmPerDay;

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
      tollEstimate: calculateTollEstimate(km, DEFAULTS.tollPer100Km)
    });
  }

  return legs;
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

  const inputs = APP_STATE.trip.inputs;
  const travelDate = inputs.date || '';
  const persons = Math.max(1, Number(inputs.persons || 1));

  const promises = legs.map(async (leg, index) => {
    const legHotels = [];
    const legTanks = [];
    const legPausen = [];

    const hotelFetch = (index < legs.length - 1)
      ? fetchGeoapifyPois({ lat: leg.toCoord[0], lng: leg.toCoord[1], category: 'accommodation.hotel', limit: 5, radiusM: 10000 })
      : Promise.resolve([]);

    const tankFetch = fetchGeoapifyPois({ lat: leg.midpoint[0], lng: leg.midpoint[1], category: 'service.vehicle.fuel', limit: 5, radiusM: 15000 });
    const pauseFetch = fetchGeoapifyPois({ lat: leg.midpoint[0], lng: leg.midpoint[1], category: 'catering.restaurant', limit: 5, radiusM: 10000 });

    const [hotelResults, tankResults, pauseResults] = await Promise.all([hotelFetch, tankFetch, pauseFetch]);

    hotelResults.forEach((p, i) => {
      legHotels.push(normalizeHotelPlace(p, {
        id: `hotel-${index + 1}-${i + 1}`,
        index: i + 1,
        etappe: index
      }));
    });

    if (travelDate && legHotels.length > 0) {
      const checkIn = computeCheckInDate(travelDate, index);
      const checkOut = computeCheckOutDate(checkIn);
      await Promise.all(legHotels.map(async (hotel) => {
        await enrichHotelWithPricing(hotel, checkIn, checkOut);
        if (hotel.pricePerNight > 0) {
          hotel.price = hotel.pricePerNight;
        }
      }));
    }

    tankResults.forEach((p, i) => {
      legTanks.push(normalizeTankstellePlace(p, {
        id: `tank-${index + 1}-${i + 1}`,
        index: i + 1,
        etappe: index
      }));
    });

    pauseResults.forEach((p, i) => {
      legPausen.push(normalizePoiPlace(p, 'restaurant', {
        id: `pause-${index + 1}-${i + 1}`,
        index: i + 1,
        etappe: index
      }));
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

function computeCheckInDate(travelDate, legIndex) {
  const d = new Date(travelDate);
  d.setDate(d.getDate() + legIndex);
  return d.toISOString().slice(0, 10);
}

function computeCheckOutDate(checkIn) {
  const d = new Date(checkIn);
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

async function reverseGeocode(lat, lng) {
  try {
    return await reverseGeocodeLocation(lat, lng);
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
        const ratingStr = item.rating !== '-' ? `${item.rating} &#9733;` : '';
        if (item.pricePerNight > 0) {
          priceText = `<span class="hotel-price-value">&euro;${item.pricePerNight}/N</span>`;
          if (ratingStr) priceText += `<br>${ratingStr}`;
          priceText += `<br><span class="hotel-price-source">via ${escapeHtml(item.priceSource)}</span>`;
        } else {
          priceText = ratingStr || '';
        }
        infoText = item.info;
      } else if (type === 'tankstellen') {
        priceText = '';
        infoText = item.info;
      } else {
        priceText = '';
        infoText = item.description;
      }

      const mapsLink = `https://www.google.com/maps/search/?api=1&query=${item.lat},${item.lng}`;
      let extraLinks = `<a href="${mapsLink}" target="_blank" rel="noopener" class="poi-link" onclick="event.stopPropagation()"><i class="fas fa-map-marker-alt"></i> Maps</a>`;
      if (type === 'hotels' && item.website) {
        extraLinks += ` <a href="${escapeHtml(item.website)}" target="_blank" rel="noopener" class="poi-link" onclick="event.stopPropagation()"><i class="fas fa-globe"></i> Web</a>`;
      }

      html += `
        <div class="overlay-item ${isSelected ? 'selected' : ''}" data-type="${type}" data-id="${item.id}">
          <div class="overlay-item-left">
            <div class="overlay-item-name">${isSelected ? '&#10003; ' : ''}${escapeHtml(item.name)}</div>
            <div class="overlay-item-info">${escapeHtml(infoText)}</div>
            <div class="overlay-item-links">${extraLinks}</div>
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
    hotels: { emoji: '🏨', popup: `<b>🏨 ${escapeHtml(item.name)}</b><br>${item.rating !== '-' ? item.rating + ' &#9733;' : ''}${item.pricePerNight > 0 ? '<br>💰 €' + item.pricePerNight + '/Nacht (via ' + escapeHtml(item.priceSource) + ')' : ''}<br>${escapeHtml(item.info)}${item.website ? '<br><a href="' + escapeHtml(item.website) + '" target="_blank">Website</a>' : ''}` },
    tankstellen: { emoji: '⛽', popup: `<b>⛽ ${escapeHtml(item.name)}</b><br>${escapeHtml(item.info)}` },
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
  const snapshot = buildBudgetSnapshot(APP_STATE.trip);
  APP_STATE.trip.budget = {
    toll: snapshot.toll,
    fuel: snapshot.fuel,
    hotels: snapshot.hotels,
    extras: snapshot.extras,
    total: snapshot.total,
    perPerson: snapshot.perPerson
  };

  $('budgetDistance').textContent = APP_STATE.trip.route.distanceKm ? formatDistance(APP_STATE.trip.route.distanceKm) : '-';
  $('budgetMaut').textContent = formatCurrency(snapshot.toll);
  $('budgetBenzin').textContent = formatCurrency(snapshot.fuel);
  $('budgetHotels').textContent = formatCurrency(snapshot.hotels);
  $('budgetTotal').textContent = formatCurrency(snapshot.total);
  $('budgetPerPerson').textContent = `${formatCurrency(snapshot.perPerson)} pro Person`;
  $('hotelNightCount').textContent = String(snapshot.hotelNights);

  let extrasHtml = '';
  if (snapshot.extraHotels > 0) {
    extrasHtml += `<div class="budget-item extra"><span>🏨 Zusatz-Hotels</span><span>+${formatCurrency(snapshot.extraHotels)}</span></div>`;
  }
  if (snapshot.extraPausen > 0) {
    extrasHtml += `<div class="budget-item extra"><span>☕ Pausen / Eintritte</span><span>+${formatCurrency(snapshot.extraPausen)}</span></div>`;
  }
  $('budgetExtras').innerHTML = extrasHtml;
}

function updateInfoBanner() {
  const selected = summarizeSelectedItems(APP_STATE.trip.selectedItems);
  const banner = $('infoBanner');

  if (!selected.total) {
    banner.style.display = 'none';
    return;
  }

  const parts = [];
  if (selected.hotels) parts.push(`${selected.hotels} Hotel(s)`);
  if (selected.tankstellen) parts.push(`${selected.tankstellen} Tankstelle(n)`);
  if (selected.pausen) parts.push(`${selected.pausen} Pause(n)`);

  banner.style.display = 'flex';
  $('bannerText').innerHTML = `<i class="fas fa-check-circle"></i> ${selected.total} Stops ausgewaehlt: ${parts.join(', ')} | Gesamt ${formatCurrency(APP_STATE.trip.budget.total)}`;
}

function updateFooter() {
  const { inputs, route, legs } = APP_STATE.trip;
  if (!route.distanceKm) {
    $('footerRouteText').textContent = `Reiseplaner v3.0 (${versionTag()}) | Bereit fuer beliebige Autoreisen`;
    return;
  }

  $('footerRouteText').textContent = `Reiseplaner v3.0 (${versionTag()}) | ${inputs.start} → ${inputs.destination} | ${formatDistance(route.distanceKm)} | ${formatDuration(route.durationMinutes)} | ${legs.length} Etappe(n)`;
}

function darkModeToggle() {
  const root = document.documentElement;
  const isDark = root.getAttribute('data-theme') === 'dark';
  root.setAttribute('data-theme', isDark ? 'light' : 'dark');
  $('themeToggle').innerHTML = isDark
    ? '<i class="fas fa-moon"></i> Dark Mode'
    : '<i class="fas fa-sun"></i> Light Mode';
  saveState(STORAGE_KEYS.theme, isDark ? 'light' : 'dark');
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

function rebuildLegsFromControls() {
  if (!APP_STATE.trip.route.geometry.length) return;
  readInputsIntoState();
  const sel = $('etappenCountSelect').value;
  const kmInput = $('etappenKmInput');

  if (sel === 'auto') {
    APP_STATE.trip.inputs.fixedLegCount = 0;
    APP_STATE.trip.inputs.maxKmPerDay = Math.max(150, parseInt(kmInput.value, 10) || 650);
    $('maxKmPerDayInput').value = APP_STATE.trip.inputs.maxKmPerDay;
  } else {
    APP_STATE.trip.inputs.fixedLegCount = parseInt(sel, 10);
    const approxKm = Math.round(APP_STATE.trip.route.distanceKm / APP_STATE.trip.inputs.fixedLegCount);
    kmInput.value = approxKm;
    APP_STATE.trip.inputs.maxKmPerDay = approxKm;
    $('maxKmPerDayInput').value = approxKm;
  }

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

  resolveStopNames(APP_STATE.trip.legs).then(() => {
    renderEtappen();
    renderRoute();
  });

  fetchRealPois(APP_STATE.trip.legs).then(pois => {
    APP_STATE.trip.pois = pois;
    renderOverlayItems(APP_STATE.ui.activeTab);
    saveTripToLocalStorage();
  });
}

function showEtappenControls() {
  const controls = $('etappenControls');
  if (controls) {
    controls.style.display = 'flex';
    $('etappenKmInput').value = APP_STATE.trip.inputs.maxKmPerDay;
    const legCount = APP_STATE.trip.inputs.fixedLegCount;
    $('etappenCountSelect').value = legCount > 0 ? String(legCount) : 'auto';
  }
}

function renderRouteSelector() {
  let container = $('routeSelector');
  if (!container) {
    container = document.createElement('div');
    container.id = 'routeSelector';
    container.className = 'route-selector';
    $('etappenGrid').parentElement.insertBefore(container, $('etappenGrid'));
  }

  const routes = APP_STATE.trip.routes;
  if (routes.length <= 1) {
    container.style.display = 'none';
    return;
  }

  container.style.display = 'flex';
  container.innerHTML = routes.map((r, i) => {
    const active = i === APP_STATE.trip.selectedRouteIndex ? 'active' : '';
    return `<button class="route-selector-btn ${active}" data-route-idx="${i}">
      <strong>${getRouteSelectorLabel(i)}</strong>
      <span>${r.distanceKm} km | ${formatDuration(r.durationMinutes)}</span>
    </button>`;
  }).join('');

  container.querySelectorAll('.route-selector-btn').forEach(btn => {
    btn.addEventListener('click', () => selectRoute(parseInt(btn.dataset.routeIdx, 10)));
  });
}

async function selectRoute(index) {
  APP_STATE.trip.selectedRouteIndex = index;
  const chosen = APP_STATE.trip.routes[index];
  if (!chosen) return;

  APP_STATE.trip.route = {
    ...APP_STATE.trip.route,
    geometry: chosen.geometry,
    distanceKm: chosen.distanceKm,
    durationMinutes: chosen.durationMinutes,
    boundingBox: computeBoundingBox(chosen.geometry)
  };

  APP_STATE.trip.legs = buildLegsFromGeometry(chosen.geometry, chosen.distanceKm, chosen.durationMinutes, APP_STATE.trip.inputs);
  resetSelectionsForNewRoute();
  renderRouteSelector();
  showEtappenControls();
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
}

async function rebuildTrip() {
  readInputsIntoState();
  if (!hasRequiredRouteInputs(APP_STATE.trip.inputs)) {
    $('etappenGrid').innerHTML = '<div class="empty-state">Bitte Start und Ziel eingeben.</div>';
    return;
  }
  setLoadingState(true);

  try {
    const startGeo = await geocodeLocation(APP_STATE.trip.inputs.start);
    const destinationGeo = await geocodeLocation(APP_STATE.trip.inputs.destination);
    const allRoutes = await fetchOsrmRoutes({ start: startGeo, destination: destinationGeo });

    APP_STATE.trip.routes = allRoutes;
    APP_STATE.trip.route.start = startGeo;
    APP_STATE.trip.route.destination = destinationGeo;

    renderRouteSelector();
    await selectRoute(0);
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
    $('footerRouteText').textContent = `Reiseplaner v3.0 (${versionTag()}) | Fehler: ${error.message}`;
  } finally {
    setLoadingState(false);
  }
}

function exportToCSV() {
  const rows = buildCsvRows(APP_STATE.trip);
  const csv = rows.map(row => row.join(';')).join('\n');
  downloadTextFile({
    content: '\uFEFF' + csv,
    filename: 'reiseplan_generic.csv',
    mimeType: 'text/csv;charset=utf-8;'
  });
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
  saveState(STORAGE_KEYS.trip, {
    trip: APP_STATE.trip,
    ui: { activeTab: APP_STATE.ui.activeTab }
  });
}

function restoreSelectedPoiMarkers() {
  Object.entries(APP_STATE.trip.selectedItems).forEach(([type, ids]) => {
    ids.forEach(id => addMarkerForItem(type, id));
  });
}

function loadTripFromLocalStorage() {
  try {
    const data = loadState(STORAGE_KEYS.trip);
    if (!data) return false;
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

  ['startInput', 'zielInput', 'dateInput'].forEach(id => {
    $(id).addEventListener('change', saveTripToLocalStorage);
  });

  $('maxKmPerDayInput').addEventListener('change', () => {
    $('etappenKmInput').value = $('maxKmPerDayInput').value;
    $('etappenCountSelect').value = 'auto';
    APP_STATE.trip.inputs.fixedLegCount = 0;
    rebuildLegsFromControls();
  });

  $('etappenCountSelect').addEventListener('change', rebuildLegsFromControls);
  $('etappenKmInput').addEventListener('change', () => {
    $('etappenCountSelect').value = 'auto';
    APP_STATE.trip.inputs.fixedLegCount = 0;
    rebuildLegsFromControls();
  });
}

function initTheme() {
  const savedTheme = loadState(STORAGE_KEYS.theme) || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
  if (savedTheme === 'dark') {
    $('themeToggle').innerHTML = '<i class="fas fa-sun"></i> Light Mode';
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  try {
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
  } catch (error) {
    console.error('Initialisierung fehlgeschlagen:', error);
    const mapEl = document.getElementById('map');
    if (mapEl && !mapEl.querySelector('.leaflet-container')) {
      mapEl.innerHTML = '<p style="padding:2rem;color:#e44">Fehler beim Laden. Bitte Seite neu laden oder localStorage leeren.</p>';
    }
  }
});

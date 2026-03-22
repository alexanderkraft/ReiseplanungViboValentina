// ===== ROUTE DATA =====
const ROUTE = [
  { name: 'Frankfurt', lat: 50.1109, lng: 8.6821, icon: '🏁' },
  { name: 'Innsbruck', lat: 47.2692, lng: 11.4041, icon: '🏔' },
  { name: 'Bologna', lat: 44.4949, lng: 11.3426, icon: '🍝' },
  { name: "Sant'Agata di Esaro", lat: 39.035, lng: 16.345, icon: '🏖' }
];

const ETAPPEN = [
  { from: 'Frankfurt', to: 'Innsbruck', km: 525, hours: 6, description: 'Durch Sueddeutschland ueber die A7/A8 nach Tirol', maut: 30 },
  { from: 'Innsbruck', to: 'Bologna', km: 650, hours: 7, description: 'Ueber den Brennerpass durch Suedtirol nach Emilia-Romagna', maut: 80 },
  { from: 'Bologna', to: "Sant'Agata di Esaro", km: 775, hours: 8, description: 'Die Adriakueste entlang bis nach Kalabrien', maut: 70 }
];

const BUDGET_DEFAULTS = {
  fuelPriceLiter: 1.65,
  fuelConsumption: 7,
  hotelPerNight: 175,
  nights: 2,
  persons: 2
};

// ===== INTERACTIVE STOP DATA =====
const HOTELS = [
  { name: 'Pension Rose', price: 70, lat: 47.2620, lng: 11.3950, etappe: 0, rating: '3.8' },
  { name: 'Hotel Brenner', price: 95, lat: 47.2710, lng: 11.4100, etappe: 0, rating: '4.2' },
  { name: 'Luxury Alpine Inn', price: 150, lat: 47.2750, lng: 11.3900, etappe: 0, rating: '4.7' },
  { name: 'Albergo Centro', price: 65, lat: 44.4980, lng: 11.3400, etappe: 1, rating: '3.5' },
  { name: 'Hotel Bologna Star', price: 110, lat: 44.4920, lng: 11.3500, etappe: 1, rating: '4.3' },
  { name: 'Grand Hotel Majestic', price: 180, lat: 44.4900, lng: 11.3380, etappe: 1, rating: '4.8' }
];

const TANKSTELLEN = [
  { name: 'Aral Frankfurt-Sued', priceLiter: 1.89, lat: 50.0900, lng: 8.6700, etappe: 0 },
  { name: 'Shell Muenchen', priceLiter: 1.82, lat: 48.1351, lng: 11.5820, etappe: 0 },
  { name: 'OMV Innsbruck', priceLiter: 1.74, lat: 47.2600, lng: 11.4200, etappe: 0 },
  { name: 'Agip Brennero', priceLiter: 1.79, lat: 46.9900, lng: 11.5100, etappe: 1 },
  { name: 'ENI Verona', priceLiter: 1.76, lat: 45.4384, lng: 10.9916, etappe: 1 },
  { name: 'IP Bologna Nord', priceLiter: 1.72, lat: 44.5200, lng: 11.3500, etappe: 1 },
  { name: 'Esso Firenze', priceLiter: 1.81, lat: 43.7696, lng: 11.2558, etappe: 2 },
  { name: 'TotalEnergies Napoli', priceLiter: 1.69, lat: 40.8518, lng: 14.2681, etappe: 2 }
];

const PAUSEN = [
  { name: 'Brennerpass Aussicht', duration: 15, lat: 47.0000, lng: 11.5100, etappe: 1, description: 'Panoramablick auf die Alpen' },
  { name: 'Verona Arena', duration: 120, lat: 45.4390, lng: 10.9945, etappe: 1, description: 'Roemisches Amphitheater besichtigen' },
  { name: 'Raststatte Gardasee', duration: 30, lat: 45.6500, lng: 10.6300, etappe: 1, description: 'Kaffeepause mit Seeblick' },
  { name: 'Firenze Piazzale', duration: 90, lat: 43.7630, lng: 11.2650, etappe: 2, description: 'Blick ueber Florenz' },
  { name: 'Autogrill Salerno', duration: 20, lat: 40.6824, lng: 14.7681, etappe: 2, description: 'Schnelle Pause an der Autobahn' },
  { name: 'Spiaggia Maratea', duration: 60, lat: 39.9900, lng: 15.7200, etappe: 2, description: 'Strand-Stopp an der Kueste' }
];

const ROUTE_COLORS = ['#3b82f6', '#10b981', '#f59e0b'];

// ===== GLOBALS =====
let map;
let markers = [];
let directionsService, directionsRenderer;
let hotelMarkers = [], tankMarkers = [], pauseMarkers = [];
let trafficLayer = null;
let trafficEnabled = false;
let activeTab = 'hotels';
let openInfoWindow = null;

let selectedItems = {
  hotels: [],
  tankstellen: [],
  pausen: []
};

// ===== MAP INITIALIZATION (Google Maps callback) =====
function initMap() {
  map = new google.maps.Map(document.getElementById('map'), {
    center: { lat: 45.5, lng: 12.0 },
    zoom: 6,
    mapTypeControl: true,
    streetViewControl: false,
    fullscreenControl: true
  });

  // Route waypoint markers
  ROUTE.forEach((point) => {
    const marker = new google.maps.Marker({
      position: { lat: point.lat, lng: point.lng },
      map,
      title: `${point.icon} ${point.name}`,
      icon: createRouteIcon(point.icon)
    });
    const iw = new google.maps.InfoWindow({
      content: `<b style="font-size:1rem">${point.icon} ${point.name}</b>`
    });
    marker.addListener('click', () => openIW(iw, marker));
    marker._infoWindow = iw;
    markers.push(marker);
  });

  initRouting();

  // Theme
  const savedTheme = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
  const themeBtn = document.getElementById('themeToggle');
  if (savedTheme === 'dark') {
    themeBtn.innerHTML = '<i class="fas fa-sun"></i> Light Mode';
  }

  renderEtappen();
  calculateBudget();
  loadFromLocalStorage();

  // Event listeners
  document.getElementById('themeToggle').addEventListener('click', darkModeToggle);
  document.getElementById('trafficToggle').addEventListener('click', toggleTrafficLayer);
  document.getElementById('calculateBtn').addEventListener('click', calculateBudget);
  document.getElementById('exportBtn').addEventListener('click', exportToCSV);
  document.getElementById('sidebarToggle').addEventListener('click', toggleSidebar);
  document.getElementById('sidebarClose').addEventListener('click', toggleSidebar);
  document.getElementById('sidebarOverlay').addEventListener('click', toggleSidebar);
  document.getElementById('saveRouteBtn').addEventListener('click', () => {
    saveToLocalStorage();
    const btn = document.getElementById('saveRouteBtn');
    btn.innerHTML = '<i class="fas fa-check"></i> Gespeichert!';
    setTimeout(() => { btn.innerHTML = '<i class="fas fa-save"></i> Route speichern'; }, 2000);
  });
  document.getElementById('exportJsonBtn').addEventListener('click', exportAsJSON);

  document.querySelectorAll('.overlay-tab').forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
  });

  ['fuelPrice', 'fuelConsumption', 'hotelPrice', 'personenInput'].forEach(id => {
    document.getElementById(id).addEventListener('input', calculateBudget);
  });
}

function openIW(iw, marker) {
  if (openInfoWindow) openInfoWindow.close();
  iw.open(map, marker);
  openInfoWindow = iw;
}

// ===== ROUTING =====
function initRouting() {
  directionsService = new google.maps.DirectionsService();
  directionsRenderer = new google.maps.DirectionsRenderer({
    map,
    suppressMarkers: true,
    polylineOptions: {
      strokeColor: '#3b82f6',
      strokeWeight: 5,
      strokeOpacity: 0.8
    }
  });

  const waypoints = ROUTE.slice(1, -1).map(p => ({
    location: new google.maps.LatLng(p.lat, p.lng),
    stopover: true
  }));

  directionsService.route({
    origin: new google.maps.LatLng(ROUTE[0].lat, ROUTE[0].lng),
    destination: new google.maps.LatLng(ROUTE[ROUTE.length - 1].lat, ROUTE[ROUTE.length - 1].lng),
    waypoints,
    travelMode: google.maps.TravelMode.DRIVING
  }, (result, status) => {
    if (status === 'OK') {
      directionsRenderer.setDirections(result);
      const legs = result.routes[0].legs;
      const totalDist = legs.reduce((s, l) => s + l.distance.value, 0);
      const totalDur = legs.reduce((s, l) => s + l.duration.value, 0);
      const km = Math.round(totalDist / 1000);
      const h = Math.floor(totalDur / 3600);
      const m = Math.floor((totalDur % 3600) / 60);
      document.querySelector('footer p').textContent =
        `Reiseplaner v3.0 | ${km} km | ${h}h ${m}min | Google Maps Route`;
    } else {
      drawFallbackPolylines();
    }
  });
}

function drawFallbackPolylines() {
  for (let i = 0; i < ROUTE.length - 1; i++) {
    new google.maps.Polyline({
      path: [
        { lat: ROUTE[i].lat, lng: ROUTE[i].lng },
        { lat: ROUTE[i + 1].lat, lng: ROUTE[i + 1].lng }
      ],
      strokeColor: ROUTE_COLORS[i],
      strokeWeight: 4,
      strokeOpacity: 0.8,
      map
    });
  }
  const bounds = new google.maps.LatLngBounds();
  ROUTE.forEach(p => bounds.extend({ lat: p.lat, lng: p.lng }));
  map.fitBounds(bounds);
}

// ===== CUSTOM MARKER ICONS =====
function makeSvgIcon(emoji, bgColor) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="34" height="34" viewBox="0 0 34 34">
    <circle cx="17" cy="17" r="15" fill="${bgColor}" stroke="white" stroke-width="2"/>
    <text x="17" y="22" text-anchor="middle" font-size="14">${emoji}</text>
  </svg>`;
  return {
    url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg),
    scaledSize: new google.maps.Size(34, 34),
    anchor: new google.maps.Point(17, 17)
  };
}

function createRouteIcon(emoji) {
  return makeSvgIcon(emoji, '#3b82f6');
}

function createIcon(type) {
  const configs = {
    hotels:      { color: '#10b981', emoji: '🏨' },
    tankstellen: { color: '#f59e0b', emoji: '⛽' },
    pausen:      { color: '#8b5cf6', emoji: '☕' }
  };
  const cfg = configs[type];
  return makeSvgIcon(cfg.emoji, cfg.color);
}

// ===== TRAFFIC LAYER =====
function toggleTrafficLayer() {
  trafficEnabled = !trafficEnabled;
  const btn = document.getElementById('trafficToggle');

  if (trafficEnabled) {
    trafficLayer = new google.maps.TrafficLayer();
    trafficLayer.setMap(map);
    btn.innerHTML = '<i class="fas fa-traffic-light"></i> Traffic AN';
    btn.classList.add('active');
  } else {
    if (trafficLayer) {
      trafficLayer.setMap(null);
      trafficLayer = null;
    }
    btn.innerHTML = '<i class="fas fa-traffic-light"></i> Traffic';
    btn.classList.remove('active');
  }
}

// ===== SIDEBAR =====
function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  const isActive = sidebar.classList.contains('active');
  sidebar.classList.toggle('active');
  overlay.classList.toggle('active');
  if (!isActive) {
    renderOverlayItems(activeTab);
  }
}

function switchTab(type) {
  activeTab = type;
  document.querySelectorAll('.overlay-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.tab === type);
  });
  renderOverlayItems(type);
}

function renderOverlayItems(type) {
  const container = document.getElementById('overlayContent');
  let data, emoji;

  switch (type) {
    case 'hotels':      data = HOTELS;      emoji = '🏨'; break;
    case 'tankstellen': data = TANKSTELLEN; emoji = '⛽'; break;
    case 'pausen':      data = PAUSEN;      emoji = '☕'; break;
  }

  const grouped = {};
  data.forEach((item, idx) => {
    if (!grouped[item.etappe]) grouped[item.etappe] = [];
    grouped[item.etappe].push({ ...item, originalIndex: idx });
  });

  let html = '';
  Object.keys(grouped).sort().forEach(etappeIdx => {
    const etappe = ETAPPEN[etappeIdx];
    html += `<div class="overlay-etappe-label">${emoji} Etappe ${parseInt(etappeIdx) + 1}: ${etappe.from} - ${etappe.to}</div>`;

    grouped[etappeIdx].forEach(item => {
      const isSelected = selectedItems[type].includes(item.originalIndex);
      let priceText, infoText;

      switch (type) {
        case 'hotels':
          priceText = `EUR ${item.price}`;
          infoText = `Bewertung: ${item.rating}/5`;
          break;
        case 'tankstellen':
          priceText = `EUR ${item.priceLiter.toFixed(2)}/L`;
          infoText = `Etappe ${parseInt(etappeIdx) + 1}`;
          break;
        case 'pausen':
          priceText = `${item.duration} min`;
          infoText = item.description;
          break;
      }

      html += `
        <div class="overlay-item ${isSelected ? 'selected' : ''}" onclick="toggleSelection('${type}', ${item.originalIndex})">
          <div class="overlay-item-left">
            <div class="overlay-item-name">${isSelected ? '&#10003; ' : ''}${item.name}</div>
            <div class="overlay-item-info">${infoText}</div>
          </div>
          <div class="overlay-item-price">${priceText}</div>
        </div>
      `;
    });
  });

  container.innerHTML = html;
}

// ===== SELECTION LOGIC =====
function toggleSelection(type, index) {
  const arr = selectedItems[type];
  const pos = arr.indexOf(index);

  if (pos > -1) {
    arr.splice(pos, 1);
    removeMarkerForItem(type, index);
  } else {
    arr.push(index);
    addMarkerForItem(type, index);
  }

  renderOverlayItems(activeTab);
  calculateBudget();
  updateInfoBanner();
  saveToLocalStorage();
}

function addMarkerForItem(type, index) {
  let item, markerArr, popupContent;

  switch (type) {
    case 'hotels':
      item = HOTELS[index];
      markerArr = hotelMarkers;
      popupContent = `<b>🏨 ${item.name}</b><br>EUR ${item.price}/Nacht<br>Bewertung: ${item.rating}/5`;
      break;
    case 'tankstellen':
      item = TANKSTELLEN[index];
      markerArr = tankMarkers;
      popupContent = `<b>⛽ ${item.name}</b><br>EUR ${item.priceLiter.toFixed(2)}/Liter`;
      break;
    case 'pausen':
      item = PAUSEN[index];
      markerArr = pauseMarkers;
      popupContent = `<b>☕ ${item.name}</b><br>${item.duration} min<br>${item.description}`;
      break;
  }

  const marker = new google.maps.Marker({
    position: { lat: item.lat, lng: item.lng },
    map,
    icon: createIcon(type),
    title: item.name
  });
  const iw = new google.maps.InfoWindow({ content: popupContent });
  marker.addListener('click', () => openIW(iw, marker));
  marker._itemType = type;
  marker._itemIndex = index;
  marker._infoWindow = iw;
  openIW(iw, marker);
  markerArr.push(marker);
}

function removeMarkerForItem(type, index) {
  const arrMap = { hotels: hotelMarkers, tankstellen: tankMarkers, pausen: pauseMarkers };
  const arr = arrMap[type];
  const idx = arr.findIndex(m => m._itemType === type && m._itemIndex === index);
  if (idx > -1) {
    if (openInfoWindow === arr[idx]._infoWindow) {
      openInfoWindow.close();
      openInfoWindow = null;
    }
    arr[idx].setMap(null);
    arr.splice(idx, 1);
  }
}

// ===== BUDGET =====
function calculateBudget() {
  const fuelPrice = parseFloat(document.getElementById('fuelPrice').value) || BUDGET_DEFAULTS.fuelPriceLiter;
  const consumption = parseFloat(document.getElementById('fuelConsumption').value) || BUDGET_DEFAULTS.fuelConsumption;
  const hotelPrice = parseFloat(document.getElementById('hotelPrice').value) || BUDGET_DEFAULTS.hotelPerNight;

  const totalKm = ETAPPEN.reduce((sum, e) => sum + e.km, 0);
  const totalMaut = ETAPPEN.reduce((sum, e) => sum + e.maut, 0);
  const fuelCost = Math.round((totalKm / 100) * consumption * fuelPrice);
  const hotelCost = hotelPrice * BUDGET_DEFAULTS.nights;

  let extraHotels = 0;
  selectedItems.hotels.forEach(i => { extraHotels += HOTELS[i].price; });

  let extraPausen = 0;
  selectedItems.pausen.forEach(i => {
    if (PAUSEN[i].duration >= 60) extraPausen += 10;
  });

  const extras = extraHotels + extraPausen;
  const total = totalMaut + fuelCost + hotelCost + extras;
  const persons = parseInt(document.getElementById('personenInput').value) || BUDGET_DEFAULTS.persons;

  document.getElementById('budgetMaut').textContent = `EUR ${totalMaut}`;
  document.getElementById('budgetBenzin').textContent = `EUR ${fuelCost}`;
  document.getElementById('budgetHotels').textContent = `EUR ${hotelCost}`;
  document.getElementById('budgetTotal').textContent = `EUR ${total}`;
  document.getElementById('budgetPerPerson').textContent = `EUR ${Math.round(total / persons)} pro Person`;

  const extrasContainer = document.getElementById('budgetExtras');
  let extrasHtml = '';
  if (extraHotels > 0) {
    extrasHtml += `<div class="budget-item extra"><span>🏨 Ausgewaehlte Hotels</span><span>+EUR ${extraHotels}</span></div>`;
  }
  if (extraPausen > 0) {
    extrasHtml += `<div class="budget-item extra"><span>☕ Eintritt/Pausen</span><span>+EUR ${extraPausen}</span></div>`;
  }
  extrasContainer.innerHTML = extrasHtml;
}

// ===== INFO BANNER =====
function updateInfoBanner() {
  const banner = document.getElementById('infoBanner');
  const total = selectedItems.hotels.length + selectedItems.tankstellen.length + selectedItems.pausen.length;

  if (total === 0) {
    banner.style.display = 'none';
    return;
  }

  let extraCost = 0;
  selectedItems.hotels.forEach(i => { extraCost += HOTELS[i].price; });
  selectedItems.pausen.forEach(i => { if (PAUSEN[i].duration >= 60) extraCost += 10; });

  const parts = [];
  if (selectedItems.hotels.length) parts.push(`${selectedItems.hotels.length} Hotel(s)`);
  if (selectedItems.tankstellen.length) parts.push(`${selectedItems.tankstellen.length} Tankstelle(n)`);
  if (selectedItems.pausen.length) parts.push(`${selectedItems.pausen.length} Pause(n)`);

  banner.style.display = 'flex';
  document.getElementById('bannerText').innerHTML =
    `<i class="fas fa-check-circle"></i> ${total} Stops ausgewaehlt: ${parts.join(', ')}${extraCost > 0 ? ` | +EUR ${extraCost} Budget` : ''}`;
}

// ===== DARK MODE =====
function darkModeToggle() {
  const body = document.documentElement;
  const isDark = body.getAttribute('data-theme') === 'dark';
  body.setAttribute('data-theme', isDark ? 'light' : 'dark');
  const btn = document.getElementById('themeToggle');
  btn.innerHTML = isDark ? '<i class="fas fa-moon"></i> Dark Mode' : '<i class="fas fa-sun"></i> Light Mode';
  localStorage.setItem('theme', isDark ? 'light' : 'dark');
}

// ===== ETAPPEN CARDS =====
function routeClickHandler(index) {
  const from = ROUTE[index];
  const to = ROUTE[index + 1];
  const bounds = new google.maps.LatLngBounds();
  bounds.extend({ lat: from.lat, lng: from.lng });
  bounds.extend({ lat: to.lat, lng: to.lng });
  map.fitBounds(bounds);
  openIW(markers[index]._infoWindow, markers[index]);
  setTimeout(() => openIW(markers[index + 1]._infoWindow, markers[index + 1]), 500);
}

function renderEtappen() {
  const grid = document.getElementById('etappenGrid');
  grid.innerHTML = '';

  ETAPPEN.forEach((etappe, i) => {
    const card = document.createElement('div');
    card.className = 'etappe-card';
    card.onclick = () => routeClickHandler(i);
    card.innerHTML = `
      <h3><i class="fas fa-route"></i> Etappe ${i + 1}</h3>
      <div class="detail"><i class="fas fa-map-marker-alt"></i> ${etappe.from} - ${etappe.to}</div>
      <div class="detail"><i class="fas fa-road"></i> ${etappe.km} km</div>
      <div class="detail"><i class="fas fa-clock"></i> ~${etappe.hours} Stunden</div>
      <div class="detail"><i class="fas fa-coins"></i> Maut: EUR ${etappe.maut}</div>
      <div class="detail" style="margin-top:0.5rem;font-style:italic;opacity:0.7">${etappe.description}</div>
    `;
    grid.appendChild(card);
  });
}

// ===== CSV EXPORT =====
function exportToCSV() {
  const totalKm = ETAPPEN.reduce((sum, e) => sum + e.km, 0);
  const rows = [
    ['Etappe', 'Von', 'Nach', 'Kilometer', 'Stunden', 'Maut (EUR)'],
    ...ETAPPEN.map((e, i) => [`Etappe ${i + 1}`, e.from, e.to, e.km, e.hours, e.maut]),
    ['', '', 'GESAMT', totalKm, ETAPPEN.reduce((s, e) => s + e.hours, 0), ETAPPEN.reduce((s, e) => s + e.maut, 0)],
    [],
    ['Budget Position', 'Betrag (EUR)'],
    ['Maut', document.getElementById('budgetMaut').textContent],
    ['Benzin', document.getElementById('budgetBenzin').textContent],
    ['Hotels', document.getElementById('budgetHotels').textContent],
    ['GESAMT', document.getElementById('budgetTotal').textContent],
    [],
    ['Ausgewaehlte Stops'],
    ...selectedItems.hotels.map(i => ['Hotel', HOTELS[i].name, `EUR ${HOTELS[i].price}`]),
    ...selectedItems.tankstellen.map(i => ['Tankstelle', TANKSTELLEN[i].name, `EUR ${TANKSTELLEN[i].priceLiter}/L`]),
    ...selectedItems.pausen.map(i => ['Pause', PAUSEN[i].name, `${PAUSEN[i].duration} min`])
  ];

  const csv = rows.map(r => r.join(';')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'reiseplan_frankfurt_santagata.csv';
  link.click();
  URL.revokeObjectURL(link.href);
}

// ===== JSON EXPORT =====
function exportAsJSON() {
  const data = {
    route: ROUTE,
    etappen: ETAPPEN,
    selections: {
      hotels: selectedItems.hotels.map(i => HOTELS[i]),
      tankstellen: selectedItems.tankstellen.map(i => TANKSTELLEN[i]),
      pausen: selectedItems.pausen.map(i => PAUSEN[i])
    },
    budget: {
      maut: document.getElementById('budgetMaut').textContent,
      benzin: document.getElementById('budgetBenzin').textContent,
      hotels: document.getElementById('budgetHotels').textContent,
      gesamt: document.getElementById('budgetTotal').textContent
    },
    datum: document.getElementById('dateInput').value,
    personen: document.getElementById('personenInput').value
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'reiseplan_config.json';
  link.click();
  URL.revokeObjectURL(link.href);
}

// ===== LOCAL STORAGE =====
function saveToLocalStorage() {
  localStorage.setItem('reiseplanerSelections', JSON.stringify(selectedItems));
}

function loadFromLocalStorage() {
  const saved = localStorage.getItem('reiseplanerSelections');
  if (!saved) return;

  try {
    const data = JSON.parse(saved);
    selectedItems = data;

    Object.keys(selectedItems).forEach(type => {
      selectedItems[type].forEach(index => {
        addMarkerForItem(type, index);
      });
    });

    updateInfoBanner();
  } catch (e) {
    // Ignore invalid data
  }
}

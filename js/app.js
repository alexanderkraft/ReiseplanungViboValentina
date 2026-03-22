// Route data
const ROUTE = [
  { name: 'Frankfurt', lat: 50.1109, lng: 8.6821, icon: '🏁' },
  { name: 'Innsbruck', lat: 47.2692, lng: 11.4041, icon: '🏔️' },
  { name: 'Bologna', lat: 44.4949, lng: 11.3426, icon: '🍝' },
  { name: "Sant'Agata di Esaro", lat: 39.035, lng: 16.345, icon: '🏖️' }
];

const ETAPPEN = [
  {
    from: 'Frankfurt',
    to: 'Innsbruck',
    km: 525,
    hours: 6,
    description: 'Durch Süddeutschland über die A7/A8 nach Tirol',
    maut: 30
  },
  {
    from: 'Innsbruck',
    to: 'Bologna',
    km: 650,
    hours: 7,
    description: 'Über den Brennerpass durch Südtirol nach Emilia-Romagna',
    maut: 80
  },
  {
    from: 'Bologna',
    to: "Sant'Agata di Esaro",
    km: 775,
    hours: 8,
    description: 'Die Adriaküste entlang bis nach Kalabrien',
    maut: 70
  }
];

const BUDGET_DEFAULTS = {
  fuelPriceLiter: 1.65,
  fuelConsumption: 7,
  hotelPerNight: 175,
  nights: 2,
  persons: 2
};

const ROUTE_COLORS = ['#3b82f6', '#10b981', '#f59e0b'];

let map;
let markers = [];

// Initialize map
function initMap() {
  map = L.map('map').setView([45.5, 12.0], 6);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 18
  }).addTo(map);

  // Add markers
  ROUTE.forEach((point, i) => {
    const marker = L.marker([point.lat, point.lng]).addTo(map);
    marker.bindPopup(`<b>${point.icon} ${point.name}</b>`);
    markers.push(marker);
  });

  // Draw route polylines
  for (let i = 0; i < ROUTE.length - 1; i++) {
    const start = ROUTE[i];
    const end = ROUTE[i + 1];
    L.polyline(
      [[start.lat, start.lng], [end.lat, end.lng]],
      { color: ROUTE_COLORS[i], weight: 4, opacity: 0.8, dashArray: '10, 8' }
    ).addTo(map);
  }

  // Fit map bounds
  const bounds = L.latLngBounds(ROUTE.map(p => [p.lat, p.lng]));
  map.fitBounds(bounds, { padding: [30, 30] });
}

// Calculate budget
function calculateBudget() {
  const fuelPrice = parseFloat(document.getElementById('fuelPrice').value) || BUDGET_DEFAULTS.fuelPriceLiter;
  const consumption = parseFloat(document.getElementById('fuelConsumption').value) || BUDGET_DEFAULTS.fuelConsumption;
  const hotelPrice = parseFloat(document.getElementById('hotelPrice').value) || BUDGET_DEFAULTS.hotelPerNight;

  const totalKm = ETAPPEN.reduce((sum, e) => sum + e.km, 0);
  const totalMaut = ETAPPEN.reduce((sum, e) => sum + e.maut, 0);
  const fuelCost = Math.round((totalKm / 100) * consumption * fuelPrice);
  const hotelCost = hotelPrice * BUDGET_DEFAULTS.nights;
  const total = totalMaut + fuelCost + hotelCost;

  document.getElementById('budgetMaut').textContent = `€${totalMaut}`;
  document.getElementById('budgetBenzin').textContent = `€${fuelCost}`;
  document.getElementById('budgetHotels').textContent = `€${hotelCost}`;
  document.getElementById('budgetTotal').textContent = `€${total}`;
  document.getElementById('budgetPerPerson').textContent = `€${Math.round(total / BUDGET_DEFAULTS.persons)} pro Person`;
}

// Dark mode toggle
function darkModeToggle() {
  const body = document.documentElement;
  const isDark = body.getAttribute('data-theme') === 'dark';
  body.setAttribute('data-theme', isDark ? 'light' : 'dark');
  const btn = document.getElementById('themeToggle');
  btn.innerHTML = isDark ? '<i class="fas fa-moon"></i> Dark Mode' : '<i class="fas fa-sun"></i> Light Mode';
  localStorage.setItem('theme', isDark ? 'light' : 'dark');
}

// Zoom to etappe on click
function routeClickHandler(index) {
  const etappe = ETAPPEN[index];
  const from = ROUTE[index];
  const to = ROUTE[index + 1];
  const bounds = L.latLngBounds([[from.lat, from.lng], [to.lat, to.lng]]);
  map.fitBounds(bounds, { padding: [50, 50] });

  markers[index].openPopup();
  setTimeout(() => markers[index + 1].openPopup(), 500);
}

// Render etappen cards
function renderEtappen() {
  const grid = document.getElementById('etappenGrid');
  grid.innerHTML = '';

  ETAPPEN.forEach((etappe, i) => {
    const card = document.createElement('div');
    card.className = 'etappe-card';
    card.onclick = () => routeClickHandler(i);
    card.innerHTML = `
      <h3><i class="fas fa-route"></i> Etappe ${i + 1}</h3>
      <div class="detail"><i class="fas fa-map-marker-alt"></i> ${etappe.from} → ${etappe.to}</div>
      <div class="detail"><i class="fas fa-road"></i> ${etappe.km} km</div>
      <div class="detail"><i class="fas fa-clock"></i> ~${etappe.hours} Stunden</div>
      <div class="detail"><i class="fas fa-coins"></i> Maut: €${etappe.maut}</div>
      <div class="detail" style="margin-top:0.5rem;font-style:italic;opacity:0.7">${etappe.description}</div>
    `;
    grid.appendChild(card);
  });
}

// Export to CSV
function exportToCSV() {
  const totalKm = ETAPPEN.reduce((sum, e) => sum + e.km, 0);
  const rows = [
    ['Etappe', 'Von', 'Nach', 'Kilometer', 'Stunden', 'Maut (EUR)'],
    ...ETAPPEN.map((e, i) => [
      `Etappe ${i + 1}`, e.from, e.to, e.km, e.hours, e.maut
    ]),
    ['', '', 'GESAMT', totalKm, ETAPPEN.reduce((s, e) => s + e.hours, 0), ETAPPEN.reduce((s, e) => s + e.maut, 0)],
    [],
    ['Budget Position', 'Betrag (EUR)'],
    ['Maut', document.getElementById('budgetMaut').textContent],
    ['Benzin', document.getElementById('budgetBenzin').textContent],
    ['Hotels', document.getElementById('budgetHotels').textContent],
    ['GESAMT', document.getElementById('budgetTotal').textContent]
  ];

  const csv = rows.map(r => r.join(';')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'reiseplan_frankfurt_santagata.csv';
  link.click();
  URL.revokeObjectURL(link.href);
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
  // Load saved theme
  const savedTheme = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
  const btn = document.getElementById('themeToggle');
  if (savedTheme === 'dark') {
    btn.innerHTML = '<i class="fas fa-sun"></i> Light Mode';
  }

  initMap();
  renderEtappen();
  calculateBudget();

  // Event listeners
  document.getElementById('themeToggle').addEventListener('click', darkModeToggle);
  document.getElementById('calculateBtn').addEventListener('click', calculateBudget);
  document.getElementById('exportBtn').addEventListener('click', exportToCSV);

  // Live budget updates
  ['fuelPrice', 'fuelConsumption', 'hotelPrice'].forEach(id => {
    document.getElementById(id).addEventListener('input', calculateBudget);
  });
});

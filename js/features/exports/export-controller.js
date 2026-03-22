import { formatDuration } from '../../core/utils/format.js';

export function buildCsvRows({ inputs, route, legs, selectedItems, pois, budget }) {
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

  return rows;
}

export function downloadTextFile({ content, filename, mimeType }) {
  const blob = new Blob([content], { type: mimeType });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

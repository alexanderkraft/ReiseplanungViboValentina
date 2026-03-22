import { DEFAULTS } from '../../core/constants.js';

export function readTripInputsFromForm($) {
  return {
    start: $('startInput').value.trim(),
    destination: $('zielInput').value.trim(),
    date: $('dateInput').value,
    persons: Math.max(1, parseInt($('personenInput').value, 10) || DEFAULTS.persons),
    maxKmPerDay: Math.max(150, parseInt($('maxKmPerDayInput').value, 10) || DEFAULTS.maxKmPerDay),
    fuelPrice: parseFloat($('fuelPrice').value) || DEFAULTS.fuelPriceLiter,
    fuelConsumption: parseFloat($('fuelConsumption').value) || DEFAULTS.fuelConsumption,
    hotelPrice: parseFloat($('hotelPrice').value) || DEFAULTS.hotelPerNight
  };
}

export function writeTripInputsToForm($, inputs) {
  $('startInput').value = inputs.start;
  $('zielInput').value = inputs.destination;
  $('dateInput').value = inputs.date;
  $('personenInput').value = inputs.persons || DEFAULTS.persons;
  $('maxKmPerDayInput').value = inputs.maxKmPerDay || DEFAULTS.maxKmPerDay;
  $('fuelPrice').value = inputs.fuelPrice || DEFAULTS.fuelPriceLiter;
  $('fuelConsumption').value = inputs.fuelConsumption || DEFAULTS.fuelConsumption;
  $('hotelPrice').value = inputs.hotelPrice || DEFAULTS.hotelPerNight;
}

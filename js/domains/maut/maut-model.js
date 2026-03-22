export function createMautModel(overrides = {}) {
  return {
    countryCode: '',
    provider: 'estimate',
    amount: 0,
    currency: 'EUR',
    ...overrides
  };
}

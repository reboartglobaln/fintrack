/**
 * Currency Exchange Rate Service
 * Handles multi-currency conversion (IDR, USD, EUR, SGD, JPY, GBP)
 */

export interface CurrencyRate {
  code: string;
  name: string;
  symbol: string;
  rateToIdr: number; // How many IDR is 1 unit of this currency
}

export const SUPPORTED_CURRENCIES: Record<string, CurrencyRate> = {
  IDR: { code: 'IDR', name: 'Indonesian Rupiah', symbol: 'Rp', rateToIdr: 1 },
  USD: { code: 'USD', name: 'US Dollar', symbol: '$', rateToIdr: 15850 },
  EUR: { code: 'EUR', name: 'Euro', symbol: '€', rateToIdr: 17200 },
  SGD: { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', rateToIdr: 11950 },
  JPY: { code: 'JPY', name: 'Japanese Yen', symbol: '¥', rateToIdr: 105 },
  GBP: { code: 'GBP', name: 'British Pound', symbol: '£', rateToIdr: 20400 },
};

export function convertCurrency(amount: number, fromCurrency: string, toCurrency: string): number {
  const from = SUPPORTED_CURRENCIES[fromCurrency] || SUPPORTED_CURRENCIES.IDR;
  const to = SUPPORTED_CURRENCIES[toCurrency] || SUPPORTED_CURRENCIES.IDR;

  if (from.code === to.code) return amount;

  // Convert to IDR first
  const amountInIdr = amount * from.rateToIdr;
  // Convert IDR to target currency
  const converted = amountInIdr / to.rateToIdr;

  return Number(converted.toFixed(2));
}

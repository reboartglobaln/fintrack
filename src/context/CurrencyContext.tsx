import React, { createContext, useContext, useState, useEffect } from 'react';
import { Currency } from '../types';
import { formatCurrency } from '../utils/formatters';
import api from '../api/axios';

interface CurrencyContextValue {
  selectedCurrency: string;
  currencies: Currency[];
  exchangeRate: number; // multiplier from IDR to selected currency
  changeCurrency: (code: string) => void;
  formatMoney: (amountInIdr: number) => string;
}

const DEFAULT_CURRENCIES: Currency[] = [
  { code: 'IDR', name: 'Indonesian Rupiah', symbol: 'Rp', rateToIdr: 1 },
  { code: 'USD', name: 'US Dollar', symbol: '$', rateToIdr: 15850 },
  { code: 'EUR', name: 'Euro', symbol: '€', rateToIdr: 17200 },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', rateToIdr: 11950 },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥', rateToIdr: 105 },
  { code: 'GBP', name: 'British Pound', symbol: '£', rateToIdr: 20400 },
];

const CurrencyContext = createContext<CurrencyContextValue | undefined>(undefined);

export const CurrencyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedCurrency, setSelectedCurrency] = useState<string>(() => {
    return localStorage.getItem('fintrack_currency') || 'IDR';
  });
  const [currencies, setCurrencies] = useState<Currency[]>(DEFAULT_CURRENCIES);

  // Fetch currencies and live rates from backend
  useEffect(() => {
    api
      .get('/system/currencies')
      .then((res) => {
        if (res.data?.data) {
          setCurrencies(res.data.data);
        }
      })
      .catch(() => {
        // fallback to default
      });
  }, []);

  const changeCurrency = (code: string) => {
    setSelectedCurrency(code);
    localStorage.setItem('fintrack_currency', code);
  };

  const curr = currencies.find((c) => c.code === selectedCurrency) || DEFAULT_CURRENCIES[0];
  // rate to convert IDR into target currency (e.g. 1 / 15850 for USD)
  const exchangeRate = curr.code === 'IDR' ? 1 : 1 / curr.rateToIdr;

  const formatMoney = (amountInIdr: number) => {
    return formatCurrency(amountInIdr, selectedCurrency, exchangeRate);
  };

  return (
    <CurrencyContext.Provider
      value={{
        selectedCurrency,
        currencies,
        exchangeRate,
        changeCurrency,
        formatMoney,
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = (): CurrencyContextValue => {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
};

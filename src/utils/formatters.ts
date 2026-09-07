export const CURRENCY_SYMBOLS: Record<string, string> = {
  IDR: 'Rp',
  USD: '$',
  EUR: '€',
  SGD: 'S$',
  JPY: '¥',
  GBP: '£',
};

export function formatCurrency(
  amount: number,
  currencyCode: string = 'IDR',
  convertedRate: number = 1
): string {
  const converted = amount * convertedRate;
  const symbol = CURRENCY_SYMBOLS[currencyCode] || currencyCode;

  if (currencyCode === 'IDR') {
    return `${symbol} ${Math.round(converted).toLocaleString('id-ID')}`;
  }

  return `${symbol} ${converted.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatDate(dateString: string, formatStyle: 'short' | 'medium' | 'long' = 'medium'): string {
  if (!dateString) return '-';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return dateString;

  if (formatStyle === 'short') {
    return d.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  if (formatStyle === 'long') {
    return d.toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }

  return d.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function getMonthName(monthNumber: number): string {
  const months = [
    'Januari',
    'Februari',
    'Maret',
    'April',
    'Mei',
    'Juni',
    'Juli',
    'Agustus',
    'September',
    'Oktober',
    'November',
    'Desember',
  ];
  return months[monthNumber - 1] || `Bulan ${monthNumber}`;
}

import { CurrencyCode } from '@/types/wealth';

// Format number as currency with smart compact notation
export function formatCurrency(
  amount: number,
  currency: CurrencyCode = 'AUD',
  options: { compact?: boolean; showSign?: boolean } = {}
): string {
  const { compact = false, showSign = false } = options;
  
  const localeMap: Record<CurrencyCode, string> = {
    AUD: 'en-AU',
    USD: 'en-US',
    IDR: 'id-ID',
  };

  if (compact) {
    return formatCompactCurrency(amount, currency, showSign);
  }

  const formatter = new Intl.NumberFormat(localeMap[currency], {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    signDisplay: showSign ? 'exceptZero' : 'auto',
  });

  return formatter.format(amount);
}

// Smart compact currency formatting with proper decimals
// >= 1,000,000 → $2.18M (2 decimals)
// >= 100,000 → $127K (no decimals)
// >= 10,000 → $12.3K (1 decimal)
// < 10,000 → $9,532 (full number)
export function formatCompactCurrency(
  amount: number,
  currency: CurrencyCode = 'AUD',
  showSign: boolean = false
): string {
  const absAmount = Math.abs(amount);
  const sign = showSign && amount > 0 ? '+' : amount < 0 ? '-' : '';
  const prefix = currency === 'AUD' ? '$' : currency === 'USD' ? 'US$' : 'Rp';
  
  let formatted: string;
  
  if (absAmount >= 1_000_000) {
    // >= 1M: show 2 decimals (e.g., $2.18M)
    formatted = `${(absAmount / 1_000_000).toFixed(2)}M`;
  } else if (absAmount >= 100_000) {
    // >= 100K: show no decimals (e.g., $127K)
    formatted = `${Math.round(absAmount / 1_000)}K`;
  } else if (absAmount >= 10_000) {
    // >= 10K: show 1 decimal (e.g., $12.3K)
    formatted = `${(absAmount / 1_000).toFixed(1)}K`;
  } else {
    // < 10K: show full number with commas (e.g., $9,532)
    formatted = absAmount.toLocaleString('en-AU', { 
      minimumFractionDigits: 0, 
      maximumFractionDigits: 0 
    });
  }
  
  return `${sign}${prefix}${formatted}`;
}

// Format percentage
export function formatPercent(value: number, decimals: number = 1): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

// Format number with compact notation
export function formatCompact(value: number): string {
  return new Intl.NumberFormat('en-AU', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}

// Format date
export function formatDate(date: string | Date, format: 'short' | 'medium' | 'long' = 'medium'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  
  const optionsMap: Record<'short' | 'medium' | 'long', Intl.DateTimeFormatOptions> = {
    short: { month: 'short', year: '2-digit' },
    medium: { day: 'numeric', month: 'short', year: 'numeric' },
    long: { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' },
  };

  return d.toLocaleDateString('en-AU', optionsMap[format]);
}

// Format relative change
export function formatChange(current: number, previous: number): {
  value: number;
  percent: number;
  formatted: string;
  isPositive: boolean;
} {
  const value = current - previous;
  const percent = previous !== 0 ? value / previous : 0;
  const isPositive = value >= 0;
  
  return {
    value,
    percent,
    formatted: `${isPositive ? '+' : ''}${formatCompactCurrency(value, 'AUD')}`,
    isPositive,
  };
}

// Get country flag emoji
export function getCountryFlag(country: string): string {
  const flags: Record<string, string> = {
    AU: '🇦🇺',
    US: '🇺🇸',
    USA: '🇺🇸',
    ID: '🇮🇩',
    IDN: '🇮🇩',
  };
  return flags[country.toUpperCase()] || '🌍';
}

// Get country name
export function getCountryName(country: string): string {
  const names: Record<string, string> = {
    AU: 'Australia',
    US: 'United States',
    USA: 'United States',
    ID: 'Indonesia',
    IDN: 'Indonesia',
  };
  return names[country.toUpperCase()] || country;
}

// Get currency symbol
export function getCurrencySymbol(currency: CurrencyCode): string {
  const symbols: Record<CurrencyCode, string> = {
    AUD: 'A$',
    USD: 'US$',
    IDR: 'Rp',
  };
  return symbols[currency];
}

import { CurrencyCode } from '@/types/wealth';

// Format number as currency
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

  const formatter = new Intl.NumberFormat(localeMap[currency], {
    style: 'currency',
    currency,
    minimumFractionDigits: compact ? 0 : 2,
    maximumFractionDigits: compact ? 0 : 2,
    notation: compact ? 'compact' : 'standard',
    signDisplay: showSign ? 'exceptZero' : 'auto',
  });

  return formatter.format(amount);
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
    formatted: `${isPositive ? '+' : ''}${formatCurrency(value, 'AUD', { compact: true })}`,
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

// Get currency symbol
export function getCurrencySymbol(currency: CurrencyCode): string {
  const symbols: Record<CurrencyCode, string> = {
    AUD: 'A$',
    USD: 'US$',
    IDR: 'Rp',
  };
  return symbols[currency];
}

/**
 * Format number as Brazilian currency (R$ 1.234.567,89)
 */
export function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Format number as Brazilian decimal (1.234.567,89)
 */
export function formatBrazilianNumber(
  value: number,
  decimals: number = 2
): string {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/**
 * Format number in thousands (1.234 → 1,23 mil)
 */
export function formatThousands(value: number): string {
  const thousands = value / 1000;
  return `${formatBrazilianNumber(thousands, 2)} mil`;
}

/**
 * Format number in millions (1234567 → 1,23 M)
 */
export function formatMillions(value: number): string {
  const millions = value / 1000000;
  return `${formatBrazilianNumber(millions, 2)} M`;
}

/**
 * Format basis points (0.72 → 0,72 bps)
 */
export function formatBps(value: number): string {
  return `${formatBrazilianNumber(value, 2)} bps`;
}

/**
 * Format percentage (0.75 → 75,00%)
 */
export function formatPercentage(value: number, decimals: number = 2): string {
  return `${formatBrazilianNumber(value * 100, decimals)}%`;
}

/**
 * Format date as Brazilian (YYYY-MM-DD → DD/MM/YYYY)
 */
export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR').format(date);
}

/**
 * Format datetime as Brazilian (YYYY-MM-DD HH:MM:SS → DD/MM/YYYY HH:MM)
 */
export function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
}

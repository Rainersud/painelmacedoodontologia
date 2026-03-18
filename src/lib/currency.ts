/**
 * Format a number as Brazilian Real currency (R$ 1.000,00)
 */
export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Parse a formatted currency string back to number
 */
export function parseCurrencyInput(input: string): number {
  // Remove everything except digits and comma
  const cleaned = input.replace(/[^\d,]/g, '');
  // Replace comma with dot for parsing
  const normalized = cleaned.replace(',', '.');
  return parseFloat(normalized) || 0;
}

/**
 * Format input as currency while typing (returns display string)
 */
export function formatCurrencyInput(rawValue: string): string {
  // Remove non-digit characters
  const digits = rawValue.replace(/\D/g, '');
  if (!digits) return '';
  
  // Convert to cents then to reais
  const cents = parseInt(digits, 10);
  const reais = cents / 100;
  
  return reais.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Convert formatted display value back to number
 */
export function currencyDisplayToNumber(display: string): number {
  if (!display) return 0;
  const cleaned = display.replace(/\./g, '').replace(',', '.');
  return parseFloat(cleaned) || 0;
}

/**
 * Credit card anticipation fee rates by installment count
 */
export const CREDIT_FEE_RATES: Record<number, number> = {
  1: 3.16,
  2: 4.57,
  3: 5.38,
  4: 6.18,
  5: 6.97,
  6: 7.75,
  7: 8.92,
  8: 9.69,
  9: 10.44,
  10: 11.19,
  11: 11.93,
  12: 12.66,
};

/**
 * Calculate net value after credit card fees
 */
export function calculateNetValue(grossValue: number, installments: number): {
  feePercentage: number;
  feeAmount: number;
  netValue: number;
} {
  const feePercentage = CREDIT_FEE_RATES[installments] || 0;
  const feeAmount = grossValue * (feePercentage / 100);
  const netValue = grossValue - feeAmount;
  return { feePercentage, feeAmount, netValue };
}

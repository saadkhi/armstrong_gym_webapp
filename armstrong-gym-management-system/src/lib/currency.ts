/**
 * PKR currency formatting helpers.
 * Used throughout the app to format amounts consistently as "Rs. X,XXX".
 */

/**
 * Format a number as Pakistani Rupees.
 * e.g. 2500 → "Rs. 2,500"
 */
export function formatPKR(amount: number | string): string {
  const n = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(n)) return 'Rs. 0';
  return `Rs. ${n.toLocaleString('en-PK')}`;
}

/** Currency symbol only */
export const PKR = 'Rs.';

/** Locale string for Pakistan */
export const PKR_LOCALE = 'en-PK';

/*
 * Shared money representation for CRFIS.
 *
 * Monetary amounts are carried as decimal STRINGS, never JavaScript numbers,
 * so exact cent precision survives every boundary until presentation time.
 * Currency is always explicit - formatting and aggregation must never
 * assume USD.
 */

export const SUPPORTED_CURRENCIES = [
  'USD',
  'INR',
  'EUR',
  'GBP',
  'JPY',
] as const

export type CurrencyCode = (typeof SUPPORTED_CURRENCIES)[number]

export interface Money {
  /** Decimal string, e.g. "3600000.00". */
  amount: string
  currency: CurrencyCode
}

/** Converts a numeric domain value into structured Money. */
export function toMoney(
  amount: number | string,
  currency: CurrencyCode,
): Money {
  const parsed =
    typeof amount === 'number' ? amount : Number.parseFloat(amount)

  if (!Number.isFinite(parsed)) {
    throw new TypeError(
      `Invalid monetary amount received: ${String(amount)}`,
    )
  }

  return { amount: String(parsed), currency }
}

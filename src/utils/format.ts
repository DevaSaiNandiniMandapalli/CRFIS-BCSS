import type { Money } from '../types/money'

/*
 * Centralized presentation formatters.
 *
 * Rules:
 * - Currency symbols come from Intl.NumberFormat via ISO 4217 codes.
 *   Never hardcode "$" or manually append K/M/B suffixes.
 * - Fraction digits are decided by the currency (JPY renders with zero
 *   decimals), never hardcoded globally.
 * - The locale defaults to en-US for now; a future user-settings phase can
 *   pass a different locale without touching call sites.
 */

export const DEFAULT_LOCALE = 'en-US'

const numberFormatterCache = new Map<string, Intl.NumberFormat>()

function getNumberFormat(
  locale: string,
  options: Intl.NumberFormatOptions,
): Intl.NumberFormat {
  const key = `${locale}::${JSON.stringify(options)}`

  let formatter = numberFormatterCache.get(key)

  if (!formatter) {
    formatter = new Intl.NumberFormat(locale, options)
    numberFormatterCache.set(key, formatter)
  }

  return formatter
}

const dateFormatterCache = new Map<string, Intl.DateTimeFormat>()

function getDateFormatter(
  locale: string,
  options: Intl.DateTimeFormatOptions,
): Intl.DateTimeFormat {
  const key = `${locale}::${JSON.stringify(options)}`

  let formatter = dateFormatterCache.get(key)

  if (!formatter) {
    formatter = new Intl.DateTimeFormat(locale, options)
    dateFormatterCache.set(key, formatter)
  }

  return formatter
}

export interface FormatMoneyOptions {
  locale?: string
  /** Compact notation for KPI cards, e.g. "$3.6M". */
  compact?: boolean
}

function parseAmount(money: Money): number {
  const amount =
    typeof money.amount === 'string'
      ? Number.parseFloat(money.amount)
      : money.amount

  if (!Number.isFinite(amount)) {
    throw new TypeError(
      `Invalid money amount: ${String(money.amount)}`,
    )
  }

  return amount
}

/** Formats structured Money, e.g. USD -> $3,600,000 / JPY -> ¥3,600,000. */
export function formatMoney(
  value: Money,
  options: FormatMoneyOptions = {},
): string {
  return getNumberFormat(options.locale ?? DEFAULT_LOCALE, {
    style: 'currency',
    currency: value.currency,
    ...(options.compact
      ? { notation: 'compact', maximumFractionDigits: 1 }
      : { maximumFractionDigits: 0 }),
  }).format(parseAmount(value))
}

/** Like formatMoney but renders an em dash when no value exists. */
export function formatMoneyOrDash(
  value: Money | null | undefined,
  options: FormatMoneyOptions = {},
): string {
  return value === null || value === undefined
    ? '—'
    : formatMoney(value, options)
}

export interface FormatNumberOptions {
  locale?: string
  compact?: boolean
}

export function formatNumber(
  value: number,
  options: FormatNumberOptions = {},
): string {
  const locale = options.locale ?? DEFAULT_LOCALE

  return getNumberFormat(
    locale,
    options.compact
      ? { notation: 'compact', maximumFractionDigits: 1 }
      : { maximumFractionDigits: 0 },
  ).format(value)
}

/**
 * Formats a percentage given as a whole number (52 -> "52%").
 * `fractionDigits` controls decimals after the percent conversion.
 */
export function formatPercent(
  value: number,
  options: { locale?: string; fractionDigits?: number } = {},
): string {
  const fractionDigits = options.fractionDigits ?? 0

  return getNumberFormat(options.locale ?? DEFAULT_LOCALE, {
    style: 'percent',
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value / 100)
}

/** Formats a ratio such as 2.3517 -> "2.35x". */
export function formatRatio(
  value: number,
  options: { locale?: string } = {},
): string {
  return `${getNumberFormat(options.locale ?? DEFAULT_LOCALE, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)}x`
}

export interface FormatDateOptions {
  locale?: string
}

/** Formats an ISO date string or Date as a localized date ("Sep 15, 2026"). */
export function formatDate(
  value: string | Date,
  options: FormatDateOptions = {},
): string {
  const date = value instanceof Date ? value : new Date(value)

  if (Number.isNaN(date.getTime())) {
    throw new TypeError(`Invalid date value: ${String(value)}`)
  }

  // Date-only strings are interpreted in UTC to avoid off-by-one shifts.
  return getDateFormatter(options.locale ?? DEFAULT_LOCALE, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(date)
}

/** Formats a timestamp including time-of-day ("Sep 15, 2026, 3:24 PM"). */
export function formatDateTime(
  value: string | Date,
  options: FormatDateOptions = {},
): string {
  const date = value instanceof Date ? value : new Date(value)

  if (Number.isNaN(date.getTime())) {
    throw new TypeError(`Invalid date value: ${String(value)}`)
  }

  return getDateFormatter(options.locale ?? DEFAULT_LOCALE, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

/** Slugifies a status/severity label for badge modifiers: "Under Review" -> "under-review". */
export function slugify(value: string): string {
  return value.toLowerCase().replaceAll(' ', '-')
}

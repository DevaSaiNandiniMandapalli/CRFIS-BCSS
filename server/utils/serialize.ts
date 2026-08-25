// Primitive JSON-safe conversions shared by every API mapper.
//
// Representation decisions (deliberate, applied consistently):
//
// 1. Money leaves the API as scale-exact decimal STRINGS (decimalToString);
//    decimalToNumber exists only for in-process aggregation (stats/KPIs),
//    never for wire payloads.
// 2. Prisma DateTime -> ISO-8601 UTC string via Date#toISOString.
// 3. Nullable columns stay nullable in payloads; mappers never coerce
//    null/undefined into sentinel values like '' or 0.

interface DecimalLike {
  toNumber(): number
  toString?: () => string
}

export type MoneyInput = DecimalLike | number | string

function isDecimalLike(value: unknown): value is DecimalLike {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { toNumber?: unknown }).toNumber === 'function'
  )
}

export function decimalToNumber(value: MoneyInput): number {
  if (isDecimalLike(value)) {
    return value.toNumber()
  }

  if (typeof value === 'number') {
    return value
  }

  const parsed = Number.parseFloat(value)

  if (!Number.isFinite(parsed)) {
    throw new TypeError('Invalid decimal representation received from the database.')
  }

  return parsed
}

export function nullableDecimalToNumber(value: MoneyInput | null | undefined): number | null {
  if (value === null || value === undefined) {
    return null
  }

  return decimalToNumber(value)
}

/**
 * Canonical API money representation: a decimal STRING preserving the
 * database scale exactly (e.g. "1800000.00"), never a float. JavaScript
 * numbers lose cents above 2^53 and drop trailing zeros; the API contract
 * does neither.
 *
 * Every Decimal(18,2) column carries exactly two fraction digits, but the
 * pg driver adapter materialises numerics as Decimal objects whose
 * toString() normalises trailing zeros away ("1250000.50" -> "1250000.5").
 * The value is therefore re-scaled to the declared column scale here with
 * pure string arithmetic - no float ever touches a monetary amount.
 */
export function decimalToString(value: MoneyInput): string {
  return formatAtScale(rawDecimalString(value))
}

/** Extracts the raw decimal text without any numeric conversion. */
function rawDecimalString(value: MoneyInput): string {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new TypeError('Invalid decimal representation received from the database.')
    }

    return String(value)
  }

  if (typeof value === 'string') {
    if (!Number.isFinite(Number.parseFloat(value))) {
      throw new TypeError('Invalid decimal representation received from the database.')
    }

    return value
  }

  if (isDecimalLike(value) && typeof value.toString === 'function') {
    const serialized = value.toString()

    if (!Number.isFinite(Number.parseFloat(serialized))) {
      throw new TypeError('Invalid decimal representation received from the database.')
    }

    return serialized
  }

  throw new TypeError('Invalid decimal representation received from the database.')
}

const PLAIN_DECIMAL_PATTERN = /^([+-]?)(\d+)(?:\.(\d+))?$/

/** Re-scales plain decimal text to exactly two fraction digits (string math). */
function formatAtScale(raw: string): string {
  let match = PLAIN_DECIMAL_PATTERN.exec(raw.trim())

  if (!match) {
    // Exponent forms ("1.5e+7") cannot be padded textually; route them
    // through Number#toFixed, which is exact enough for magnitudes far
    // below the Decimal(18,2) ceiling this API actually stores.
    const asNumber = Number(raw.trim())

    if (!Number.isFinite(asNumber)) {
      throw new TypeError('Invalid decimal representation received from the database.')
    }

    match = PLAIN_DECIMAL_PATTERN.exec(asNumber.toFixed(2))

    if (!match) {
      throw new TypeError('Invalid decimal representation received from the database.')
    }
  }

  const sign = match[1] === '-' ? '-' : ''
  const integerPart = match[2].replace(/^0+(?=\d)/, '')
  const fractionPart = (match[3] ?? '').padEnd(2, '0').slice(0, 2)

  return `${sign}${integerPart}.${fractionPart}`
}

/** Builds the flat wire-format money pair used by every monetary DTO field. */
export function moneyDto(
  amount: MoneyInput,
  currency: string,
): { amount: string; currency: string } {
  return { amount: decimalToString(amount), currency }
}

export function dateToIso(value: Date | string): string {
  if (value instanceof Date) {
    return value.toISOString()
  }

  const parsed = new Date(value)

  if (Number.isNaN(parsed.getTime())) {
    throw new TypeError('Invalid date representation received from the database.')
  }

  return parsed.toISOString()
}

export function nullableDateToIso(value: Date | string | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null
  }

  return dateToIso(value)
}

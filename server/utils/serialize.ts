// Primitive JSON-safe conversions shared by every API mapper.
//
// Representation decisions (deliberate, applied consistently):
//
// 1. Prisma Decimal -> JSON number. CRFIS monetary magnitudes sit well below
//    Number.MAX_SAFE_INTEGER (2^53); Decimal(18,2) could theoretically exceed
//    it (~1e16), which would silently lose cents. If such values ever become
//    real, switch these helpers to strings at ONE place - here - not in
//    routes or mappers.
// 2. Prisma DateTime -> ISO-8601 UTC string via Date#toISOString.
// 3. Nullable columns stay nullable in payloads; mappers never coerce
//    null/undefined into sentinel values like '' or 0.

interface DecimalLike {
  toNumber(): number
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
 */
export function decimalToString(value: MoneyInput): string {
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

  if (isDecimalLike(value) && typeof (value as { toString?: unknown }).toString === 'function') {
    const serialized = (value as { toString: () => string }).toString()

    if (!Number.isFinite(Number.parseFloat(serialized))) {
      throw new TypeError('Invalid decimal representation received from the database.')
    }

    return serialized
  }

  throw new TypeError('Invalid decimal representation received from the database.')
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

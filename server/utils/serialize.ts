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

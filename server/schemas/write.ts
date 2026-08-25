import { z } from 'zod'
import { SUPPORTED_CURRENCIES } from '../../src/types/money.js'

/*
 * Shared write-validation primitives for Phase 4 CRUD.
 *
 * Money: decimal STRINGS with at most 2 fraction digits, never negative,
 * never a JS number on the wire. Currency is REQUIRED everywhere - there
 * is no USD default in the application layer.
 */

export const CURRENCY_CODES = SUPPORTED_CURRENCIES

export const currencySchema = z.enum(SUPPORTED_CURRENCIES, {
  message: 'currency must be a supported ISO-4217 code (USD, INR, EUR, GBP, JPY).',
})

/** Decimal string with up to 2 fraction digits; rejects negatives/NaN/empty. */
export const moneyStringSchema = z
  .string({ message: 'Monetary amount is required as a decimal string.' })
  .trim()
  .regex(/^\d+(\.\d{1,2})?$/, {
    message:
      'Amount must be a non-negative decimal string with at most two fraction digits, e.g. "1250000.00".',
  })
  .refine((value) => Number.isFinite(Number.parseFloat(value)), {
    message: 'Amount must be a finite decimal value.',
  })

export const entityIdSchema = z
  .string()
  .trim()
  .min(2)
  .max(40)
  .regex(/^[A-Za-z0-9][A-Za-z0-9._-]*$/, {
    message: 'ID may contain letters, digits, dots, underscores and hyphens only.',
  })

export const dateInputSchema = z
  .string({ message: 'Date is required.' })
  .trim()
  .refine((value) => !Number.isNaN(new Date(value).getTime()), {
    message: 'Invalid date. Use an ISO-8601 date or timestamp.',
  })
  .transform((value) => new Date(value))

export const shortTextSchema = (label: string) =>
  z.string({ message: `${label} is required.` }).trim().min(1, `${label} is required.`).max(200)

export const optionalShortText = (max = 200) =>
  z.string().trim().max(max).optional()

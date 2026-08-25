import { SUPPORTED_CURRENCIES, type CurrencyCode } from '../types/money'

/*
 * Thin mutation client for the CRFIS write API.
 *
 * - GET reads stay in useApiResource; everything here is POST/PATCH/DELETE.
 * - Money is always sent as decimal STRINGS with an explicit currency code -
 *   never a JS number, never a conversion.
 * - The bearer token comes from operator configuration entered on the
 *   Settings page (localStorage). No token simply means the server answers
 *   401 for writes, which the UI surfaces honestly.
 */

const TOKEN_STORAGE_KEY = 'crfis-auth-token'

export function getStoredToken(): string {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY) ?? ''
  } catch {
    return ''
  }
}

export function setStoredToken(token: string): void {
  try {
    if (token === '') {
      localStorage.removeItem(TOKEN_STORAGE_KEY)
    } else {
      localStorage.setItem(TOKEN_STORAGE_KEY, token)
    }
  } catch {
    // Storage unavailable (private mode etc.) - writes will just 401.
  }
}

export interface ApiErrorDetail {
  path: string
  message: string
}

export class ApiError extends Error {
  readonly code: string
  readonly details?: unknown

  constructor(code: string, message: string, details?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.details = details
  }

  /** Flattens VALIDATION_ERROR details into per-field messages. */
  validationMessages(): ApiErrorDetail[] {
    if (!Array.isArray(this.details)) {
      return []
    }

    return this.details.filter(
      (entry): entry is ApiErrorDetail =>
        typeof entry === 'object' &&
        entry !== null &&
        typeof (entry as ApiErrorDetail).path === 'string' &&
        typeof (entry as ApiErrorDetail).message === 'string',
    )
  }
}

interface ErrorEnvelopeBody {
  error?: { code?: string; message?: string; details?: unknown }
}

export async function apiRequest<TResponse>(
  method: 'POST' | 'PATCH' | 'DELETE',
  url: string,
  body?: unknown,
): Promise<TResponse> {
  const headers: Record<string, string> = {}
  const token = getStoredToken()

  if (token !== '') {
    headers.authorization = `Bearer ${token}`
  }

  let payload: string | undefined

  if (body !== undefined) {
    headers['content-type'] = 'application/json'
    payload = JSON.stringify(body)
  }

  const response = await fetch(url, { method, headers, body: payload })

  let parsed: unknown
  try {
    parsed = await response.json()
  } catch {
    parsed = undefined
  }

  if (!response.ok) {
    const envelope = (parsed as ErrorEnvelopeBody | undefined)?.error

    throw new ApiError(
      envelope?.code ?? 'REQUEST_FAILED',
      envelope?.message ??
        (response.status === 401
          ? 'Authentication required. Configure an API access token in Settings.'
          : `Request failed with status ${response.status}.`),
      envelope?.details,
    )
  }

  return parsed as TResponse
}

/** Supported currency options shared by every money+currency form pair. */
export function currencyOptions(): Array<{ value: CurrencyCode; label: CurrencyCode }> {
  return SUPPORTED_CURRENCIES.map((code) => ({ value: code, label: code }))
}

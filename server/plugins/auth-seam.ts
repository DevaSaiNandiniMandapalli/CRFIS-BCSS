/*
 * CRFIS authentication seam - Phase 3K.
 *
 * This is an ARCHITECTURAL SEAM ONLY. There is no identity provider,
 * no session store, no credential handling, and no token validation.
 * Nothing in the codebase may claim that requests are authenticated.
 *
 * What exists:
 * - `crfisUser` request decoration (always null today) with a typed shape
 *   reserved for the future auth phase.
 * - `requireAuth`: a ready-made preHandler future protected routes will opt
 *   into once real authentication lands. It fails closed: without a real
 *   identity layer it rejects with 501 AUTH_NOT_IMPLEMENTED rather than
 *   pretending a request is authenticated.
 *
 * Current reality: every endpoint in this build is a development,
 * read-only endpoint served without authentication. Do not deploy as-is.
 */

export interface CrfisRequestUser {
  /** Stable user identifier from the future identity provider. */
  id: string
  /** Coarse role label (e.g. 'admin' | 'analyst' | 'viewer'). */
  role: string
  /** Fine-grained permissions resolved by the future authorization layer. */
  permissions: string[]
}

import type { FastifyInstance, FastifyRequest } from 'fastify'
import fp from 'fastify-plugin'
import { HttpError } from './error-handler.js'

declare module 'fastify' {
  interface FastifyRequest {
    crfisUser: CrfisRequestUser | null
  }
}

/**
 * PreHandler for FUTURE routes that must be protected. Intentionally
 * unusable today: there is no authentication mechanism that could populate
 * `crfisUser`, so this always rejects with 501.
 */
export async function requireAuth(request: FastifyRequest): Promise<void> {
  if (request.crfisUser === null) {
    throw new HttpError(
      501,
      'AUTH_NOT_IMPLEMENTED',
      'Authentication is not configured in this development build.',
    )
  }
}

export const authSeamPlugin = fp(
  async function authSeamPlugin(app: FastifyInstance): Promise<void> {
    app.decorateRequest<CrfisRequestUser | null>('crfisUser', null)
  },
  { name: 'auth-seam' },
)

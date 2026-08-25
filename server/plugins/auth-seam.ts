/*
 * CRFIS authentication seam - real boundary as of Phase 4.
 *
 * Identity model: operator-configured bearer tokens resolved from
 * CRFIS_AUTH_TOKENS (see server/auth/permissions.ts). Requests carrying a
 * valid token get a typed `crfisUser`; requests without one keep
 * `crfisUser === null`.
 *
 * - Read endpoints remain development-public by explicit decision.
 * - Every write route uses `requireAuth` plus `requirePermission(...)`
 *   from server/auth/guards.ts.
 * - Roles sent from clients are never trusted; role resolution happens
 *   here, server-side, from operator configuration only.
 */

export interface CrfisRequestUser {
  /** Stable user identifier from operator configuration. */
  id: string
  /** Coarse role label - resolved server-side, never trusted from input. */
  role: string
  /** Fine-grained permissions resolved by the central authorization layer. */
  permissions: string[]
  /** Opaque reference to the matched operator-configured credential. */
  authTokenId?: string
}

import type { FastifyInstance } from 'fastify'
import fp from 'fastify-plugin'
import { resolveToken } from '../auth/permissions.js'

declare module 'fastify' {
  interface FastifyRequest {
    crfisUser: CrfisRequestUser | null
  }
}

function extractBearerToken(authorization: string | undefined): string | undefined {
  if (!authorization) {
    return undefined
  }

  const [scheme, value] = authorization.split(' ')

  if (scheme?.toLowerCase() !== 'bearer' || !value) {
    return undefined
  }

  return value.trim()
}

export const authSeamPlugin = fp(
  async function authSeamPlugin(app: FastifyInstance): Promise<void> {
    app.decorateRequest<CrfisRequestUser | null>('crfisUser', null)

    app.addHook('onRequest', async (request) => {
      const token = extractBearerToken(request.headers.authorization)

      if (token === undefined) {
        request.crfisUser = null
        return
      }

      const user = resolveToken(token)

      if (!user) {
        // Explicit but invalid credentials must never fall through as
        // anonymous reads.
        throw Object.assign(new Error('Invalid API credentials.'), {
          statusCode: 401,
          code: 'AUTH_INVALID_TOKEN',
        })
      }

      request.crfisUser = user
    })
  },
  { name: 'auth-seam' },
)

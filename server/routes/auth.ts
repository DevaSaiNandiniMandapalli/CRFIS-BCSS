import type { FastifyInstance } from 'fastify'
import { sendSuccess } from '../utils/api-response.js'

/*
 * GET /api/auth/me - resolves the caller's identity from their bearer
 * token. Used by the frontend to display the active role and to let users
 * verify configured access.
 */

export async function authMeRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/auth/me', async (request, reply) => {
    const user = request.crfisUser

    if (!user) {
      return sendSuccess(reply, {
        authenticated: false,
        message:
          'No valid API credentials provided. Configure CRFIS_AUTH_TOKENS server-side and send a Bearer token for write access.',
      })
    }

    return sendSuccess(reply, {
      authenticated: true,
      id: user.id,
      role: user.role,
      permissions: user.permissions,
    })
  })
}

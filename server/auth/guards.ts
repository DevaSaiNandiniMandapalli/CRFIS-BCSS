import type { FastifyRequest } from 'fastify'
import { HttpError } from '../plugins/error-handler.js'

/*
 * Centralized authorization guards. Every write route composes:
 *
 *   preHandler: [requireAuth, requirePermission('assets:write')]
 *
 * Authorization is evaluated server-side from operator configuration;
 * client-supplied roles are never trusted.
 */

export function requireAuth(request: FastifyRequest): void {
  if (request.crfisUser === null) {
    throw new HttpError(
      401,
      'AUTH_REQUIRED',
      'Authentication required for this operation. Provide a valid bearer token.',
    )
  }
}

export function requirePermission(permission: string) {
  return function guard(request: FastifyRequest): void {
    requireAuth(request)

    const user = request.crfisUser!
    const allowed = user.permissions.includes('*') || user.permissions.includes(permission)

    if (!allowed) {
      throw new HttpError(
        403,
        'FORBIDDEN',
        `Role "${user.role}" does not permit ${permission}.`,
      )
    }
  }
}

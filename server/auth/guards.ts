import type { FastifyRequest } from 'fastify'
import { HttpError } from '../plugins/error-handler.js'

/*
 * Centralized authorization guards. Every write route composes:
 *
 *   preHandler: [requireAuth, requirePermission('assets:write')]
 *
 * Authorization is evaluated server-side from operator configuration;
 * client-supplied roles are never trusted.
 *
 * Both hooks MUST be async functions: Fastify never resumes the request
 * lifecycle after a synchronous preHandler/hook returns normally (the
 * guard body runs, but the handler is never reached and the request
 * hangs forever). Async guards always hand back a settled promise.
 */

export async function requireAuth(request: FastifyRequest): Promise<void> {
  if (request.crfisUser === null) {
    throw new HttpError(
      401,
      'AUTH_REQUIRED',
      'Authentication required for this operation. Provide a valid bearer token.',
    )
  }
}

export function requirePermission(permission: string) {
  return async function guard(request: FastifyRequest): Promise<void> {
    await requireAuth(request)

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

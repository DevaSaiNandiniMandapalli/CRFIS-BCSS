import type { FastifyError, FastifyInstance } from 'fastify'
import fp from 'fastify-plugin'
import { ZodError } from 'zod'
import { apiErrorBody } from '../utils/api-response.js'

// Central API error handling.
//
// Every failure leaves the API in the documented error envelope:
//   { "error": { "code": ..., "message": ..., "details"? } }
//
// Safety rules:
// - 4xx: the caller caused the problem, so a targeted message is safe.
// - 5xx: the response is ALWAYS the generic internal-server-error body;
//   the real cause (stack, driver text, connection details) goes to server
//   logs only. This holds in every environment, not just production.

export class HttpError extends Error {
  readonly statusCode: number
  readonly code: string
  readonly details?: unknown

  constructor(statusCode: number, code: string, message: string, details?: unknown) {
    super(message)
    this.name = 'HttpError'
    this.statusCode = statusCode
    this.code = code
    this.details = details
  }
}

interface ZodIssueSummary {
  path: string
  message: string
  code: string
}

function summarizeZodIssues(error: ZodError): ZodIssueSummary[] {
  return error.issues.map((issue) => ({
    path: issue.path.map((segment) => String(segment)).join('.'),
    message: issue.message,
    code: issue.code,
  }))
}

function isHttpStatusCode(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 400 && value <= 599
}

// fastify-plugin breaks Fastify's default encapsulation so the handlers
// apply to every route registered anywhere in the application, including
// future domain routes.
export const errorHandlingPlugin = fp(
  async function errorHandlingPlugin(app: FastifyInstance): Promise<void> {
  app.setErrorHandler((error: FastifyError, request, reply) => {
    if (error instanceof ZodError) {
      request.log.debug({ issues: error.issues }, 'Request validation failed')

      return reply
        .code(400)
        .send(apiErrorBody('VALIDATION_ERROR', 'Invalid request parameters.', summarizeZodIssues(error)))
    }

    if (error instanceof HttpError) {
      return reply.code(error.statusCode).send(apiErrorBody(error.code, error.message, error.details))
    }

    // Framework/driver errors carry a numeric statusCode (bad JSON bodies,
    // too-large payloads, etc.). Only trusted client-error messages are
    // forwarded verbatim.
    if (isHttpStatusCode(error.statusCode)) {
      if (error.statusCode < 500) {
        const code = typeof error.code === 'string' ? error.code : 'REQUEST_ERROR'

        return reply.code(error.statusCode).send(apiErrorBody(code, error.message))
      }

      request.log.error(error, 'Unhandled server error')

      return reply.code(500).send(apiErrorBody('INTERNAL_SERVER_ERROR', 'Internal server error.'))
    }

    request.log.error(error, 'Unhandled server error')

    return reply.code(500).send(apiErrorBody('INTERNAL_SERVER_ERROR', 'Internal server error.'))
  })

  app.setNotFoundHandler((request, reply) => {
    return reply
      .code(404)
      .send(apiErrorBody('NOT_FOUND', `Route ${request.method}:${request.url} not found.`))
  })
  },
  { name: 'error-handling' },
)

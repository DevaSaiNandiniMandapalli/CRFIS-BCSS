import type { FastifyReply } from 'fastify'
import type { PaginationMeta } from '../schemas/query.js'

// API response convention:
//
// success -> { "data": <payload>, "meta"?: <list metadata> }
// error   -> { "error": { "code": string, "message": string, "details"? } }
//
// GET /api/health is a documented exception: it keeps its flat, verified
// shape (status/api/database/timestamp) because uptime probes depend on it.

export interface ApiErrorBody {
  code: string
  message: string
  details?: unknown
}

export interface ApiSuccessBody<T> {
  data: T
  meta?: PaginationMeta & Record<string, unknown>
}

export function sendSuccess<T>(
  reply: FastifyReply,
  data: T,
  meta?: PaginationMeta & Record<string, unknown>,
): FastifyReply {
  const body: ApiSuccessBody<T> = meta === undefined ? { data } : { data, meta }

  return reply.code(200).send(body)
}

export function apiErrorBody(code: string, message: string, details?: unknown): { error: ApiErrorBody } {
  return details === undefined
    ? { error: { code, message } }
    : { error: { code, message, details } }
}

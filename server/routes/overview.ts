import type { FastifyInstance } from 'fastify'
import { buildOverview } from '../services/overview.js'
import { sendSuccess } from '../utils/api-response.js'

/*
 * GET /api/overview - executive aggregation across all domains.
 *
 * Read-only. Monetary families are per-currency buckets of exact decimal
 * strings; empty domains yield null so the UI can show honest unavailable
 * states instead of fabricated zeros.
 */

export async function overviewRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/overview', async (_request, reply) => {
    const data = await buildOverview()

    return sendSuccess(reply, data)
  })
}

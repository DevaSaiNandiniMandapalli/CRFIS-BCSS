import type { FastifyInstance } from 'fastify'
import { buildAnalysis } from '../services/analyst.js'
import { sendSuccess } from '../utils/api-response.js'

/*
 * GET /api/ai/analysis - deterministic, clearly-labelled analysis built
 * from live CRFIS database statistics. No external AI provider is
 * connected; nothing here represents model output.
 */

export async function aiRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/ai/analysis', async (_request, reply) => {
    const data = await buildAnalysis()

    return sendSuccess(reply, data)
  })
}

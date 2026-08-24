import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import {
  scenarioCategorySchema,
  scenarioSeveritySchema,
  scenarioStatusSchema,
} from '../schemas/domain.js'
import { listQuerySchema } from '../schemas/query.js'
import { getScenarioById, listScenarios } from '../services/scenarios.js'
import { sendSuccess } from '../utils/api-response.js'

/*
 * GET /api/scenarios      - filtered/paginated/sorted collection with
 *                           related Risk and Asset display entities.
 * GET /api/scenarios/:id  - single mapped scenario.
 */

export const scenarioListQuerySchema = listQuerySchema(
  'name',
  'severity',
  'probability',
  'estimatedImpact',
  'status',
).extend({
  search: z.string().trim().min(1).max(200).optional(),
  severity: scenarioSeveritySchema.optional(),
  status: scenarioStatusSchema.optional(),
  category: scenarioCategorySchema.optional(),
  probability: z.string().trim().min(1).max(50).optional(),
})

export async function scenarioRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/scenarios', async (request, reply) => {
    const query = scenarioListQuerySchema.parse(request.query)
    const result = await listScenarios(query)

    return sendSuccess(reply, result.data, result.meta)
  })

  app.get('/api/scenarios/:id', async (request, reply) => {
    const { id } = z.object({ id: z.string().min(1) }).parse(request.params)
    const scenario = await getScenarioById(id)

    return sendSuccess(reply, scenario)
  })
}

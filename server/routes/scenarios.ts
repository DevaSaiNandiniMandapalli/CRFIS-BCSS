import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import {
  scenarioCategorySchema,
  scenarioSeveritySchema,
  scenarioStatusSchema,
} from '../schemas/domain.js'
import { listQuerySchema } from '../schemas/query.js'
import {
  currencySchema,
  entityIdSchema,
  moneyStringSchema,
  shortTextSchema,
} from '../schemas/write.js'
import { requireAuth, requirePermission } from '../auth/guards.js'
import {
  getScenarioById,
  listScenarios,
  createScenario,
  updateScenario,
  archiveScenario,
} from '../services/scenarios.js'
import { sendSuccess } from '../utils/api-response.js'

/*
 * GET /api/scenarios      - filtered/paginated/sorted collection with
 *                           related Risk and Asset display entities.
 * GET /api/scenarios/:id  - single mapped scenario.
 *
 * Write endpoints require an authenticated user with scenarios:write.
 * Scenarios whose Risk or Asset is archived are hidden from reads.
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

export const scenarioCreateSchema = z.object({
  id: entityIdSchema,
  name: shortTextSchema('Name'),
  category: scenarioCategorySchema,
  description: shortTextSchema('Description'),
  riskId: entityIdSchema,
  assetId: entityIdSchema,
  severity: scenarioSeveritySchema,
  // Free-form bounded string, mirroring the existing frontend contract.
  probability: z.string().trim().min(1).max(50),
  currency: currencySchema,
  estimatedImpact: moneyStringSchema,
  businessImpact: shortTextSchema('Business impact'),
  status: scenarioStatusSchema,
  owner: shortTextSchema('Owner'),
})

export const scenarioUpdateSchema = scenarioCreateSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  { message: 'Provide at least one field to update.' },
)

const idParamsSchema = z.object({ id: entityIdSchema })

export async function scenarioRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/scenarios', async (request, reply) => {
    const query = scenarioListQuerySchema.parse(request.query)
    const result = await listScenarios(query)

    return sendSuccess(reply, result.data, result.meta)
  })

  app.get('/api/scenarios/:id', async (request, reply) => {
    const { id } = idParamsSchema.parse(request.params)
    const scenario = await getScenarioById(id)

    return sendSuccess(reply, scenario)
  })

  app.post(
    '/api/scenarios',
    { preHandler: [requireAuth, requirePermission('scenarios:write')] },
    async (request, reply) => {
      const input = scenarioCreateSchema.parse(request.body)
      const scenario = await createScenario(input)

      return sendSuccess(reply, scenario, undefined, 201)
    },
  )

  app.patch(
    '/api/scenarios/:id',
    { preHandler: [requireAuth, requirePermission('scenarios:write')] },
    async (request, reply) => {
      const { id } = idParamsSchema.parse(request.params)
      const input = scenarioUpdateSchema.parse(request.body)
      const scenario = await updateScenario(id, input)

      return sendSuccess(reply, scenario)
    },
  )

  app.delete(
    '/api/scenarios/:id',
    { preHandler: [requireAuth, requirePermission('scenarios:write')] },
    async (request, reply) => {
      const { id } = idParamsSchema.parse(request.params)
      // Soft-delete; the record leaves all visible read paths.
      const result = await archiveScenario(id)

      return sendSuccess(reply, result)
    },
  )
}

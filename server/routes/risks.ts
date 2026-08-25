import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import {
  riskCategorySchema,
  riskLikelihoodSchema,
  riskSeveritySchema,
  riskStatusSchema,
} from '../schemas/domain.js'
import { listQuerySchema } from '../schemas/query.js'
import {
  currencySchema,
  entityIdSchema,
  moneyStringSchema,
  shortTextSchema,
} from '../schemas/write.js'
import { requireAuth, requirePermission } from '../auth/guards.js'
import { getRiskById, createRisk, updateRisk, archiveRisk, listRisks } from '../services/risks.js'
import { sendSuccess } from '../utils/api-response.js'

/*
 * GET /api/risks        - filtered/paginated/sorted risk collection with
 *                         the related Asset display entity loaded through
 *                         Prisma relations.
 * GET /api/risks/:id    - single mapped risk including its Asset.
 *
 * Write endpoints require an authenticated user with risks:write. Risks
 * whose Asset is archived are hidden from every read path.
 */

export const riskListQuerySchema = listQuerySchema(
  'risk',
  'severity',
  'likelihood',
  'category',
  'exposure',
  'status',
  'lastUpdated',
).extend({
  search: z.string().trim().min(1).max(200).optional(),
  severity: riskSeveritySchema.optional(),
  status: riskStatusSchema.optional(),
  category: riskCategorySchema.optional(),
  likelihood: riskLikelihoodSchema.optional(),
})

export const riskCreateSchema = z.object({
  id: entityIdSchema,
  risk: shortTextSchema('Risk'),
  assetId: entityIdSchema,
  category: riskCategorySchema,
  severity: riskSeveritySchema,
  likelihood: riskLikelihoodSchema,
  currency: currencySchema,
  exposure: moneyStringSchema,
  status: riskStatusSchema,
  owner: shortTextSchema('Owner'),
})

export const riskUpdateSchema = riskCreateSchema
  .omit({ id: true })
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Provide at least one field to update.',
  })

const idParamsSchema = z.object({ id: entityIdSchema })

export async function riskRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/risks', async (request, reply) => {
    const query = riskListQuerySchema.parse(request.query)
    const result = await listRisks(query)

    return sendSuccess(reply, result.data, result.meta)
  })

  app.get('/api/risks/:id', async (request, reply) => {
    const { id } = idParamsSchema.parse(request.params)
    const risk = await getRiskById(id)

    return sendSuccess(reply, risk)
  })

  app.post(
    '/api/risks',
    { preHandler: [requireAuth, requirePermission('risks:write')] },
    async (request, reply) => {
      const input = riskCreateSchema.parse(request.body)
      const risk = await createRisk(input)

      return sendSuccess(reply, risk, undefined, 201)
    },
  )

  app.patch(
    '/api/risks/:id',
    { preHandler: [requireAuth, requirePermission('risks:write')] },
    async (request, reply) => {
      const { id } = idParamsSchema.parse(request.params)
      const input = riskUpdateSchema.parse(request.body)
      const risk = await updateRisk(id, input)

      return sendSuccess(reply, risk)
    },
  )

  app.delete(
    '/api/risks/:id',
    { preHandler: [requireAuth, requirePermission('risks:write')] },
    async (request, reply) => {
      const { id } = idParamsSchema.parse(request.params)
      // Soft-delete: remediations/scenarios/findings keep their references;
      // the record leaves all visible read paths.
      const result = await archiveRisk(id)

      return sendSuccess(reply, result)
    },
  )
}

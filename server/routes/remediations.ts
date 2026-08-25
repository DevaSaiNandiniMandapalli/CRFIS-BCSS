import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import {
  remediationCategorySchema,
  remediationPrioritySchema,
  remediationStatusSchema,
} from '../schemas/domain.js'
import { listQuerySchema } from '../schemas/query.js'
import {
  currencySchema,
  dateInputSchema,
  entityIdSchema,
  moneyStringSchema,
  shortTextSchema,
} from '../schemas/write.js'
import { requireAuth, requirePermission } from '../auth/guards.js'
import {
  getRemediationById,
  listRemediations,
  createRemediation,
  updateRemediation,
  archiveRemediation,
} from '../services/remediations.js'
import { sendSuccess } from '../utils/api-response.js'

/*
 * GET /api/remediations      - filtered/paginated/sorted collection with
 *                              related Risk and Asset display entities.
 * GET /api/remediations/:id  - single mapped remediation.
 *
 * Write endpoints require an authenticated user with remediations:write.
 * Remediations whose Risk or Asset is archived are hidden from reads.
 */

export const remediationListQuerySchema = listQuerySchema(
  'action',
  'priority',
  'dueDate',
  'estimatedCost',
  'expectedReduction',
  'status',
).extend({
  search: z.string().trim().min(1).max(200).optional(),
  priority: remediationPrioritySchema.optional(),
  status: remediationStatusSchema.optional(),
  category: remediationCategorySchema.optional(),
})

export const remediationCreateSchema = z.object({
  id: entityIdSchema,
  action: shortTextSchema('Action'),
  riskId: entityIdSchema,
  assetId: entityIdSchema,
  category: remediationCategorySchema,
  priority: remediationPrioritySchema,
  owner: shortTextSchema('Owner'),
  dueDate: dateInputSchema,
  status: remediationStatusSchema,
  currency: currencySchema,
  estimatedCost: moneyStringSchema,
  expectedReduction: moneyStringSchema,
})

export const remediationUpdateSchema = remediationCreateSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Provide at least one field to update.',
  })

const idParamsSchema = z.object({ id: entityIdSchema })

export async function remediationRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/remediations', async (request, reply) => {
    const query = remediationListQuerySchema.parse(request.query)
    const result = await listRemediations(query)

    return sendSuccess(reply, result.data, result.meta)
  })

  app.get('/api/remediations/:id', async (request, reply) => {
    const { id } = idParamsSchema.parse(request.params)
    const remediation = await getRemediationById(id)

    return sendSuccess(reply, remediation)
  })

  app.post(
    '/api/remediations',
    { preHandler: [requireAuth, requirePermission('remediations:write')] },
    async (request, reply) => {
      const input = remediationCreateSchema.parse(request.body)
      const remediation = await createRemediation(input)

      return sendSuccess(reply, remediation, undefined, 201)
    },
  )

  app.patch(
    '/api/remediations/:id',
    { preHandler: [requireAuth, requirePermission('remediations:write')] },
    async (request, reply) => {
      const { id } = idParamsSchema.parse(request.params)
      const input = remediationUpdateSchema.parse(request.body)
      const remediation = await updateRemediation(id, input)

      return sendSuccess(reply, remediation)
    },
  )

  app.delete(
    '/api/remediations/:id',
    { preHandler: [requireAuth, requirePermission('remediations:write')] },
    async (request, reply) => {
      const { id } = idParamsSchema.parse(request.params)
      // Soft-delete: findings keep their references; the record leaves all
      // visible read paths.
      const result = await archiveRemediation(id)

      return sendSuccess(reply, result)
    },
  )
}

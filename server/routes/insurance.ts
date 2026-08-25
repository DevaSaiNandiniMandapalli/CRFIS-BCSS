import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import {
  insuranceCoverageTypeSchema,
  insuranceStatusSchema,
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
  getPolicyById,
  listPolicies,
  createPolicy,
  updatePolicy,
  archivePolicy,
} from '../services/insurance.js'
import { sendSuccess } from '../utils/api-response.js'

/*
 * GET /api/insurance      - filtered/paginated/sorted policies with
 *                           join-table-resolved covered assets.
 * GET /api/insurance/:id  - single mapped policy.
 *
 * Write endpoints require an authenticated user with insurance:write.
 * Covered-asset join rows are only ever mutated transactionally together
 * with their owning policy.
 */

export const insuranceListQuerySchema = listQuerySchema(
  'policyNumber',
  'provider',
  'coverageType',
  'coverageLimit',
  'deductible',
  'expirationDate',
  'status',
).extend({
  search: z.string().trim().min(1).max(200).optional(),
  status: insuranceStatusSchema.optional(),
  coverageType: insuranceCoverageTypeSchema.optional(),
})

const coveredAssetsSchema = z
  .array(entityIdSchema)
  .max(200)

export const policyCreateSchema = z.object({
  id: entityIdSchema,
  policyNumber: shortTextSchema('Policy number'),
  provider: shortTextSchema('Provider'),
  coverageType: insuranceCoverageTypeSchema,
  currency: currencySchema,
  coverageLimit: moneyStringSchema,
  deductible: moneyStringSchema,
  premium: moneyStringSchema,
  expirationDate: dateInputSchema,
  status: insuranceStatusSchema,
  notes: z.string().trim().max(500).optional(),
  assetIds: coveredAssetsSchema,
})

export const policyUpdateSchema = z
  .object({
    policyNumber: shortTextSchema('Policy number').optional(),
    provider: shortTextSchema('Provider').optional(),
    coverageType: insuranceCoverageTypeSchema.optional(),
    currency: currencySchema.optional(),
    coverageLimit: moneyStringSchema.optional(),
    deductible: moneyStringSchema.optional(),
    premium: moneyStringSchema.optional(),
    expirationDate: dateInputSchema.optional(),
    status: insuranceStatusSchema.optional(),
    notes: z.string().trim().max(500).optional(),
    assetIds: coveredAssetsSchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Provide at least one field to update.',
  })

const idParamsSchema = z.object({ id: entityIdSchema })

export async function insuranceRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/insurance', async (request, reply) => {
    const query = insuranceListQuerySchema.parse(request.query)
    const result = await listPolicies(query)

    return sendSuccess(reply, result.data, result.meta)
  })

  app.get('/api/insurance/:id', async (request, reply) => {
    const { id } = idParamsSchema.parse(request.params)
    const policy = await getPolicyById(id)

    return sendSuccess(reply, policy)
  })

  app.post(
    '/api/insurance',
    { preHandler: [requireAuth, requirePermission('insurance:write')] },
    async (request, reply) => {
      const input = policyCreateSchema.parse(request.body)
      const policy = await createPolicy(input)

      return sendSuccess(reply, policy, undefined, 201)
    },
  )

  app.patch(
    '/api/insurance/:id',
    { preHandler: [requireAuth, requirePermission('insurance:write')] },
    async (request, reply) => {
      const { id } = idParamsSchema.parse(request.params)
      const input = policyUpdateSchema.parse(request.body)
      const policy = await updatePolicy(id, input)

      return sendSuccess(reply, policy)
    },
  )

  app.delete(
    '/api/insurance/:id',
    { preHandler: [requireAuth, requirePermission('insurance:write')] },
    async (request, reply) => {
      const { id } = idParamsSchema.parse(request.params)
      // Soft-delete; join rows are preserved so restoring the policy keeps
      // its historical coverage set intact.
      const result = await archivePolicy(id)

      return sendSuccess(reply, result)
    },
  )
}

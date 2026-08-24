import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import {
  insuranceCoverageTypeSchema,
  insuranceStatusSchema,
} from '../schemas/domain.js'
import { listQuerySchema } from '../schemas/query.js'
import { getPolicyById, listPolicies } from '../services/insurance.js'
import { sendSuccess } from '../utils/api-response.js'

/*
 * GET /api/insurance      - filtered/paginated/sorted policies with
 *                           join-table-resolved covered assets.
 * GET /api/insurance/:id  - single mapped policy.
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

export async function insuranceRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/insurance', async (request, reply) => {
    const query = insuranceListQuerySchema.parse(request.query)
    const result = await listPolicies(query)

    return sendSuccess(reply, result.data, result.meta)
  })

  app.get('/api/insurance/:id', async (request, reply) => {
    const { id } = z.object({ id: z.string().min(1) }).parse(request.params)
    const policy = await getPolicyById(id)

    return sendSuccess(reply, policy)
  })
}

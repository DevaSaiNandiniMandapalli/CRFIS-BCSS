import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import {
  riskCategorySchema,
  riskLikelihoodSchema,
  riskSeveritySchema,
  riskStatusSchema,
} from '../schemas/domain.js'
import { listQuerySchema } from '../schemas/query.js'
import { getRiskById, listRisks } from '../services/risks.js'
import { sendSuccess } from '../utils/api-response.js'

/*
 * GET /api/risks        - filtered/paginated/sorted risk collection with
 *                         the related Asset display entity loaded through
 *                         Prisma relations.
 * GET /api/risks/:id    - single mapped risk including its Asset.
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

export async function riskRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/risks', async (request, reply) => {
    const query = riskListQuerySchema.parse(request.query)
    const result = await listRisks(query)

    return sendSuccess(reply, result.data, result.meta)
  })

  app.get('/api/risks/:id', async (request, reply) => {
    const { id } = z.object({ id: z.string().min(1) }).parse(request.params)
    const risk = await getRiskById(id)

    return sendSuccess(reply, risk)
  })
}

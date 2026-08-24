import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import {
  remediationCategorySchema,
  remediationPrioritySchema,
  remediationStatusSchema,
} from '../schemas/domain.js'
import { listQuerySchema } from '../schemas/query.js'
import { getRemediationById, listRemediations } from '../services/remediations.js'
import { sendSuccess } from '../utils/api-response.js'

/*
 * GET /api/remediations      - filtered/paginated/sorted collection with
 *                              related Risk and Asset display entities.
 * GET /api/remediations/:id  - single mapped remediation.
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

export async function remediationRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/remediations', async (request, reply) => {
    const query = remediationListQuerySchema.parse(request.query)
    const result = await listRemediations(query)

    return sendSuccess(reply, result.data, result.meta)
  })

  app.get('/api/remediations/:id', async (request, reply) => {
    const { id } = z.object({ id: z.string().min(1) }).parse(request.params)
    const remediation = await getRemediationById(id)

    return sendSuccess(reply, remediation)
  })
}

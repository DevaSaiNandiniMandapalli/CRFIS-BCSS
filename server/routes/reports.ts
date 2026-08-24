import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { reportStatusSchema, reportTypeSchema } from '../schemas/domain.js'
import { listQuerySchema } from '../schemas/query.js'
import { getReportById, listReports } from '../services/reports.js'
import { sendSuccess } from '../utils/api-response.js'

/*
 * GET /api/reports      - stored report metadata (read-only).
 * GET /api/reports/:id  - single stored report.
 *
 * No generation infrastructure exists; this endpoint only exposes records
 * persisted in the database.
 */

export const reportListQuerySchema = listQuerySchema(
  'name',
  'type',
  'period',
  'status',
  'generatedAt',
).extend({
  search: z.string().trim().min(1).max(200).optional(),
  status: reportStatusSchema.optional(),
  type: reportTypeSchema.optional(),
})

export async function reportRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/reports', async (request, reply) => {
    const query = reportListQuerySchema.parse(request.query)
    const result = await listReports(query)

    return sendSuccess(reply, result.data, result.meta)
  })

  app.get('/api/reports/:id', async (request, reply) => {
    const { id } = z.object({ id: z.string().min(1) }).parse(request.params)
    const report = await getReportById(id)

    return sendSuccess(reply, report)
  })
}

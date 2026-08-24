import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { auditStatusSchema } from '../schemas/domain.js'
import { listQuerySchema } from '../schemas/query.js'
import {
  AUDIT_FINDING_SORT_WHITELIST,
  getAuditById,
  getAuditFindingById,
  listAuditFindings,
  listAudits,
} from '../services/audits.js'
import { sendSuccess } from '../utils/api-response.js'

/*
 * GET /api/audits                 - audits with relation-count findings.
 * GET /api/audits/:id             - single audit.
 * GET /api/audits/:id/findings    - findings scoped to one audit.
 */

export const auditListQuerySchema = listQuerySchema(
  'framework',
  'status',
  'owner',
  'dueDate',
).extend({
  search: z.string().trim().min(1).max(200).optional(),
  status: auditStatusSchema.optional(),
  framework: z.string().trim().min(1).max(100).optional(),
})

const idParamsSchema = z.object({ id: z.string().min(1) })

export const auditFindingListQuerySchema = listQuerySchema(...AUDIT_FINDING_SORT_WHITELIST).extend({
  search: z.string().trim().min(1).max(200).optional(),
  severity: z.string().trim().min(1).max(50).optional(),
  status: z.string().trim().min(1).max(50).optional(),
  owner: z.string().trim().min(1).max(100).optional(),
})

export async function auditRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/audits', async (request, reply) => {
    const query = auditListQuerySchema.parse(request.query)
    const result = await listAudits(query)

    return sendSuccess(reply, result.data, result.meta)
  })

  app.get('/api/audits/:id', async (request, reply) => {
    const { id } = idParamsSchema.parse(request.params)
    const audit = await getAuditById(id)

    return sendSuccess(reply, audit)
  })

  app.get('/api/audits/:id/findings', async (request, reply) => {
    const { id } = idParamsSchema.parse(request.params)
    const query = auditFindingListQuerySchema.parse(request.query)
    const result = await listAuditFindings({ ...query, auditId: id })

    return sendSuccess(reply, result.data, result.meta)
  })
}

/*
 * GET /api/audit-findings      - cross-audit findings list.
 * GET /api/audit-findings/:id  - single finding with relations.
 */
export async function auditFindingRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/audit-findings', async (request, reply) => {
    const query = auditFindingListQuerySchema.parse(request.query)
    const result = await listAuditFindings(query)

    return sendSuccess(reply, result.data, result.meta)
  })

  app.get('/api/audit-findings/:id', async (request, reply) => {
    const { id } = idParamsSchema.parse(request.params)
    const finding = await getAuditFindingById(id)

    return sendSuccess(reply, finding)
  })
}

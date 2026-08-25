import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { auditStatusSchema } from '../schemas/domain.js'
import { listQuerySchema } from '../schemas/query.js'
import {
  dateInputSchema,
  entityIdSchema,
  shortTextSchema,
} from '../schemas/write.js'
import { requireAuth, requirePermission } from '../auth/guards.js'
import {
  AUDIT_FINDING_SORT_WHITELIST,
  getAuditById,
  getAuditFindingById,
  listAuditFindings,
  listAudits,
  createAudit,
  updateAudit,
  archiveAudit,
  createAuditFinding,
  updateAuditFinding,
  archiveAuditFinding,
} from '../services/audits.js'
import { sendSuccess } from '../utils/api-response.js'

/*
 * GET /api/audits                 - audits with relation-count findings.
 * GET /api/audits/:id             - single audit.
 * GET /api/audits/:id/findings    - findings scoped to one audit.
 *
 * GET /api/audit-findings      - cross-audit findings list.
 * GET /api/audit-findings/:id  - single finding with relations.
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

export const auditFindingListQuerySchema = listQuerySchema(...AUDIT_FINDING_SORT_WHITELIST).extend({
  search: z.string().trim().min(1).max(200).optional(),
  severity: z.string().trim().min(1).max(50).optional(),
  status: z.string().trim().min(1).max(50).optional(),
  owner: z.string().trim().min(1).max(100).optional(),
})

const idParamsSchema = z.object({ id: entityIdSchema })

/*
 * Governance writes require an authenticated user with audits:write.
 * Findings are real records with their own lifecycle - never flattened
 * into the audit's computed findings count.
 */

export const auditCreateSchema = z.object({
  id: entityIdSchema,
  framework: shortTextSchema('Framework'),
  scope: shortTextSchema('Scope'),
  status: auditStatusSchema,
  owner: shortTextSchema('Owner'),
  dueDate: dateInputSchema,
})

export const auditUpdateSchema = auditCreateSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  { message: 'Provide at least one field to update.' },
)

// Finding severity/status are free-form bounded strings, mirroring the
// existing read contract for findings.
const findingText = z.string().trim().min(1).max(50)

export const auditFindingCreateSchema = z.object({
  id: entityIdSchema,
  auditId: entityIdSchema,
  riskId: entityIdSchema.nullish(),
  remediationId: entityIdSchema.nullish(),
  description: shortTextSchema('Description'),
  severity: findingText,
  status: findingText,
  owner: shortTextSchema('Owner'),
  dueDate: dateInputSchema,
})

export const auditFindingUpdateSchema = z
  .object({
    auditId: entityIdSchema.optional(),
    riskId: entityIdSchema.nullish(),
    remediationId: entityIdSchema.nullish(),
    description: shortTextSchema('Description').optional(),
    severity: findingText.optional(),
    status: findingText.optional(),
    owner: shortTextSchema('Owner').optional(),
    dueDate: dateInputSchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Provide at least one field to update.',
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

  // Governance writes (Phase 4).
  app.post(
    '/api/audits',
    { preHandler: [requireAuth, requirePermission('audits:write')] },
    async (request, reply) => {
      const input = auditCreateSchema.parse(request.body)
      const audit = await createAudit(input)

      return sendSuccess(reply, audit, undefined, 201)
    },
  )

  app.patch(
    '/api/audits/:id',
    { preHandler: [requireAuth, requirePermission('audits:write')] },
    async (request, reply) => {
      const { id } = idParamsSchema.parse(request.params)
      const input = auditUpdateSchema.parse(request.body)
      const audit = await updateAudit(id, input)

      return sendSuccess(reply, audit)
    },
  )

  app.delete(
    '/api/audits/:id',
    { preHandler: [requireAuth, requirePermission('audits:write')] },
    async (request, reply) => {
      const { id } = idParamsSchema.parse(request.params)
      // Soft-delete; findings keep their references but leave visible
      // read paths together with their parent audit.
      const result = await archiveAudit(id)

      return sendSuccess(reply, result)
    },
  )
}

/*
 * Cross-audit findings read + write API.
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

  // Finding writes (Phase 4).
  app.post(
    '/api/audit-findings',
    { preHandler: [requireAuth, requirePermission('audits:write')] },
    async (request, reply) => {
      const input = auditFindingCreateSchema.parse(request.body)
      const finding = await createAuditFinding(input)

      return sendSuccess(reply, finding, undefined, 201)
    },
  )

  app.patch(
    '/api/audit-findings/:id',
    { preHandler: [requireAuth, requirePermission('audits:write')] },
    async (request, reply) => {
      const { id } = idParamsSchema.parse(request.params)
      const input = auditFindingUpdateSchema.parse(request.body)
      const finding = await updateAuditFinding(id, input)

      return sendSuccess(reply, finding)
    },
  )

  app.delete(
    '/api/audit-findings/:id',
    { preHandler: [requireAuth, requirePermission('audits:write')] },
    async (request, reply) => {
      const { id } = idParamsSchema.parse(request.params)
      const result = await archiveAuditFinding(id)

      return sendSuccess(reply, result)
    },
  )
}

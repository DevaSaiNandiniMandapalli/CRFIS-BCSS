import { HttpError } from '../plugins/error-handler.js'
import {
  getAuditById as findAuditById,
  getAuditStats,
  listAudits as fetchAudits,
  createAudit as repoCreateAudit,
  updateAudit as repoUpdateAudit,
  archiveAudit as repoArchiveAudit,
  auditIdExists,
  type AuditStats,
} from '../repositories/audits.js'
import {
  getAuditFindingById as findFindingById,
  listAuditFindings as fetchFindings,
  createAuditFinding as repoCreateAuditFinding,
  updateAuditFinding as repoUpdateAuditFinding,
  deleteAuditFinding as repoDeleteAuditFinding,
  auditFindingIdExists,
} from '../repositories/audit-findings.js'
import { getRiskById } from './risks.js'
import { getRemediationById } from './remediations.js'
import { mapAudit, mapAuditFinding, type MappedAudit, type MappedAuditFinding } from '../utils/mappers.js'
import { buildPaginationMeta } from '../schemas/query.js'

/*
 * Audit service: audits expose their findings count via the Prisma
 * relation aggregate; findings are readable per audit or across audits.
 */

export const AUDIT_SORT_WHITELIST = [
  'framework',
  'status',
  'owner',
  'dueDate',
] as const

export type AuditSortField = (typeof AUDIT_SORT_WHITELIST)[number]

export const DEFAULT_AUDIT_SORT: AuditSortField = 'dueDate'

export interface AuditListQuery {
  page: number
  pageSize: number
  sort?: string
  order: 'asc' | 'desc'
  search?: string
  status?: string
  framework?: string
}

export interface AuditListResult {
  data: MappedAudit[]
  meta: ReturnType<typeof buildPaginationMeta> & { stats: AuditStats }
}

export async function listAudits(query: AuditListQuery): Promise<AuditListResult> {
  const filters = {
    search: query.search,
    status: query.status,
    framework: query.framework,
  }

  const sortBy = query.sort ?? DEFAULT_AUDIT_SORT

  const [{ rows, total }, stats] = await Promise.all([
    fetchAudits({ filters, page: query.page, pageSize: query.pageSize, sortBy, order: query.order }),
    getAuditStats(filters),
  ])

  return {
    data: rows.map(mapAudit),
    meta: {
      ...buildPaginationMeta(total, query.page, query.pageSize),
      stats,
    },
  }
}

export async function getAuditById(id: string): Promise<MappedAudit> {
  const audit = await findAuditById(id)

  if (!audit) {
    throw new HttpError(404, 'AUDIT_NOT_FOUND', `Audit "${id}" was not found.`)
  }

  return mapAudit(audit)
}

export interface AuditFindingListQuery {
  page: number
  pageSize: number
  sort?: string
  order: 'asc' | 'desc'
  search?: string
  severity?: string
  status?: string
  owner?: string
  /** Scoped to one audit when provided. */
  auditId?: string
}

const FINDING_SORT_WHITELIST = [
  'severity',
  'status',
  'owner',
  'dueDate',
] as const

export const AUDIT_FINDING_SORT_WHITELIST = FINDING_SORT_WHITELIST

export const DEFAULT_FINDING_SORT: (typeof FINDING_SORT_WHITELIST)[number] = 'dueDate'

export interface AuditFindingListResult {
  data: MappedAuditFinding[]
  meta: ReturnType<typeof buildPaginationMeta>
}

export async function listAuditFindings(
  query: AuditFindingListQuery,
): Promise<AuditFindingListResult> {
  const filters = {
    search: query.search,
    severity: query.severity,
    status: query.status,
    owner: query.owner,
    auditId: query.auditId,
  }

  const sortBy = query.sort ?? DEFAULT_FINDING_SORT

  const { rows, total } = await fetchFindings({
    filters,
    page: query.page,
    pageSize: query.pageSize,
    sortBy,
    order: query.order,
  })

  return {
    data: rows.map(mapAuditFinding),
    meta: buildPaginationMeta(total, query.page, query.pageSize),
  }
}

export async function getAuditFindingById(id: string): Promise<MappedAuditFinding> {
  const finding = await findFindingById(id)

  if (!finding) {
    throw new HttpError(
      404,
      'AUDIT_FINDING_NOT_FOUND',
      `Audit finding "${id}" was not found.`,
    )
  }

  return mapAuditFinding(finding)
}

/* =====================
   Write operations (Phase 4)
===================== */

export interface AuditCreateInput {
  id: string
  framework: string
  scope: string
  status: string
  owner: string
  dueDate: Date
}

export async function createAudit(input: AuditCreateInput): Promise<MappedAudit> {
  if (await auditIdExists(input.id)) {
    throw new HttpError(409, 'ID_ALREADY_EXISTS', `Audit "${input.id}" already exists.`)
  }

  const created = await repoCreateAudit({ ...input })

  return getAuditById(created.id)
}

export interface AuditUpdateInput {
  framework?: string
  scope?: string
  status?: string
  owner?: string
  dueDate?: Date
}

export async function updateAudit(id: string, input: AuditUpdateInput): Promise<MappedAudit> {
  const updated = await repoUpdateAudit(id, { ...input })

  if (updated === 0) {
    throw new HttpError(404, 'AUDIT_NOT_FOUND', `Audit "${id}" was not found.`)
  }

  return getAuditById(id)
}

export async function archiveAudit(id: string): Promise<{ id: string; archived: true }> {
  const archived = await repoArchiveAudit(id)

  if (!archived) {
    throw new HttpError(404, 'AUDIT_NOT_FOUND', `Audit "${id}" was not found.`)
  }

  return { id, archived: true }
}

/* =====================
   Audit finding writes (Phase 4). Findings are real records - never
   flattened into the audit's computed findings count.
===================== */

export interface AuditFindingCreateInput {
  id: string
  auditId: string
  riskId?: string | null
  remediationId?: string | null
  description: string
  severity: string
  status: string
  owner: string
  dueDate: Date
}

/**
 * Validates that a referenced Risk resolves on the visible (non-archived)
 * read path when supplied.
 */
async function assertRiskAvailable(riskId: string): Promise<void> {
  try {
    await getRiskById(riskId)
  } catch {
    throw new HttpError(404, 'RISK_NOT_FOUND', `Risk "${riskId}" was not found.`)
  }
}

/** Validates an optional Remediation reference when supplied. */
async function assertRemediationAvailable(remediationId: string): Promise<void> {
  try {
    await getRemediationById(remediationId)
  } catch {
    throw new HttpError(
      404,
      'REMEDIATION_NOT_FOUND',
      `Remediation "${remediationId}" was not found.`,
    )
  }
}

export async function createAuditFinding(
  input: AuditFindingCreateInput,
): Promise<MappedAuditFinding> {
  if (await auditFindingIdExists(input.id)) {
    throw new HttpError(
      409,
      'ID_ALREADY_EXISTS',
      `Audit finding "${input.id}" already exists.`,
    )
  }

  // Required parent must be visible; optional relations are validated only
  // when actually supplied.
  await getAuditById(input.auditId)

  if (input.riskId !== undefined && input.riskId !== null) {
    await assertRiskAvailable(input.riskId)
  }

  if (input.remediationId !== undefined && input.remediationId !== null) {
    await assertRemediationAvailable(input.remediationId)
  }

  const created = await repoCreateAuditFinding({ ...input })

  return getAuditFindingById(created.id)
}

export interface AuditFindingUpdateInput {
  auditId?: string
  riskId?: string | null
  remediationId?: string | null
  description?: string
  severity?: string
  status?: string
  owner?: string
  dueDate?: Date
}

export async function updateAuditFinding(
  id: string,
  input: AuditFindingUpdateInput,
): Promise<MappedAuditFinding> {
  if (input.auditId !== undefined) {
    await getAuditById(input.auditId)
  }

  if (input.riskId !== undefined && input.riskId !== null) {
    await assertRiskAvailable(input.riskId)
  }

  if (input.remediationId !== undefined && input.remediationId !== null) {
    await assertRemediationAvailable(input.remediationId)
  }

  const updated = await repoUpdateAuditFinding(id, { ...input })

  if (updated === 0) {
    throw new HttpError(
      404,
      'AUDIT_FINDING_NOT_FOUND',
      `Audit finding "${id}" was not found.`,
    )
  }

  return getAuditFindingById(id)
}

export async function archiveAuditFinding(
  id: string,
): Promise<{ id: string; deleted: true }> {
  // AuditFinding has no archived column in the schema - removal is
  // physical, and the audit's computed findings count updates immediately.
  const deleted = await repoDeleteAuditFinding(id)

  if (!deleted) {
    throw new HttpError(
      404,
      'AUDIT_FINDING_NOT_FOUND',
      `Audit finding "${id}" was not found.`,
    )
  }

  return { id, deleted: true }
}

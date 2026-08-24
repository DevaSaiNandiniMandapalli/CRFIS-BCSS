import { HttpError } from '../plugins/error-handler.js'
import {
  getAuditById as findAuditById,
  getAuditStats,
  listAudits as fetchAudits,
  type AuditStats,
} from '../repositories/audits.js'
import {
  getAuditFindingById as findFindingById,
  listAuditFindings as fetchFindings,
} from '../repositories/audit-findings.js'
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

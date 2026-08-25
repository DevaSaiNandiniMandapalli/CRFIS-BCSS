import { prisma } from './prisma.js'
import type { Prisma, Audit } from '../../src/generated/prisma/client.js'

/*
 * Thin data-access layer for Audits. The findings number is ALWAYS the
 * relation count via _count - never a stored scalar.
 */

export interface AuditFilters {
  search?: string
  status?: string
  framework?: string
}

export interface AuditListParams {
  filters: AuditFilters
  page: number
  pageSize: number
  /** Whitelist-validated column name. */
  sortBy: string
  order: 'asc' | 'desc'
}

export type AuditWithCount = Audit & { _count: { findings: number } }

export interface AuditStats {
  byStatus: Record<string, number>
  /** Findings across all audits matching the audit-level filters. */
  findingsTotal: number
  highCriticalFindings: number
}

// The findings number is ALWAYS the relation count via _count - never a
// stored scalar. (AuditFinding has no archived flag; the count tracks the
// table directly.)
const FINDINGS_COUNT = { _count: { select: { findings: true } } } as const

function buildWhere(filters: AuditFilters): Prisma.AuditWhereInput {
  const where: Prisma.AuditWhereInput = {}

  // Soft-deleted records are excluded from every read path.
  where.archived = false

  if (filters.status !== undefined) {
    where.status = filters.status
  }

  if (filters.framework !== undefined) {
    where.framework = filters.framework
  }

  if (filters.search) {
    const needle = { contains: filters.search, mode: 'insensitive' as const }

    where.OR = [
      { id: needle },
      { framework: needle },
      { scope: needle },
      { owner: needle },
    ]
  }

  return where
}

function buildOrderBy(sortBy: string, order: 'asc' | 'desc'): Prisma.AuditOrderByWithRelationInput {
  return { [sortBy]: order }
}

export async function listAudits(
  params: AuditListParams,
): Promise<{ rows: AuditWithCount[]; total: number }> {
  const where = buildWhere(params.filters)
  const orderBy = buildOrderBy(params.sortBy, params.order)

  const [rows, total] = await prisma.$transaction([
    prisma.audit.findMany({
      where,
      orderBy,
      include: FINDINGS_COUNT,
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
    }),
    prisma.audit.count({ where }),
  ])

  return { rows: rows as AuditWithCount[], total }
}

export async function getAuditById(id: string): Promise<AuditWithCount | null> {
  const audit = await prisma.audit.findFirst({
    where: { id, archived: false },
    include: FINDINGS_COUNT,
  })

  return (audit as AuditWithCount | null) ?? null
}

/* =====================
   Write operations (Phase 4). Soft-delete via the archived flag.
===================== */

export async function createAudit(data: Prisma.AuditUncheckedCreateInput): Promise<Audit> {
  return prisma.audit.create({ data })
}

/** Returns the number of rows updated; 0 means the audit does not exist. */
export async function updateAudit(
  id: string,
  data: Prisma.AuditUncheckedUpdateInput,
): Promise<number> {
  const result = await prisma.audit.updateMany({
    where: { id, archived: false },
    data,
  })

  return result.count
}

/** Soft-deletes by flagging archived. Returns false when not found. */
export async function archiveAudit(id: string): Promise<boolean> {
  const result = await prisma.audit.updateMany({
    where: { id, archived: false },
    data: { archived: true },
  })

  return result.count > 0
}

export async function auditIdExists(id: string): Promise<boolean> {
  // Duplicate detection must consider archived rows too - IDs stay unique
  // across the whole table, including soft-deleted records.
  const found = await prisma.audit.findUnique({ where: { id }, select: { id: true } })

  return found !== null
}

export async function getAuditStats(filters: AuditFilters): Promise<AuditStats> {
  const where = buildWhere(filters)

  const [byStatus, findingsTotal, highCriticalFindings] = await prisma.$transaction([
    prisma.audit.groupBy({ by: ['status'], where, _count: { _all: true } }),
    prisma.auditFinding.count({ where: { audit: where } }),
    prisma.auditFinding.count({
      where: { audit: where, severity: { in: ['High', 'Critical'] } },
    }),
  ])

  const statusCounts: Record<string, number> = {}
  for (const row of byStatus) {
    statusCounts[row.status] = row._count._all
  }

  return { byStatus: statusCounts, findingsTotal, highCriticalFindings }
}

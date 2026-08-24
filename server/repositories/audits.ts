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

const FINDINGS_COUNT = { _count: { select: { findings: true } } } as const

function buildWhere(filters: AuditFilters): Prisma.AuditWhereInput {
  const where: Prisma.AuditWhereInput = {}

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
  const audit = await prisma.audit.findUnique({
    where: { id },
    include: FINDINGS_COUNT,
  })

  return (audit as AuditWithCount | null) ?? null
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

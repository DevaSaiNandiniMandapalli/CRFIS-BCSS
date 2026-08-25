import { prisma } from './prisma.js'
import type { Prisma, Remediation } from '../../src/generated/prisma/client.js'

/*
 * Thin data-access layer for Remediations. Query construction only - no
 * HTTP logic, no UI concerns, no financial calculations.
 */

export interface RemediationFilters {
  search?: string
  priority?: string
  status?: string
  category?: string
}

export interface RemediationListParams {
  filters: RemediationFilters
  page: number
  pageSize: number
  /** Whitelist-validated column name. */
  sortBy: string
  order: 'asc' | 'desc'
}

export type RemediationWithRelations = Remediation & {
  risk: { id: string; risk: string }
  asset: { id: string; name: string }
}

export interface RemediationStats {
  byPriority: Record<string, number>
  byStatus: Record<string, number>
  /** Per-currency sums as decimal strings - currencies are never mixed. */
  expectedReductionByCurrency: Record<string, string>
  estimatedCostByCurrency: Record<string, string>
  overdueCount: number
}

const RELATION_SELECT = {
  risk: { select: { id: true, risk: true } },
  asset: { select: { id: true, name: true } },
} as const

function buildWhere(filters: RemediationFilters): Prisma.RemediationWhereInput {
  const where: Prisma.RemediationWhereInput = {}

  // Soft-deleted records are excluded from every read path.
  where.archived = false

  // A remediation whose Risk or Asset has been archived is hidden from
  // normal reads as well - the relationships stay intact but the record
  // leaves every visible surface until its parents are restored.
  where.risk = { is: { archived: false } }
  where.asset = { is: { archived: false } }

  const equality = {
    priority: filters.priority,
    status: filters.status,
    category: filters.category,
  }

  for (const [field, value] of Object.entries(equality)) {
    if (value !== undefined) {
      where[field as 'priority' | 'status' | 'category'] = value
    }
  }

  if (filters.search) {
    const needle = { contains: filters.search, mode: 'insensitive' as const }

    where.OR = [
      { action: needle },
      { owner: needle },
      { category: needle },
      { risk: { is: { archived: false, risk: needle } } },
      { asset: { is: { archived: false, name: needle } } },
    ]
  }

  return where
}

function buildOrderBy(
  sortBy: string,
  order: 'asc' | 'desc',
): Prisma.RemediationOrderByWithRelationInput {
  return { [sortBy]: order }
}

export async function listRemediations(
  params: RemediationListParams,
): Promise<{ rows: RemediationWithRelations[]; total: number }> {
  const where = buildWhere(params.filters)
  const orderBy = buildOrderBy(params.sortBy, params.order)

  const [rows, total] = await prisma.$transaction([
    prisma.remediation.findMany({
      where,
      orderBy,
      include: RELATION_SELECT,
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
    }),
    prisma.remediation.count({ where }),
  ])

  return { rows: rows as RemediationWithRelations[], total }
}

export async function getRemediationById(id: string): Promise<RemediationWithRelations | null> {
  const remediation = await prisma.remediation.findFirst({
    where: { id, archived: false, risk: { is: { archived: false } }, asset: { is: { archived: false } } },
    include: RELATION_SELECT,
  })

  return (remediation as RemediationWithRelations | null) ?? null
}

/* =====================
   Write operations (Phase 4). Soft-delete via the archived flag.
===================== */

export async function createRemediation(
  data: Prisma.RemediationUncheckedCreateInput,
): Promise<Remediation> {
  return prisma.remediation.create({ data })
}

/** Returns the number of rows updated; 0 means the record does not exist. */
export async function updateRemediation(
  id: string,
  data: Prisma.RemediationUncheckedUpdateInput,
): Promise<number> {
  const result = await prisma.remediation.updateMany({
    where: { id, archived: false },
    data,
  })

  return result.count
}

/** Soft-deletes by flagging archived. Returns false when not found. */
export async function archiveRemediation(id: string): Promise<boolean> {
  const result = await prisma.remediation.updateMany({
    where: { id, archived: false },
    data: { archived: true },
  })

  return result.count > 0
}

export async function remediationIdExists(id: string): Promise<boolean> {
  // Duplicate detection must consider archived rows too - IDs stay unique
  // across the whole table, including soft-deleted records.
  const found = await prisma.remediation.findUnique({ where: { id }, select: { id: true } })

  return found !== null
}

/**
 * Filter-scoped aggregate statistics for the KPI strip. Monetary sums are
 * grouped BY currency so mixed-currency datasets never combine silently.
 * `overdueAsOf` defines the cutoff for the overdue KPI (dueDate before the
 * timestamp and not Completed).
 */
export async function getRemediationStats(
  filters: RemediationFilters,
  overdueAsOf: Date,
): Promise<RemediationStats> {
  const where = buildWhere(filters)

  const [byPriority, byStatus, reductionSums, costSums, overdueCount] = await prisma.$transaction([
    prisma.remediation.groupBy({ by: ['priority'], where, _count: { _all: true } }),
    prisma.remediation.groupBy({ by: ['status'], where, _count: { _all: true } }),
    prisma.remediation.groupBy({ by: ['currency'], where, _sum: { expectedReduction: true } }),
    prisma.remediation.groupBy({ by: ['currency'], where, _sum: { estimatedCost: true } }),
    prisma.remediation.count({
      where: {
        ...where,
        dueDate: { lt: overdueAsOf },
        status: { not: 'Completed' },
      },
    }),
  ])

  const priorityCounts: Record<string, number> = {}
  for (const row of byPriority) {
    priorityCounts[row.priority] = row._count._all
  }

  const statusCounts: Record<string, number> = {}
  for (const row of byStatus) {
    statusCounts[row.status] = row._count._all
  }

  const expectedReductionByCurrency: Record<string, string> = {}
  for (const row of reductionSums) {
    expectedReductionByCurrency[row.currency] = row._sum.expectedReduction?.toString() ?? '0'
  }

  const estimatedCostByCurrency: Record<string, string> = {}
  for (const row of costSums) {
    estimatedCostByCurrency[row.currency] = row._sum.estimatedCost?.toString() ?? '0'
  }

  return {
    byPriority: priorityCounts,
    byStatus: statusCounts,
    expectedReductionByCurrency,
    estimatedCostByCurrency,
    overdueCount,
  }
}

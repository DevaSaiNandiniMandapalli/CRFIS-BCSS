import { prisma } from './prisma.js'
import type { Prisma, Risk } from '../../src/generated/prisma/client.js'

/*
 * Thin data-access layer for Risks. The Asset display relationship is
 * loaded through Prisma relations - never assembled from client data.
 */

export interface RiskFilters {
  search?: string
  severity?: string
  status?: string
  category?: string
  likelihood?: string
}

export interface RiskListParams {
  filters: RiskFilters
  page: number
  pageSize: number
  /** Whitelist-validated column name. */
  sortBy: string
  order: 'asc' | 'desc'
}

export type RiskWithAsset = Risk & { asset: { id: string; name: string } }

export interface RiskStats {
  bySeverity: Record<string, number>
  byStatus: Record<string, number>
  /** Per-currency sums as decimal strings - currencies are never mixed. */
  exposureByCurrency: Record<string, string>
}

const ASSET_DISPLAY_SELECT = { select: { id: true, name: true } } as const

function buildWhere(filters: RiskFilters): Prisma.RiskWhereInput {
  const where: Prisma.RiskWhereInput = {}

  // Soft-deleted records are excluded from every read path.
  where.archived = false

  const equality = {
    severity: filters.severity,
    status: filters.status,
    category: filters.category,
    likelihood: filters.likelihood,
  }

  for (const [field, value] of Object.entries(equality)) {
    if (value !== undefined) {
      where[field as 'severity' | 'status' | 'category' | 'likelihood'] = value
    }
  }

  if (filters.search) {
    const needle = { contains: filters.search, mode: 'insensitive' as const }

    where.OR = [
      { risk: needle },
      { category: needle },
      { owner: needle },
      { asset: { is: { name: needle } } },
    ]
  }

  return where
}

function buildOrderBy(sortBy: string, order: 'asc' | 'desc'): Prisma.RiskOrderByWithRelationInput {
  return { [sortBy]: order }
}

export async function listRisks(
  params: RiskListParams,
): Promise<{ rows: RiskWithAsset[]; total: number }> {
  const where = buildWhere(params.filters)
  const orderBy = buildOrderBy(params.sortBy, params.order)

  const [rows, total] = await prisma.$transaction([
    prisma.risk.findMany({
      where,
      orderBy,
      include: { asset: ASSET_DISPLAY_SELECT },
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
    }),
    prisma.risk.count({ where }),
  ])

  return { rows: rows as RiskWithAsset[], total }
}

export async function getRiskById(id: string): Promise<RiskWithAsset | null> {
  const risk = await prisma.risk.findFirst({
    where: { id, archived: false },
    include: { asset: ASSET_DISPLAY_SELECT },
  })

  return (risk as RiskWithAsset | null) ?? null
}

/**
 * Filter-scoped aggregate statistics for the KPI strip. Exposure sums are
 * grouped BY currency so mixed-currency datasets never combine silently.
 */
export async function getRiskStats(filters: RiskFilters): Promise<RiskStats> {
  const where = buildWhere(filters)

  const [bySeverity, byStatus, sumsByCurrency] = await prisma.$transaction([
    prisma.risk.groupBy({ by: ['severity'], where, _count: { _all: true } }),
    prisma.risk.groupBy({ by: ['status'], where, _count: { _all: true } }),
    prisma.risk.groupBy({ by: ['currency'], where, _sum: { exposure: true } }),
  ])

  const severityCounts: Record<string, number> = {}
  for (const row of bySeverity) {
    severityCounts[row.severity] = row._count._all
  }

  const statusCounts: Record<string, number> = {}
  for (const row of byStatus) {
    statusCounts[row.status] = row._count._all
  }

  const exposureByCurrency: Record<string, string> = {}
  for (const row of sumsByCurrency) {
    exposureByCurrency[row.currency] = row._sum.exposure?.toString() ?? '0'
  }

  return { bySeverity: severityCounts, byStatus: statusCounts, exposureByCurrency }
}

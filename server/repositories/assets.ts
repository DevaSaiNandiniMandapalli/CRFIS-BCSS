import { prisma } from './prisma.js'
import type { Prisma } from '../../src/generated/prisma/client.js'
import type { Asset } from '../../src/generated/prisma/client.js'

/*
 * Thin data-access layer for Assets. Query shaping only - no mapping,
 * no business rules, no HTTP concerns.
 */

export interface AssetFilters {
  search?: string
  criticality?: string
  status?: string
  type?: string
}

export interface AssetListParams {
  filters: AssetFilters
  page: number
  pageSize: number
  /** Whitelist-validated column name. */
  sortBy: string
  order: 'asc' | 'desc'
}

export interface AssetStats {
  byCriticality: Record<string, number>
  byStatus: Record<string, number>
  /** Per-currency sums as decimal strings - currencies are never mixed. */
  annualValueByCurrency: Record<string, string>
  highValueCount: number
}

/** UI presentation threshold for the "High Value" KPI card. */
export const HIGH_VALUE_THRESHOLD = 1_000_000

function buildWhere(filters: AssetFilters): Prisma.AssetWhereInput {
  const where: Prisma.AssetWhereInput = {}

  // Soft-deleted records are excluded from every read path.
  where.archived = false

  const equality = {
    criticality: filters.criticality,
    status: filters.status,
    type: filters.type,
  }

  for (const [field, value] of Object.entries(equality)) {
    if (value !== undefined) {
      where[field as 'criticality' | 'status' | 'type'] = value
    }
  }

  if (filters.search) {
    const needle = { contains: filters.search, mode: 'insensitive' as const }

    where.OR = [
      { name: needle },
      { businessUnit: needle },
      { owner: needle },
      { type: needle },
    ]
  }

  return where
}

function buildOrderBy(sortBy: string, order: 'asc' | 'desc'): Prisma.AssetOrderByWithRelationInput {
  return { [sortBy]: order }
}

export async function listAssets(
  params: AssetListParams,
): Promise<{ rows: Asset[]; total: number }> {
  const where = buildWhere(params.filters)
  const orderBy = buildOrderBy(params.sortBy, params.order)

  const [rows, total] = await prisma.$transaction([
    prisma.asset.findMany({
      where,
      orderBy,
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
    }),
    prisma.asset.count({ where }),
  ])

  return { rows, total }
}

export async function getAssetById(id: string): Promise<Asset | null> {
  return prisma.asset.findFirst({ where: { id, archived: false } })
}

/* =====================
   Write operations (Phase 4). Soft-delete via the archived flag.
===================== */

export async function createAsset(
  data: Prisma.AssetUncheckedCreateInput,
): Promise<Asset> {
  return prisma.asset.create({ data })
}

/** Returns the number of rows updated; 0 means the asset does not exist. */
export async function updateAsset(
  id: string,
  data: Prisma.AssetUncheckedUpdateInput,
): Promise<number> {
  const result = await prisma.asset.updateMany({
    where: { id, archived: false },
    data,
  })

  return result.count
}

/** Soft-deletes by flagging archived. Returns false when not found. */
export async function archiveAsset(id: string): Promise<boolean> {
  const result = await prisma.asset.updateMany({
    where: { id, archived: false },
    data: { archived: true },
  })

  return result.count > 0
}

export async function assetIdExists(id: string): Promise<boolean> {
  // Duplicate detection must consider archived rows too - IDs stay unique
  // across the whole table, including soft-deleted records.
  const found = await prisma.asset.findUnique({ where: { id }, select: { id: true } })

  return found !== null
}

/**
 * Filter-scoped aggregate statistics for the KPI strip. Currency sums are
 * grouped BY currency so mixed-currency datasets never combine silently.
 */
export async function getAssetStats(
  filters: AssetFilters,
  highValueThreshold: number = HIGH_VALUE_THRESHOLD,
): Promise<AssetStats> {
  const where = buildWhere(filters)

  const [byCriticality, byStatus, sumsByCurrency, highValueCount] = await prisma.$transaction([
    prisma.asset.groupBy({ by: ['criticality'], where, _count: { _all: true } }),
    prisma.asset.groupBy({ by: ['status'], where, _count: { _all: true } }),
    prisma.asset.groupBy({ by: ['currency'], where, _sum: { annualValue: true } }),
    prisma.asset.count({ where: { ...where, annualValue: { gte: highValueThreshold } } }),
  ])

  const criticalityCounts: Record<string, number> = {}
  for (const row of byCriticality) {
    criticalityCounts[row.criticality] = row._count._all
  }

  const statusCounts: Record<string, number> = {}
  for (const row of byStatus) {
    statusCounts[row.status] = row._count._all
  }

  const annualValueByCurrency: Record<string, string> = {}
  for (const row of sumsByCurrency) {
    // groupBy currency is non-null; _sum may be null on empty groups.
    annualValueByCurrency[row.currency] = row._sum.annualValue?.toString() ?? '0'
  }

  return { byCriticality: criticalityCounts, byStatus: statusCounts, annualValueByCurrency, highValueCount }
}

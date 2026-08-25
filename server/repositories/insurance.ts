import { prisma } from './prisma.js'
import type { Prisma, InsurancePolicy } from '../../src/generated/prisma/client.js'

/*
 * Thin data-access layer for Insurance policies. The InsurancePolicyAsset
 * join table is the single source of truth for covered assets.
 */

export interface InsuranceFilters {
  search?: string
  status?: string
  coverageType?: string
}

export interface InsuranceListParams {
  filters: InsuranceFilters
  page: number
  pageSize: number
  /** Whitelist-validated column name. */
  sortBy: string
  order: 'asc' | 'desc'
}

export type PolicyWithAssets = InsurancePolicy & {
  assetLinks: Array<{ assetId: string; asset: { id: string; name: string } }>
}

export interface InsuranceStats {
  byStatus: Record<string, number>
  /** Per-currency sums as decimal strings - currencies are never mixed. */
  coverageLimitByCurrency: Record<string, string>
  premiumByCurrency: Record<string, string>
  deductibleByCurrency: Record<string, string>
}

const ASSET_LINKS_SELECT = {
  orderBy: { assetId: 'asc' },
  select: {
    assetId: true,
    asset: { select: { id: true, name: true } },
  },
} as const

function buildWhere(filters: InsuranceFilters): Prisma.InsurancePolicyWhereInput {
  const where: Prisma.InsurancePolicyWhereInput = {}

  // Soft-deleted records are excluded from every read path.
  where.archived = false

  const equality = {
    status: filters.status,
    coverageType: filters.coverageType,
  }

  for (const [field, value] of Object.entries(equality)) {
    if (value !== undefined) {
      where[field as 'status' | 'coverageType'] = value
    }
  }

  if (filters.search) {
    const needle = { contains: filters.search, mode: 'insensitive' as const }

    where.OR = [
      { policyNumber: needle },
      { provider: needle },
      { coverageType: needle },
    ]
  }

  return where
}

function buildOrderBy(
  sortBy: string,
  order: 'asc' | 'desc',
): Prisma.InsurancePolicyOrderByWithRelationInput {
  return { [sortBy]: order }
}

export async function listPolicies(
  params: InsuranceListParams,
): Promise<{ rows: PolicyWithAssets[]; total: number }> {
  const where = buildWhere(params.filters)
  const orderBy = buildOrderBy(params.sortBy, params.order)

  const [rows, total] = await prisma.$transaction([
    prisma.insurancePolicy.findMany({
      where,
      orderBy,
      include: { assetLinks: ASSET_LINKS_SELECT },
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
    }),
    prisma.insurancePolicy.count({ where }),
  ])

  return { rows: rows as PolicyWithAssets[], total }
}

export async function getPolicyById(id: string): Promise<PolicyWithAssets | null> {
  const policy = await prisma.insurancePolicy.findFirst({
    where: { id, archived: false },
    include: { assetLinks: ASSET_LINKS_SELECT },
  })

  return (policy as PolicyWithAssets | null) ?? null
}

/* =====================
   Write operations (Phase 4). Soft-delete via the archived flag. The
   InsurancePolicyAsset join table is only ever mutated inside a
   transaction together with the owning policy.
===================== */

/** Resolves which of the given asset IDs exist on the visible read path. */
export async function findVisibleAssetIds(ids: string[]): Promise<Set<string>> {
  if (ids.length === 0) {
    return new Set()
  }

  const rows = await prisma.asset.findMany({
    where: { id: { in: ids }, archived: false },
    select: { id: true },
  })

  return new Set(rows.map((row) => row.id))
}

/**
 * Creates the policy and its covered-asset join rows atomically.
 */
export async function createPolicy(
  data: Prisma.InsurancePolicyUncheckedCreateInput,
  assetIds: string[],
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.insurancePolicy.create({ data })

    if (assetIds.length > 0) {
      await tx.insurancePolicyAsset.createMany({
        data: assetIds.map((assetId) => ({ policyId: data.id, assetId })),
      })
    }
  })
}

/**
 * Updates the policy and, when replacement coverage is supplied, swaps the
 * join rows in the same transaction - no orphan join rows can result.
 * Returns false when the policy does not exist on the visible path.
 */
export async function updatePolicy(
  id: string,
  data: Prisma.InsurancePolicyUncheckedUpdateInput,
  assetIds?: string[],
): Promise<boolean> {
  return prisma.$transaction(async (tx) => {
    const policy = await tx.insurancePolicy.findFirst({
      where: { id, archived: false },
      select: { id: true },
    })

    if (!policy) {
      return false
    }

    if (Object.keys(data).length > 0) {
      await tx.insurancePolicy.update({ where: { id }, data })
    }

    if (assetIds !== undefined) {
      await tx.insurancePolicyAsset.deleteMany({ where: { policyId: id } })
      await tx.insurancePolicyAsset.createMany({
        data: assetIds.map((assetId) => ({ policyId: id, assetId })),
      })
    }

    return true
  })
}

/** Soft-deletes by flagging archived; join rows are kept for integrity. */
export async function archivePolicy(id: string): Promise<boolean> {
  const result = await prisma.insurancePolicy.updateMany({
    where: { id, archived: false },
    data: { archived: true },
  })

  return result.count > 0
}

export async function policyIdExists(id: string): Promise<boolean> {
  // Duplicate detection must consider archived rows too - IDs stay unique
  // across the whole table, including soft-deleted records.
  const found = await prisma.insurancePolicy.findUnique({ where: { id }, select: { id: true } })

  return found !== null
}

/**
 * Filter-scoped aggregate statistics for the KPI strip. Every monetary sum
 * is grouped BY currency so mixed-currency datasets never combine silently.
 */
export async function getInsuranceStats(filters: InsuranceFilters): Promise<InsuranceStats> {
  const where = buildWhere(filters)

  const [byStatus, coverageSums, premiumSums, deductibleSums] = await prisma.$transaction([
    prisma.insurancePolicy.groupBy({ by: ['status'], where, _count: { _all: true } }),
    prisma.insurancePolicy.groupBy({ by: ['currency'], where, _sum: { coverageLimit: true } }),
    prisma.insurancePolicy.groupBy({ by: ['currency'], where, _sum: { premium: true } }),
    prisma.insurancePolicy.groupBy({ by: ['currency'], where, _sum: { deductible: true } }),
  ])

  const statusCounts: Record<string, number> = {}
  for (const row of byStatus) {
    statusCounts[row.status] = row._count._all
  }

  const toBucket = (
    rows: Array<{ currency: string; _sum: Record<string, unknown> }>,
    field: string,
  ): Record<string, string> => {
    const bucket: Record<string, string> = {}

    for (const row of rows) {
      const sum = row._sum[field] as { toString(): string } | null
      bucket[row.currency] = sum?.toString() ?? '0'
    }

    return bucket
  }

  return {
    byStatus: statusCounts,
    coverageLimitByCurrency: toBucket(
      coverageSums as never,
      'coverageLimit',
    ),
    premiumByCurrency: toBucket(premiumSums as never, 'premium'),
    deductibleByCurrency: toBucket(deductibleSums as never, 'deductible'),
  }
}

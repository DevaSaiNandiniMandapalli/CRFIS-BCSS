import { prisma } from './prisma.js'
import type { Prisma, Scenario } from '../../src/generated/prisma/client.js'

/*
 * Thin data-access layer for Scenarios. Query construction only - no
 * HTTP logic, no UI concerns, no financial calculations.
 */

export interface ScenarioFilters {
  search?: string
  severity?: string
  status?: string
  category?: string
  probability?: string
}

export interface ScenarioListParams {
  filters: ScenarioFilters
  page: number
  pageSize: number
  /** Whitelist-validated column name. */
  sortBy: string
  order: 'asc' | 'desc'
}

export type ScenarioWithRelations = Scenario & {
  risk: { id: string; risk: string }
  asset: { id: string; name: string }
}

export interface ScenarioStats {
  bySeverity: Record<string, number>
  byStatus: Record<string, number>
  /** Per-currency sums as decimal strings - currencies are never mixed. */
  estimatedImpactByCurrency: Record<string, string>
}

const RELATION_SELECT = {
  risk: { select: { id: true, risk: true } },
  asset: { select: { id: true, name: true } },
} as const

function buildWhere(filters: ScenarioFilters): Prisma.ScenarioWhereInput {
  const where: Prisma.ScenarioWhereInput = {}

  // Soft-deleted records are excluded from every read path.
  where.archived = false

  // A scenario whose Risk or Asset has been archived is hidden from normal
  // reads as well - the relationships stay intact but the record leaves
  // every visible surface until its parents are restored.
  where.risk = { is: { archived: false } }
  where.asset = { is: { archived: false } }

  const equality = {
    severity: filters.severity,
    status: filters.status,
    category: filters.category,
    probability: filters.probability,
  }

  for (const [field, value] of Object.entries(equality)) {
    if (value !== undefined) {
      where[field as 'severity' | 'status' | 'category' | 'probability'] = value
    }
  }

  if (filters.search) {
    const needle = { contains: filters.search, mode: 'insensitive' as const }

    where.OR = [
      { name: needle },
      { description: needle },
      { owner: needle },
      { businessImpact: needle },
      { risk: { is: { archived: false, risk: needle } } },
      { asset: { is: { archived: false, name: needle } } },
    ]
  }

  return where
}

function buildOrderBy(
  sortBy: string,
  order: 'asc' | 'desc',
): Prisma.ScenarioOrderByWithRelationInput {
  return { [sortBy]: order }
}

export async function listScenarios(
  params: ScenarioListParams,
): Promise<{ rows: ScenarioWithRelations[]; total: number }> {
  const where = buildWhere(params.filters)
  const orderBy = buildOrderBy(params.sortBy, params.order)

  const [rows, total] = await prisma.$transaction([
    prisma.scenario.findMany({
      where,
      orderBy,
      include: RELATION_SELECT,
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
    }),
    prisma.scenario.count({ where }),
  ])

  return { rows: rows as ScenarioWithRelations[], total }
}

export async function getScenarioById(id: string): Promise<ScenarioWithRelations | null> {
  const scenario = await prisma.scenario.findFirst({
    where: { id, archived: false, risk: { is: { archived: false } }, asset: { is: { archived: false } } },
    include: RELATION_SELECT,
  })

  return (scenario as ScenarioWithRelations | null) ?? null
}

/* =====================
   Write operations (Phase 4). Soft-delete via the archived flag.
===================== */

export async function createScenario(
  data: Prisma.ScenarioUncheckedCreateInput,
): Promise<Scenario> {
  return prisma.scenario.create({ data })
}

/** Returns the number of rows updated; 0 means the record does not exist. */
export async function updateScenario(
  id: string,
  data: Prisma.ScenarioUncheckedUpdateInput,
): Promise<number> {
  const result = await prisma.scenario.updateMany({
    where: { id, archived: false },
    data,
  })

  return result.count
}

/** Soft-deletes by flagging archived. Returns false when not found. */
export async function archiveScenario(id: string): Promise<boolean> {
  const result = await prisma.scenario.updateMany({
    where: { id, archived: false },
    data: { archived: true },
  })

  return result.count > 0
}

export async function scenarioIdExists(id: string): Promise<boolean> {
  // Duplicate detection must consider archived rows too - IDs stay unique
  // across the whole table, including soft-deleted records.
  const found = await prisma.scenario.findUnique({ where: { id }, select: { id: true } })

  return found !== null
}

/**
 * Filter-scoped aggregate statistics for the KPI strip. Monetary sums are
 * grouped BY currency so mixed-currency datasets never combine silently.
 */
export async function getScenarioStats(filters: ScenarioFilters): Promise<ScenarioStats> {
  const where = buildWhere(filters)

  const [bySeverity, byStatus, sumsByCurrency] = await prisma.$transaction([
    prisma.scenario.groupBy({ by: ['severity'], where, _count: { _all: true } }),
    prisma.scenario.groupBy({ by: ['status'], where, _count: { _all: true } }),
    prisma.scenario.groupBy({ by: ['currency'], where, _sum: { estimatedImpact: true } }),
  ])

  const severityCounts: Record<string, number> = {}
  for (const row of bySeverity) {
    severityCounts[row.severity] = row._count._all
  }

  const statusCounts: Record<string, number> = {}
  for (const row of byStatus) {
    statusCounts[row.status] = row._count._all
  }

  const estimatedImpactByCurrency: Record<string, string> = {}
  for (const row of sumsByCurrency) {
    estimatedImpactByCurrency[row.currency] = row._sum.estimatedImpact?.toString() ?? '0'
  }

  return { bySeverity: severityCounts, byStatus: statusCounts, estimatedImpactByCurrency }
}

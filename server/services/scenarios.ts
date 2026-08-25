import { HttpError } from '../plugins/error-handler.js'
import {
  getScenarioById as findScenarioById,
  getScenarioStats,
  listScenarios as fetchScenarios,
  createScenario as repoCreateScenario,
  updateScenario as repoUpdateScenario,
  archiveScenario as repoArchiveScenario,
  scenarioIdExists,
  type ScenarioStats,
} from '../repositories/scenarios.js'
import { getRiskById } from './risks.js'
import { assertAssetAvailable } from './assets.js'
import { mapScenario, type MappedScenario } from '../utils/mappers.js'
import { buildPaginationMeta } from '../schemas/query.js'

/*
 * Scenario service: composes repository operations into API-ready DTOs.
 */

export const SCENARIO_SORT_WHITELIST = [
  'name',
  'severity',
  'probability',
  'estimatedImpact',
  'status',
] as const

export type ScenarioSortField = (typeof SCENARIO_SORT_WHITELIST)[number]

export const DEFAULT_SCENARIO_SORT: ScenarioSortField = 'severity'

export interface ScenarioListQuery {
  page: number
  pageSize: number
  sort?: string
  order: 'asc' | 'desc'
  search?: string
  severity?: string
  status?: string
  category?: string
  probability?: string
}

export interface ScenarioListResult {
  data: MappedScenario[]
  meta: ReturnType<typeof buildPaginationMeta> & { stats: ScenarioStats }
}

export async function listScenarios(query: ScenarioListQuery): Promise<ScenarioListResult> {
  const filters = {
    search: query.search,
    severity: query.severity,
    status: query.status,
    category: query.category,
    probability: query.probability,
  }

  const sortBy = query.sort ?? DEFAULT_SCENARIO_SORT

  const [{ rows, total }, stats] = await Promise.all([
    fetchScenarios({
      filters,
      page: query.page,
      pageSize: query.pageSize,
      sortBy,
      order: query.order,
    }),
    getScenarioStats(filters),
  ])

  return {
    data: rows.map(mapScenario),
    meta: {
      ...buildPaginationMeta(total, query.page, query.pageSize),
      stats,
    },
  }
}

export async function getScenarioById(id: string): Promise<MappedScenario> {
  const scenario = await findScenarioById(id)

  if (!scenario) {
    throw new HttpError(404, 'SCENARIO_NOT_FOUND', `Scenario "${id}" was not found.`)
  }

  return mapScenario(scenario)
}

/* =====================
   Write operations (Phase 4)
===================== */

export interface ScenarioCreateInput {
  id: string
  name: string
  category: string
  description: string
  riskId: string
  assetId: string
  severity: string
  probability: string
  currency: string
  estimatedImpact: string
  businessImpact: string
  status: string
  owner: string
}

/**
 * Validates that a referenced Risk resolves on the visible (non-archived)
 * read path - getRiskById throws the canonical RISK_NOT_FOUND envelope,
 * including when the risk itself is fine but its parent Asset is archived.
 */
async function assertRiskAvailable(riskId: string): Promise<void> {
  try {
    await getRiskById(riskId)
  } catch {
    throw new HttpError(404, 'RISK_NOT_FOUND', `Risk "${riskId}" was not found.`)
  }
}

export async function createScenario(input: ScenarioCreateInput): Promise<MappedScenario> {
  if (await scenarioIdExists(input.id)) {
    throw new HttpError(409, 'ID_ALREADY_EXISTS', `Scenario "${input.id}" already exists.`)
  }

  await assertRiskAvailable(input.riskId)
  await assertAssetAvailable(input.assetId)

  const created = await repoCreateScenario({ ...input })

  // Re-read on the normal visible path so the DTO carries real Risk and
  // Asset display entities instead of assembled placeholders.
  return getScenarioById(created.id)
}

export interface ScenarioUpdateInput {
  name?: string
  category?: string
  description?: string
  riskId?: string
  assetId?: string
  severity?: string
  probability?: string
  currency?: string
  estimatedImpact?: string
  businessImpact?: string
  status?: string
  owner?: string
}

export async function updateScenario(
  id: string,
  input: ScenarioUpdateInput,
): Promise<MappedScenario> {
  if (input.riskId !== undefined) {
    await assertRiskAvailable(input.riskId)
  }

  if (input.assetId !== undefined) {
    await assertAssetAvailable(input.assetId)
  }

  const updated = await repoUpdateScenario(id, { ...input })

  if (updated === 0) {
    throw new HttpError(404, 'SCENARIO_NOT_FOUND', `Scenario "${id}" was not found.`)
  }

  return getScenarioById(id)
}

export async function archiveScenario(id: string): Promise<{ id: string; archived: true }> {
  const archived = await repoArchiveScenario(id)

  if (!archived) {
    throw new HttpError(404, 'SCENARIO_NOT_FOUND', `Scenario "${id}" was not found.`)
  }

  return { id, archived: true }
}

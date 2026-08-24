import { HttpError } from '../plugins/error-handler.js'
import {
  getScenarioById as findScenarioById,
  getScenarioStats,
  listScenarios as fetchScenarios,
  type ScenarioStats,
} from '../repositories/scenarios.js'
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

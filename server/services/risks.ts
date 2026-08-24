import { HttpError } from '../plugins/error-handler.js'
import {
  getRiskById as findRiskById,
  getRiskStats,
  listRisks as fetchRisks,
  type RiskStats,
} from '../repositories/risks.js'
import { mapRisk, type MappedRisk } from '../utils/mappers.js'
import { buildPaginationMeta } from '../schemas/query.js'

/*
 * Risk service: composes repository operations into API-ready DTOs.
 * Business/mapping logic lives here - never in routes or repositories.
 */

export const RISK_SORT_WHITELIST = [
  'risk',
  'severity',
  'likelihood',
  'category',
  'exposure',
  'status',
  'lastUpdated',
] as const

export type RiskSortField = (typeof RISK_SORT_WHITELIST)[number]

export const DEFAULT_RISK_SORT: RiskSortField = 'exposure'

export interface RiskListQuery {
  page: number
  pageSize: number
  sort?: string
  order: 'asc' | 'desc'
  search?: string
  severity?: string
  status?: string
  category?: string
  likelihood?: string
}

export interface RiskListResult {
  data: MappedRisk[]
  meta: ReturnType<typeof buildPaginationMeta> & { stats: RiskStats }
}

export async function listRisks(query: RiskListQuery): Promise<RiskListResult> {
  const filters = {
    search: query.search,
    severity: query.severity,
    status: query.status,
    category: query.category,
    likelihood: query.likelihood,
  }

  const sortBy = query.sort ?? DEFAULT_RISK_SORT

  const [{ rows, total }, stats] = await Promise.all([
    fetchRisks({ filters, page: query.page, pageSize: query.pageSize, sortBy, order: query.order }),
    getRiskStats(filters),
  ])

  return {
    data: rows.map(mapRisk),
    meta: {
      ...buildPaginationMeta(total, query.page, query.pageSize),
      stats,
    },
  }
}

export async function getRiskById(id: string): Promise<MappedRisk> {
  const risk = await findRiskById(id)

  if (!risk) {
    throw new HttpError(404, 'RISK_NOT_FOUND', `Risk "${id}" was not found.`)
  }

  return mapRisk(risk)
}

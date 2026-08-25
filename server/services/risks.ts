import { HttpError } from '../plugins/error-handler.js'
import {
  getRiskById as findRiskById,
  getRiskStats,
  listRisks as fetchRisks,
  createRisk as repoCreateRisk,
  updateRisk as repoUpdateRisk,
  archiveRisk as repoArchiveRisk,
  riskIdExists,
  type RiskStats,
} from '../repositories/risks.js'
import { assertAssetAvailable } from './assets.js'
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

/* =====================
   Write operations (Phase 4)
===================== */

export interface RiskCreateInput {
  id: string
  risk: string
  assetId: string
  category: string
  severity: string
  likelihood: string
  currency: string
  exposure: string
  status: string
  owner: string
}

export async function createRisk(input: RiskCreateInput): Promise<MappedRisk> {
  if (await riskIdExists(input.id)) {
    throw new HttpError(409, 'ID_ALREADY_EXISTS', `Risk "${input.id}" already exists.`)
  }

  await assertAssetAvailable(input.assetId)

  const created = await repoCreateRisk({
    ...input,
    lastUpdated: new Date(),
  })

  // Re-read on the normal visible path so the DTO carries the real Asset
  // display entity instead of an assembled placeholder.
  return getRiskById(created.id)
}

export interface RiskUpdateInput {
  risk?: string
  assetId?: string
  category?: string
  severity?: string
  likelihood?: string
  currency?: string
  exposure?: string
  status?: string
  owner?: string
}

export async function updateRisk(id: string, input: RiskUpdateInput): Promise<MappedRisk> {
  if (input.assetId !== undefined) {
    await assertAssetAvailable(input.assetId)
  }

  const updated = await repoUpdateRisk(id, {
    ...input,
    lastUpdated: new Date(),
  })

  if (updated === 0) {
    throw new HttpError(404, 'RISK_NOT_FOUND', `Risk "${id}" was not found.`)
  }

  return getRiskById(id)
}

export async function archiveRisk(id: string): Promise<{ id: string; archived: true }> {
  const archived = await repoArchiveRisk(id)

  if (!archived) {
    throw new HttpError(404, 'RISK_NOT_FOUND', `Risk "${id}" was not found.`)
  }

  return { id, archived: true }
}

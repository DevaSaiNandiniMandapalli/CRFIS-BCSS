import { HttpError } from '../plugins/error-handler.js'
import {
  getAssetById as findAssetById,
  getAssetStats,
  listAssets as fetchAssets,
  type AssetStats,
} from '../repositories/assets.js'
import { mapAsset, type MappedAsset } from '../utils/mappers.js'
import { buildPaginationMeta } from '../schemas/query.js'

/*
 * Asset service: composes repository operations into API-ready DTOs.
 * Business/mapping logic lives here - never in routes or repositories.
 */

export const ASSET_SORT_WHITELIST = [
  'name',
  'criticality',
  'annualValue',
  'status',
  'lastUpdated',
] as const

export type AssetSortField = (typeof ASSET_SORT_WHITELIST)[number]

export const DEFAULT_ASSET_SORT: AssetSortField = 'name'

export interface AssetListQuery {
  page: number
  pageSize: number
  sort?: string
  order: 'asc' | 'desc'
  search?: string
  criticality?: string
  status?: string
  type?: string
}

export interface AssetListResult {
  data: MappedAsset[]
  meta: ReturnType<typeof buildPaginationMeta> & { stats: AssetStats }
}

export async function listAssets(query: AssetListQuery): Promise<AssetListResult> {
  const filters = {
    search: query.search,
    criticality: query.criticality,
    status: query.status,
    type: query.type,
  }

  const sortBy = query.sort ?? DEFAULT_ASSET_SORT

  const [{ rows, total }, stats] = await Promise.all([
    fetchAssets({ filters, page: query.page, pageSize: query.pageSize, sortBy, order: query.order }),
    getAssetStats(filters),
  ])

  return {
    data: rows.map(mapAsset),
    meta: {
      ...buildPaginationMeta(total, query.page, query.pageSize),
      stats,
    },
  }
}

export async function getAssetById(id: string): Promise<MappedAsset> {
  const asset = await findAssetById(id)

  if (!asset) {
    throw new HttpError(404, 'ASSET_NOT_FOUND', `Asset "${id}" was not found.`)
  }

  return mapAsset(asset)
}

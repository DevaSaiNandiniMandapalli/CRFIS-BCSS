import { HttpError } from '../plugins/error-handler.js'
import {
  getPolicyById as findPolicyById,
  getInsuranceStats,
  listPolicies as fetchPolicies,
  type InsuranceStats,
} from '../repositories/insurance.js'
import { mapInsurancePolicy, type MappedInsurancePolicy } from '../utils/mappers.js'
import { buildPaginationMeta } from '../schemas/query.js'

/*
 * Insurance service: composes repository operations into API-ready DTOs.
 */

export const INSURANCE_SORT_WHITELIST = [
  'policyNumber',
  'provider',
  'coverageType',
  'coverageLimit',
  'deductible',
  'expirationDate',
  'status',
] as const

export type InsuranceSortField = (typeof INSURANCE_SORT_WHITELIST)[number]

export const DEFAULT_INSURANCE_SORT: InsuranceSortField = 'expirationDate'

export interface InsuranceListQuery {
  page: number
  pageSize: number
  sort?: string
  order: 'asc' | 'desc'
  search?: string
  status?: string
  coverageType?: string
}

export interface InsuranceListResult {
  data: MappedInsurancePolicy[]
  meta: ReturnType<typeof buildPaginationMeta> & { stats: InsuranceStats }
}

export async function listPolicies(query: InsuranceListQuery): Promise<InsuranceListResult> {
  const filters = {
    search: query.search,
    status: query.status,
    coverageType: query.coverageType,
  }

  const sortBy = query.sort ?? DEFAULT_INSURANCE_SORT

  const [{ rows, total }, stats] = await Promise.all([
    fetchPolicies({
      filters,
      page: query.page,
      pageSize: query.pageSize,
      sortBy,
      order: query.order,
    }),
    getInsuranceStats(filters),
  ])

  return {
    data: rows.map(mapInsurancePolicy),
    meta: {
      ...buildPaginationMeta(total, query.page, query.pageSize),
      stats,
    },
  }
}

export async function getPolicyById(id: string): Promise<MappedInsurancePolicy> {
  const policy = await findPolicyById(id)

  if (!policy) {
    throw new HttpError(
      404,
      'INSURANCE_POLICY_NOT_FOUND',
      `Insurance policy "${id}" was not found.`,
    )
  }

  return mapInsurancePolicy(policy)
}

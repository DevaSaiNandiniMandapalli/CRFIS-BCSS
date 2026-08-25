import { HttpError } from '../plugins/error-handler.js'
import {
  getPolicyById as findPolicyById,
  getInsuranceStats,
  listPolicies as fetchPolicies,
  createPolicy as repoCreatePolicy,
  updatePolicy as repoUpdatePolicy,
  archivePolicy as repoArchivePolicy,
  policyIdExists,
  findVisibleAssetIds,
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

/* =====================
   Write operations (Phase 4)
===================== */

export interface PolicyCreateInput {
  id: string
  policyNumber: string
  provider: string
  coverageType: string
  currency: string
  coverageLimit: string
  deductible: string
  premium: string
  expirationDate: Date
  status: string
  notes?: string
  assetIds: string[]
}

/**
 * Validates that every referenced Asset exists on the visible (non-archived)
 * read path, reporting all missing IDs at once.
 */
async function assertAssetsAvailable(assetIds: string[]): Promise<void> {
  const visible = await findVisibleAssetIds(assetIds)
  const missing = assetIds.filter((assetId) => !visible.has(assetId))

  if (missing.length > 0) {
    throw new HttpError(
      404,
      'ASSET_NOT_FOUND',
      'One or more covered assets were not found.',
      { missingAssetIds: missing },
    )
  }
}

/** Deduplicates while preserving caller order. */
function normalizeAssetIds(assetIds: string[]): string[] {
  return [...new Set(assetIds)]
}

export async function createPolicy(input: PolicyCreateInput): Promise<MappedInsurancePolicy> {
  if (await policyIdExists(input.id)) {
    throw new HttpError(409, 'ID_ALREADY_EXISTS', `Policy "${input.id}" already exists.`)
  }

  const assetIds = normalizeAssetIds(input.assetIds)
  await assertAssetsAvailable(assetIds)

  const { assetIds: covered, ...policyData } = input
  void covered
  await repoCreatePolicy(policyData, assetIds)

  // Re-read on the normal visible path so the DTO carries the real join
  // rows with their display entities.
  return getPolicyById(input.id)
}

export interface PolicyUpdateInput {
  policyNumber?: string
  provider?: string
  coverageType?: string
  currency?: string
  coverageLimit?: string
  deductible?: string
  premium?: string
  expirationDate?: Date
  status?: string
  notes?: string
  /** When supplied, REPLACES the full set of covered assets. */
  assetIds?: string[]
}

const POLICY_FIELDS = [
  'policyNumber',
  'provider',
  'coverageType',
  'currency',
  'coverageLimit',
  'deductible',
  'premium',
  'expirationDate',
  'status',
  'notes',
] as const

export async function updatePolicy(id: string, input: PolicyUpdateInput): Promise<MappedInsurancePolicy> {
  const data: Record<string, unknown> = {}

  for (const field of POLICY_FIELDS) {
    if (input[field] !== undefined) {
      data[field] = input[field]
    }
  }

  let replacementCoverage: string[] | undefined

  if (input.assetIds !== undefined) {
    replacementCoverage = normalizeAssetIds(input.assetIds)
    await assertAssetsAvailable(replacementCoverage)
  }

  const updated = await repoUpdatePolicy(id, data, replacementCoverage)

  if (!updated) {
    throw new HttpError(404, 'POLICY_NOT_FOUND', `Policy "${id}" was not found.`)
  }

  return getPolicyById(id)
}

export async function archivePolicy(id: string): Promise<{ id: string; archived: true }> {
  const archived = await repoArchivePolicy(id)

  if (!archived) {
    throw new HttpError(404, 'POLICY_NOT_FOUND', `Policy "${id}" was not found.`)
  }

  return { id, archived: true }
}

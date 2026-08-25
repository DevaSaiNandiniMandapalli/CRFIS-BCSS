import { HttpError } from '../plugins/error-handler.js'
import {
  getRemediationById as findRemediationById,
  getRemediationStats,
  listRemediations as fetchRemediations,
  createRemediation as repoCreateRemediation,
  updateRemediation as repoUpdateRemediation,
  archiveRemediation as repoArchiveRemediation,
  remediationIdExists,
  type RemediationStats,
} from '../repositories/remediations.js'
import { getRiskById } from './risks.js'
import { assertAssetAvailable } from './assets.js'
import { mapRemediation, type MappedRemediation } from '../utils/mappers.js'
import { buildPaginationMeta } from '../schemas/query.js'

/*
 * Remediation service: composes repository operations into API-ready DTOs.
 */

export const REMEDIATION_SORT_WHITELIST = [
  'action',
  'priority',
  'dueDate',
  'estimatedCost',
  'expectedReduction',
  'status',
] as const

export type RemediationSortField = (typeof REMEDIATION_SORT_WHITELIST)[number]

export const DEFAULT_REMEDIATION_SORT: RemediationSortField = 'dueDate'

export interface RemediationListQuery {
  page: number
  pageSize: number
  sort?: string
  order: 'asc' | 'desc'
  search?: string
  priority?: string
  status?: string
  category?: string
}

export interface RemediationListResult {
  data: MappedRemediation[]
  meta: ReturnType<typeof buildPaginationMeta> & { stats: RemediationStats }
}

export async function listRemediations(
  query: RemediationListQuery,
): Promise<RemediationListResult> {
  const filters = {
    search: query.search,
    priority: query.priority,
    status: query.status,
    category: query.category,
  }

  const sortBy = query.sort ?? DEFAULT_REMEDIATION_SORT

  const [{ rows, total }, stats] = await Promise.all([
    fetchRemediations({
      filters,
      page: query.page,
      pageSize: query.pageSize,
      sortBy,
      order: query.order,
    }),
    // Overdue KPI is evaluated against the current wall clock.
    getRemediationStats(filters, new Date()),
  ])

  return {
    data: rows.map(mapRemediation),
    meta: {
      ...buildPaginationMeta(total, query.page, query.pageSize),
      stats,
    },
  }
}

export async function getRemediationById(id: string): Promise<MappedRemediation> {
  const remediation = await findRemediationById(id)

  if (!remediation) {
    throw new HttpError(
      404,
      'REMEDIATION_NOT_FOUND',
      `Remediation "${id}" was not found.`,
    )
  }

  return mapRemediation(remediation)
}

/* =====================
   Write operations (Phase 4)
===================== */

export interface RemediationCreateInput {
  id: string
  action: string
  riskId: string
  assetId: string
  category: string
  priority: string
  owner: string
  dueDate: Date
  status: string
  currency: string
  estimatedCost: string
  expectedReduction: string
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

export async function createRemediation(
  input: RemediationCreateInput,
): Promise<MappedRemediation> {
  if (await remediationIdExists(input.id)) {
    throw new HttpError(
      409,
      'ID_ALREADY_EXISTS',
      `Remediation "${input.id}" already exists.`,
    )
  }

  await assertRiskAvailable(input.riskId)
  await assertAssetAvailable(input.assetId)

  const created = await repoCreateRemediation({ ...input })

  // Re-read on the normal visible path so the DTO carries real Risk and
  // Asset display entities instead of assembled placeholders.
  return getRemediationById(created.id)
}

export interface RemediationUpdateInput {
  action?: string
  riskId?: string
  assetId?: string
  category?: string
  priority?: string
  owner?: string
  dueDate?: Date
  status?: string
  currency?: string
  estimatedCost?: string
  expectedReduction?: string
}

export async function updateRemediation(
  id: string,
  input: RemediationUpdateInput,
): Promise<MappedRemediation> {
  if (input.riskId !== undefined) {
    await assertRiskAvailable(input.riskId)
  }

  if (input.assetId !== undefined) {
    await assertAssetAvailable(input.assetId)
  }

  const updated = await repoUpdateRemediation(id, { ...input })

  if (updated === 0) {
    throw new HttpError(
      404,
      'REMEDIATION_NOT_FOUND',
      `Remediation "${id}" was not found.`,
    )
  }

  return getRemediationById(id)
}

export async function archiveRemediation(
  id: string,
): Promise<{ id: string; archived: true }> {
  const archived = await repoArchiveRemediation(id)

  if (!archived) {
    throw new HttpError(
      404,
      'REMEDIATION_NOT_FOUND',
      `Remediation "${id}" was not found.`,
    )
  }

  return { id, archived: true }
}

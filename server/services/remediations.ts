import { HttpError } from '../plugins/error-handler.js'
import {
  getRemediationById as findRemediationById,
  getRemediationStats,
  listRemediations as fetchRemediations,
  type RemediationStats,
} from '../repositories/remediations.js'
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

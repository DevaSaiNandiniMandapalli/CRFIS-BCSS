import { HttpError } from '../plugins/error-handler.js'
import {
  getReportById as findReportById,
  listReports as fetchReports,
} from '../repositories/reports.js'
import { mapReport, type MappedReport } from '../utils/mappers.js'
import { buildPaginationMeta } from '../schemas/query.js'

/*
 * Report service: stored report metadata only. No generation logic exists.
 */

export const REPORT_SORT_WHITELIST = [
  'name',
  'type',
  'period',
  'status',
  'generatedAt',
] as const

export type ReportSortField = (typeof REPORT_SORT_WHITELIST)[number]

export const DEFAULT_REPORT_SORT: ReportSortField = 'generatedAt'

export interface ReportListQuery {
  page: number
  pageSize: number
  sort?: string
  order: 'asc' | 'desc'
  search?: string
  status?: string
  type?: string
}

export interface ReportListResult {
  data: MappedReport[]
  meta: ReturnType<typeof buildPaginationMeta>
}

export async function listReports(query: ReportListQuery): Promise<ReportListResult> {
  const filters = {
    search: query.search,
    status: query.status,
    type: query.type,
  }

  const sortBy = query.sort ?? DEFAULT_REPORT_SORT

  const { rows, total } = await fetchReports({
    filters,
    page: query.page,
    pageSize: query.pageSize,
    sortBy,
    order: query.order,
  })

  return {
    data: rows.map(mapReport),
    meta: buildPaginationMeta(total, query.page, query.pageSize),
  }
}

export async function getReportById(id: string): Promise<MappedReport> {
  const report = await findReportById(id)

  if (!report) {
    throw new HttpError(404, 'REPORT_NOT_FOUND', `Report "${id}" was not found.`)
  }

  return mapReport(report)
}

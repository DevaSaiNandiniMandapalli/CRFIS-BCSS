import { prisma } from './prisma.js'
import type { Prisma, Report } from '../../src/generated/prisma/client.js'

/*
 * Thin data-access layer for stored Report metadata. Read-only.
 */

export interface ReportFilters {
  search?: string
  status?: string
  type?: string
}

export interface ReportListParams {
  filters: ReportFilters
  page: number
  pageSize: number
  /** Whitelist-validated column name. */
  sortBy: string
  order: 'asc' | 'desc'
}

function buildWhere(filters: ReportFilters): Prisma.ReportWhereInput {
  const where: Prisma.ReportWhereInput = {}

  const equality = {
    status: filters.status,
    type: filters.type,
  }

  for (const [field, value] of Object.entries(equality)) {
    if (value !== undefined) {
      where[field as 'status' | 'type'] = value
    }
  }

  if (filters.search) {
    const needle = { contains: filters.search, mode: 'insensitive' as const }

    where.OR = [
      { name: needle },
      { type: needle },
      { owner: needle },
      { period: needle },
    ]
  }

  return where
}

export async function listReports(params: ReportListParams): Promise<{
  rows: Report[]
  total: number
}> {
  const where = buildWhere(params.filters)
  const orderBy: Prisma.ReportOrderByWithRelationInput = { [params.sortBy]: params.order }

  const [rows, total] = await prisma.$transaction([
    prisma.report.findMany({
      where,
      orderBy,
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
    }),
    prisma.report.count({ where }),
  ])

  return { rows, total }
}

export async function getReportById(id: string): Promise<Report | null> {
  return prisma.report.findUnique({ where: { id } })
}

import { prisma } from './prisma.js'
import type { Prisma, AuditFinding } from '../../src/generated/prisma/client.js'

/*
 * Thin data-access layer for AuditFindings. Supports both the nested
 * audit-scoped read and the cross-audit list used by the UI.
 */

export interface AuditFindingFilters {
  search?: string
  severity?: string
  status?: string
  owner?: string
  /** Scoped to a single audit when provided. */
  auditId?: string
}

export interface AuditFindingListParams {
  filters: AuditFindingFilters
  page: number
  pageSize: number
  /** Whitelist-validated column name. */
  sortBy: string
  order: 'asc' | 'desc'
}

export type AuditFindingWithRelations = AuditFinding & {
  risk: { id: string; risk: string } | null
  remediation: { id: string } | null
}

const RELATION_SELECT = {
  audit: { select: { id: true } },
  risk: { select: { id: true, risk: true } },
  remediation: { select: { id: true } },
} as const

function buildWhere(filters: AuditFindingFilters): Prisma.AuditFindingWhereInput {
  const where: Prisma.AuditFindingWhereInput = {}

  const equality = {
    severity: filters.severity,
    status: filters.status,
    owner: filters.owner,
    auditId: filters.auditId,
  }

  for (const [field, value] of Object.entries(equality)) {
    if (value !== undefined) {
      where[field as 'severity' | 'status' | 'owner' | 'auditId'] = value
    }
  }

  if (filters.search) {
    const needle = { contains: filters.search, mode: 'insensitive' as const }

    where.OR = [
      { id: needle },
      { description: needle },
      { owner: needle },
    ]
  }

  return where
}

function buildOrderBy(
  sortBy: string,
  order: 'asc' | 'desc',
): Prisma.AuditFindingOrderByWithRelationInput {
  return { [sortBy]: order }
}

export async function listAuditFindings(
  params: AuditFindingListParams,
): Promise<{ rows: AuditFindingWithRelations[]; total: number }> {
  const where = buildWhere(params.filters)
  const orderBy = buildOrderBy(params.sortBy, params.order)

  const [rows, total] = await prisma.$transaction([
    prisma.auditFinding.findMany({
      where,
      orderBy,
      include: RELATION_SELECT,
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
    }),
    prisma.auditFinding.count({ where }),
  ])

  return { rows: rows as AuditFindingWithRelations[], total }
}

export async function getAuditFindingById(
  id: string,
): Promise<AuditFindingWithRelations | null> {
  const finding = await prisma.auditFinding.findUnique({
    where: { id },
    include: RELATION_SELECT,
  })

  return (finding as AuditFindingWithRelations | null) ?? null
}

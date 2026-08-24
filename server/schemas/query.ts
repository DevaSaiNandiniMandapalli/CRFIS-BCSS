import { z } from 'zod'

// Shared list-query infrastructure for upcoming read-only domain routes.
//
// Convention: every collection endpoint accepts page/pageSize/order and a
// route-specific `sort` whitelist built with listQuerySchema(). Domain
// filters are added per route by extending the schema returned from
// listQuerySchema(); they must never be parsed ad hoc inside handlers.

export const SORT_ORDER_VALUES = ['asc', 'desc'] as const

export const sortOrderSchema = z.enum(SORT_ORDER_VALUES)

export const DEFAULT_PAGE = 1
export const DEFAULT_PAGE_SIZE = 20
export const MAX_PAGE_SIZE = 100

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(DEFAULT_PAGE),
  pageSize: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
  order: sortOrderSchema.default('desc'),
})

export type PaginationQuery = z.infer<typeof paginationQuerySchema>
export type SortOrder = z.infer<typeof sortOrderSchema>

/**
 * Builds the shared query schema for a collection endpoint.
 *
 * `allowedSortFields` is the route's whitelist of sortable columns; `sort`
 * itself stays optional so each route can fall back to its own default
 * ordering when it is omitted.
 */
export function listQuerySchema<const T extends readonly string[]>(...allowedSortFields: T) {
  return paginationQuerySchema.extend({
    sort: z.enum(allowedSortFields.length > 0 ? allowedSortFields : (['id'] as const)).optional(),
  })
}

// A type alias (not an interface) so it satisfies Record<string, unknown>
// intersections such as ApiSuccessBody['meta'] in utils/api-response.ts.
export type PaginationMeta = {
  total: number
  page: number
  pageSize: number
  pageCount: number
}

export function buildPaginationMeta(total: number, page: number, pageSize: number): PaginationMeta {
  return {
    total,
    page,
    pageSize,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
  }
}

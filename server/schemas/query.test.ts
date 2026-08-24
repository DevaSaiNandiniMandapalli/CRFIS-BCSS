import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { ZodError } from 'zod'
import { assetCriticalitySchema, riskCategorySchema } from './domain.js'
import {
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  buildPaginationMeta,
  listQuerySchema,
  paginationQuerySchema,
} from './query.js'

function expectZodFailure(run: () => unknown): void {
  assert.throws(run, (error: unknown) => error instanceof ZodError)
}

describe('paginationQuerySchema', () => {
  it('applies safe defaults', () => {
    assert.deepEqual(paginationQuerySchema.parse({}), {
      page: DEFAULT_PAGE,
      pageSize: DEFAULT_PAGE_SIZE,
      order: 'desc',
    })
  })

  it('coerces query-string numbers', () => {
    const parsed = paginationQuerySchema.parse({ page: '3', pageSize: '50' })

    assert.equal(parsed.page, 3)
    assert.equal(parsed.pageSize, 50)
  })

  it('enforces the maximum page size', () => {
    expectZodFailure(() => paginationQuerySchema.parse({ pageSize: String(MAX_PAGE_SIZE + 1) }))
  })

  it('rejects non-positive pages', () => {
    expectZodFailure(() => paginationQuerySchema.parse({ page: '0' }))
    expectZodFailure(() => paginationQuerySchema.parse({ page: '-2' }))
  })

  it('restricts ordering to asc/desc', () => {
    expectZodFailure(() => paginationQuerySchema.parse({ order: 'up' }))
  })
})

describe('listQuerySchema', () => {
  it('whitelists sortable fields per route', () => {
    const schema = listQuerySchema('name', 'criticality')
    const parsed = schema.parse({ sort: 'name', order: 'asc' })

    assert.equal(parsed.sort, 'name')
    assert.equal(parsed.order, 'asc')
  })

  it('leaves sort optional for default ordering', () => {
    const schema = listQuerySchema('name')

    assert.equal(schema.parse({}).sort, undefined)
  })

  it('rejects sort fields outside the whitelist', () => {
    const schema = listQuerySchema('name')

    expectZodFailure(() => schema.parse({ sort: '; DROP TABLE users' }))
  })
})

describe('buildPaginationMeta', () => {
  it('computes page counts', () => {
    assert.deepEqual(buildPaginationMeta(45, 2, 20), {
      total: 45,
      page: 2,
      pageSize: 20,
      pageCount: 3,
    })
  })

  it('never returns zero pages for empty collections', () => {
    const meta = buildPaginationMeta(0, 1, 20)

    assert.equal(meta.pageCount, 1)
  })
})

describe('domain enums mirror frontend types', () => {
  it('accepts known categorical values', () => {
    assert.equal(assetCriticalitySchema.parse('Critical'), 'Critical')
    assert.equal(riskCategorySchema.parse('Insider Risk'), 'Insider Risk')
  })

  it('rejects invented values', () => {
    expectZodFailure(() => assetCriticalitySchema.parse('catastrophic'))
  })
})

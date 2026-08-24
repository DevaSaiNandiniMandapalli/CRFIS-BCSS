import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { buildApp } from '../app.js'

/*
 * Integration tests for the reports read API against the real
 * development database (read-only, intentionally empty).
 */

describe('GET /api/reports', () => {
  it('returns the established empty-collection envelope', async () => {
    const app = await buildApp()
    try {
      const response = await app.inject({ method: 'GET', url: '/api/reports' })
      const body = response.json()

      assert.equal(response.statusCode, 200)
      assert.deepEqual(body.data, [])
      assert.equal(body.meta.total, 0)
      assert.equal(body.meta.page, 1)
      assert.equal(body.meta.pageSize, 20)
    } finally {
      await app.close()
    }
  })

  it('applies pagination parameters', async () => {
    const app = await buildApp()
    try {
      const response = await app.inject({ method: 'GET', url: '/api/reports?page=2&pageSize=5' })

      assert.equal(response.statusCode, 200)
      assert.equal(response.json().meta.page, 2)
      assert.equal(response.json().meta.pageSize, 5)
    } finally {
      await app.close()
    }
  })

  it('accepts search and domain filters on an empty set', async () => {
    const app = await buildApp()
    try {
      const response = await app.inject({
        method: 'GET',
        url: '/api/reports?search=exposure&status=Ready&type=Financial%20Exposure%20Report',
      })

      assert.equal(response.statusCode, 200)
      assert.deepEqual(response.json().data, [])
    } finally {
      await app.close()
    }
  })

  it('accepts whitelisted sort fields with direction', async () => {
    const app = await buildApp()
    try {
      const response = await app.inject({
        method: 'GET',
        url: '/api/reports?sort=generatedAt&order=desc',
      })

      assert.equal(response.statusCode, 200)
    } finally {
      await app.close()
    }
  })

  it('rejects sort fields outside the whitelist', async () => {
    const app = await buildApp()
    try {
      const response = await app.inject({ method: 'GET', url: '/api/reports?sort=owner' })

      assert.equal(response.statusCode, 400)
    } finally {
      await app.close()
    }
  })

  it('rejects invented status values', async () => {
    const app = await buildApp()
    try {
      const response = await app.inject({ method: 'GET', url: '/api/reports?status=PUBLISHED' })

      assert.equal(response.statusCode, 400)
    } finally {
      await app.close()
    }
  })

  it('rejects invalid pagination', async () => {
    const app = await buildApp()
    try {
      const response = await app.inject({ method: 'GET', url: '/api/reports?pageSize=-1' })

      assert.equal(response.statusCode, 400)
    } finally {
      await app.close()
    }
  })
})

describe('GET /api/reports/:id', () => {
  it('returns the established 404 envelope for unknown ids', async () => {
    const app = await buildApp()
    try {
      const response = await app.inject({ method: 'GET', url: '/api/reports/REP-MISSING' })
      const body = response.json()

      assert.equal(response.statusCode, 404)
      assert.equal(body.error.code, 'REPORT_NOT_FOUND')
      assert.match(body.error.message, /REP-MISSING/)
    } finally {
      await app.close()
    }
  })
})

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { buildApp } from '../app.js'

/*
 * Integration tests for the remediation read API against the real
 * development database (read-only, intentionally empty).
 */

describe('GET /api/remediations', () => {
  it('returns the established empty-collection envelope', async () => {
    const app = await buildApp()
    try {
      const response = await app.inject({ method: 'GET', url: '/api/remediations' })
      const body = response.json()

      assert.equal(response.statusCode, 200)
      assert.deepEqual(body.data, [])
      assert.equal(body.meta.total, 0)
      assert.equal(body.meta.page, 1)
      assert.equal(body.meta.pageSize, 20)
      assert.equal(body.meta.pageCount, 1)
      assert.deepEqual(body.meta.stats.byPriority, {})
      assert.deepEqual(body.meta.stats.expectedReductionByCurrency, {})
      assert.equal(body.meta.stats.overdueCount, 0)
    } finally {
      await app.close()
    }
  })

  it('applies pagination parameters', async () => {
    const app = await buildApp()
    try {
      const response = await app.inject({
        method: 'GET',
        url: '/api/remediations?page=2&pageSize=10',
      })

      assert.equal(response.statusCode, 200)
      assert.equal(response.json().meta.page, 2)
      assert.equal(response.json().meta.pageSize, 10)
    } finally {
      await app.close()
    }
  })

  it('accepts search and all domain filters on an empty set', async () => {
    const app = await buildApp()
    try {
      const response = await app.inject({
        method: 'GET',
        url: '/api/remediations?search=backup&priority=Critical&status=Open&category=Access%20Control',
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
        url: '/api/remediations?sort=expectedReduction&order=desc',
      })

      assert.equal(response.statusCode, 200)
    } finally {
      await app.close()
    }
  })

  it('rejects sort fields outside the whitelist', async () => {
    const app = await buildApp()
    try {
      const response = await app.inject({ method: 'GET', url: '/api/remediations?sort=riskId' })

      assert.equal(response.statusCode, 400)
      assert.equal(response.json().error.code, 'VALIDATION_ERROR')
    } finally {
      await app.close()
    }
  })

  it('rejects invented priority values', async () => {
    const app = await buildApp()
    try {
      const response = await app.inject({
        method: 'GET',
        url: '/api/remediations?priority=WHENEVER',
      })

      assert.equal(response.statusCode, 400)
    } finally {
      await app.close()
    }
  })

  it('rejects invented status values', async () => {
    const app = await buildApp()
    try {
      const response = await app.inject({
        method: 'GET',
        url: '/api/remediations?status=FINISHED',
      })

      assert.equal(response.statusCode, 400)
    } finally {
      await app.close()
    }
  })

  it('rejects invalid pagination', async () => {
    const app = await buildApp()
    try {
      const response = await app.inject({ method: 'GET', url: '/api/remediations?pageSize=500' })

      assert.equal(response.statusCode, 400)
    } finally {
      await app.close()
    }
  })
})

describe('GET /api/remediations/:id', () => {
  it('returns the established 404 envelope for unknown ids', async () => {
    const app = await buildApp()
    try {
      const response = await app.inject({ method: 'GET', url: '/api/remediations/DOES-NOT-EXIST' })
      const body = response.json()

      assert.equal(response.statusCode, 404)
      assert.equal(body.error.code, 'REMEDIATION_NOT_FOUND')
      assert.match(body.error.message, /DOES-NOT-EXIST/)
    } finally {
      await app.close()
    }
  })
})

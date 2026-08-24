import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { buildApp } from '../app.js'

/*
 * Integration tests for GET /api/risks against the real development
 * database (read-only). The database is intentionally empty, so list
 * assertions assert the empty-collection contract. The Asset display
 * relationship contract is covered by the mapper unit tests.
 */

describe('GET /api/risks', () => {
  it('returns the established empty-collection envelope', async () => {
    const app = await buildApp()
    try {
      const response = await app.inject({ method: 'GET', url: '/api/risks' })
      const body = response.json()

      assert.equal(response.statusCode, 200)
      assert.deepEqual(body.data, [])
      assert.equal(body.meta.total, 0)
      assert.equal(body.meta.page, 1)
      assert.equal(body.meta.pageSize, 20)
      assert.deepEqual(body.meta.stats.bySeverity, {})
      assert.deepEqual(body.meta.stats.exposureByCurrency, {})
    } finally {
      await app.close()
    }
  })

  it('accepts severity/status/category filters on an empty set', async () => {
    const app = await buildApp()
    try {
      const response = await app.inject({
        method: 'GET',
        url: '/api/risks?severity=Critical&status=Open&category=Ransomware&likelihood=High&search=ransom',
      })
      const body = response.json()

      assert.equal(response.statusCode, 200)
      assert.deepEqual(body.data, [])
      assert.equal(body.meta.total, 0)
    } finally {
      await app.close()
    }
  })

  it('rejects sort fields outside the whitelist', async () => {
    const app = await buildApp()
    try {
      const response = await app.inject({ method: 'GET', url: '/api/risks?sort=assetId; DROP TABLE' })

      assert.equal(response.statusCode, 400)
      assert.equal(response.json().error.code, 'VALIDATION_ERROR')
    } finally {
      await app.close()
    }
  })

  it('rejects invented severity values', async () => {
    const app = await buildApp()
    try {
      const response = await app.inject({ method: 'GET', url: '/api/risks?severity=EXTINCTION' })

      assert.equal(response.statusCode, 400)
    } finally {
      await app.close()
    }
  })

  it('rejects invalid pagination', async () => {
    const app = await buildApp()
    try {
      const response = await app.inject({ method: 'GET', url: '/api/risks?pageSize=0' })

      assert.equal(response.statusCode, 400)
    } finally {
      await app.close()
    }
  })

  it('rejects invalid order values', async () => {
    const app = await buildApp()
    try {
      const response = await app.inject({ method: 'GET', url: '/api/risks?order=sideways' })

      assert.equal(response.statusCode, 400)
    } finally {
      await app.close()
    }
  })
})

describe('GET /api/risks/:id', () => {
  it('returns the established 404 envelope for unknown ids', async () => {
    const app = await buildApp()
    try {
      const response = await app.inject({ method: 'GET', url: '/api/risks/RISK-MISSING' })
      const body = response.json()

      assert.equal(response.statusCode, 404)
      assert.equal(body.error.code, 'RISK_NOT_FOUND')
      assert.match(body.error.message, /RISK-MISSING/)
    } finally {
      await app.close()
    }
  })
})

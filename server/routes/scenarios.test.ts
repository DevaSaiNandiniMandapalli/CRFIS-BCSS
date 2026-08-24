import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { buildApp } from '../app.js'

/*
 * Integration tests for the scenario read API against the real
 * development database (read-only, intentionally empty).
 */

describe('GET /api/scenarios', () => {
  it('returns the established empty-collection envelope', async () => {
    const app = await buildApp()
    try {
      const response = await app.inject({ method: 'GET', url: '/api/scenarios' })
      const body = response.json()

      assert.equal(response.statusCode, 200)
      assert.deepEqual(body.data, [])
      assert.equal(body.meta.total, 0)
      assert.equal(body.meta.page, 1)
      assert.equal(body.meta.pageSize, 20)
      assert.equal(body.meta.pageCount, 1)
      assert.deepEqual(body.meta.stats.bySeverity, {})
      assert.deepEqual(body.meta.stats.estimatedImpactByCurrency, {})
    } finally {
      await app.close()
    }
  })

  it('applies pagination parameters', async () => {
    const app = await buildApp()
    try {
      const response = await app.inject({
        method: 'GET',
        url: '/api/scenarios?page=3&pageSize=15',
      })

      assert.equal(response.statusCode, 200)
      assert.equal(response.json().meta.page, 3)
      assert.equal(response.json().meta.pageSize, 15)
    } finally {
      await app.close()
    }
  })

  it('accepts search and all domain filters on an empty set', async () => {
    const app = await buildApp()
    try {
      const response = await app.inject({
        method: 'GET',
        url: '/api/scenarios?search=ransomware&severity=Critical&status=Draft&category=Ransomware&probability=Medium',
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
        url: '/api/scenarios?sort=estimatedImpact&order=desc',
      })

      assert.equal(response.statusCode, 200)
    } finally {
      await app.close()
    }
  })

  it('rejects sort fields outside the whitelist', async () => {
    const app = await buildApp()
    try {
      const response = await app.inject({ method: 'GET', url: '/api/scenarios?sort=businessImpact' })

      assert.equal(response.statusCode, 400)
      assert.equal(response.json().error.code, 'VALIDATION_ERROR')
    } finally {
      await app.close()
    }
  })

  it('rejects invented severity values', async () => {
    const app = await buildApp()
    try {
      const response = await app.inject({ method: 'GET', url: '/api/scenarios?severity=EXTINCTION' })

      assert.equal(response.statusCode, 400)
    } finally {
      await app.close()
    }
  })

  it('rejects invented status values', async () => {
    const app = await buildApp()
    try {
      const response = await app.inject({ method: 'GET', url: '/api/scenarios?status=SIGNED' })

      assert.equal(response.statusCode, 400)
    } finally {
      await app.close()
    }
  })

  it('rejects invalid pagination', async () => {
    const app = await buildApp()
    try {
      const response = await app.inject({ method: 'GET', url: '/api/scenarios?page=-4' })

      assert.equal(response.statusCode, 400)
    } finally {
      await app.close()
    }
  })
})

describe('GET /api/scenarios/:id', () => {
  it('returns the established 404 envelope for unknown ids', async () => {
    const app = await buildApp()
    try {
      const response = await app.inject({ method: 'GET', url: '/api/scenarios/DOES-NOT-EXIST' })
      const body = response.json()

      assert.equal(response.statusCode, 404)
      assert.equal(body.error.code, 'SCENARIO_NOT_FOUND')
      assert.match(body.error.message, /DOES-NOT-EXIST/)
    } finally {
      await app.close()
    }
  })
})

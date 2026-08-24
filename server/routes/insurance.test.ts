import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { buildApp } from '../app.js'

/*
 * Integration tests for the insurance read API against the real
 * development database (read-only, intentionally empty).
 */

describe('GET /api/insurance', () => {
  it('returns the established empty-collection envelope', async () => {
    const app = await buildApp()
    try {
      const response = await app.inject({ method: 'GET', url: '/api/insurance' })
      const body = response.json()

      assert.equal(response.statusCode, 200)
      assert.deepEqual(body.data, [])
      assert.equal(body.meta.total, 0)
      assert.equal(body.meta.page, 1)
      assert.equal(body.meta.pageSize, 20)
      assert.equal(body.meta.pageCount, 1)
      assert.deepEqual(body.meta.stats.byStatus, {})
      assert.deepEqual(body.meta.stats.coverageLimitByCurrency, {})
      assert.deepEqual(body.meta.stats.premiumByCurrency, {})
      assert.deepEqual(body.meta.stats.deductibleByCurrency, {})
    } finally {
      await app.close()
    }
  })

  it('applies pagination parameters', async () => {
    const app = await buildApp()
    try {
      const response = await app.inject({
        method: 'GET',
        url: '/api/insurance?page=2&pageSize=5',
      })

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
        url: '/api/insurance?search=cyber&status=Active&coverageType=Cyber%20Liability',
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
        url: '/api/insurance?sort=coverageLimit&order=desc',
      })

      assert.equal(response.statusCode, 200)
    } finally {
      await app.close()
    }
  })

  it('rejects sort fields outside the whitelist', async () => {
    const app = await buildApp()
    try {
      const response = await app.inject({ method: 'GET', url: '/api/insurance?sort=premium' })

      // premium is NOT in the whitelist for this route
      assert.equal(response.statusCode, 400)
      assert.equal(response.json().error.code, 'VALIDATION_ERROR')
    } finally {
      await app.close()
    }
  })

  it('rejects invented status values', async () => {
    const app = await buildApp()
    try {
      const response = await app.inject({ method: 'GET', url: '/api/insurance?status=LAPSED' })

      assert.equal(response.statusCode, 400)
    } finally {
      await app.close()
    }
  })

  it('rejects invented coverage types', async () => {
    const app = await buildApp()
    try {
      const response = await app.inject({
        method: 'GET',
        url: '/api/insurance?coverageType=Meteor%20Damage',
      })

      assert.equal(response.statusCode, 400)
    } finally {
      await app.close()
    }
  })

  it('rejects invalid pagination', async () => {
    const app = await buildApp()
    try {
      const response = await app.inject({ method: 'GET', url: '/api/insurance?pageSize=0' })

      assert.equal(response.statusCode, 400)
    } finally {
      await app.close()
    }
  })
})

describe('GET /api/insurance/:id', () => {
  it('returns the established 404 envelope for unknown ids', async () => {
    const app = await buildApp()
    try {
      const response = await app.inject({ method: 'GET', url: '/api/insurance/POL-MISSING' })
      const body = response.json()

      assert.equal(response.statusCode, 404)
      assert.equal(body.error.code, 'INSURANCE_POLICY_NOT_FOUND')
      assert.match(body.error.message, /POL-MISSING/)
    } finally {
      await app.close()
    }
  })
})

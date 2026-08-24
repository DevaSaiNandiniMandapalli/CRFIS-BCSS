import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { buildApp } from '../app.js'

/*
 * Integration tests for GET /api/assets against the real development
 * database (read-only). The database is intentionally empty, so list
 * assertions assert the empty-collection contract.
 */

describe('GET /api/assets', () => {
  it('returns the established empty-collection envelope', async () => {
    const app = await buildApp()
    try {
      const response = await app.inject({ method: 'GET', url: '/api/assets' })
      const body = response.json()

      assert.equal(response.statusCode, 200)
      assert.deepEqual(body.data, [])
      assert.equal(body.meta.total, 0)
      assert.equal(body.meta.page, 1)
      assert.equal(body.meta.pageSize, 20)
      assert.equal(body.meta.pageCount, 1)
      assert.deepEqual(body.meta.stats.byCriticality, {})
      assert.deepEqual(body.meta.stats.annualValueByCurrency, {})
    } finally {
      await app.close()
    }
  })

  it('applies page and pageSize parameters', async () => {
    const app = await buildApp()
    try {
      const response = await app.inject({
        method: 'GET',
        url: '/api/assets?page=2&pageSize=5',
      })

      assert.equal(response.statusCode, 200)
      assert.equal(response.json().meta.page, 2)
      assert.equal(response.json().meta.pageSize, 5)
    } finally {
      await app.close()
    }
  })

  it('rejects page sizes above the maximum', async () => {
    const app = await buildApp()
    try {
      const response = await app.inject({ method: 'GET', url: '/api/assets?pageSize=101' })
      const body = response.json()

      assert.equal(response.statusCode, 400)
      assert.equal(body.error.code, 'VALIDATION_ERROR')
    } finally {
      await app.close()
    }
  })

  it('rejects non-positive pages', async () => {
    const app = await buildApp()
    try {
      const response = await app.inject({ method: 'GET', url: '/api/assets?page=0' })

      assert.equal(response.statusCode, 400)
    } finally {
      await app.close()
    }
  })

  it('rejects sort fields outside the whitelist', async () => {
    const app = await buildApp()
    try {
      const response = await app.inject({ method: 'GET', url: '/api/assets?sort=id; DROP TABLE' })

      assert.equal(response.statusCode, 400)
      assert.equal(response.json().error.code, 'VALIDATION_ERROR')
    } finally {
      await app.close()
    }
  })

  it('rejects invented filter values', async () => {
    const app = await buildApp()
    try {
      const response = await app.inject({ method: 'GET', url: '/api/assets?criticality=catastrophic' })

      assert.equal(response.statusCode, 400)
    } finally {
      await app.close()
    }
  })

  it('accepts whitelisted sort fields with direction', async () => {
    const app = await buildApp()
    try {
      const response = await app.inject({
        method: 'GET',
        url: '/api/assets?sort=criticality&order=asc&search=core',
      })

      assert.equal(response.statusCode, 200)
    } finally {
      await app.close()
    }
  })
})

describe('GET /api/assets/:id', () => {
  it('returns the established 404 envelope for unknown ids', async () => {
    const app = await buildApp()
    try {
      const response = await app.inject({ method: 'GET', url: '/api/assets/DOES-NOT-EXIST' })
      const body = response.json()

      assert.equal(response.statusCode, 404)
      assert.equal(body.error.code, 'ASSET_NOT_FOUND')
      assert.match(body.error.message, /DOES-NOT-EXIST/)
    } finally {
      await app.close()
    }
  })
})

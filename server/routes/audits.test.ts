import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { buildApp } from '../app.js'

/*
 * Integration tests for the audit + audit-finding read APIs against the
 * real development database (read-only, intentionally empty).
 */

describe('GET /api/audits', () => {
  it('returns the established empty-collection envelope with finding stats', async () => {
    const app = await buildApp()
    try {
      const response = await app.inject({ method: 'GET', url: '/api/audits' })
      const body = response.json()

      assert.equal(response.statusCode, 200)
      assert.deepEqual(body.data, [])
      assert.equal(body.meta.total, 0)
      assert.equal(body.meta.pageSize, 20)
      assert.deepEqual(body.meta.stats.byStatus, {})
      // Relation-derived counts stay zero on an empty database.
      assert.equal(body.meta.stats.findingsTotal, 0)
      assert.equal(body.meta.stats.highCriticalFindings, 0)
    } finally {
      await app.close()
    }
  })

  it('applies pagination parameters', async () => {
    const app = await buildApp()
    try {
      const response = await app.inject({ method: 'GET', url: '/api/audits?page=2&pageSize=5' })

      assert.equal(response.statusCode, 200)
      assert.equal(response.json().meta.page, 2)
      assert.equal(response.json().meta.pageSize, 5)
    } finally {
      await app.close()
    }
  })

  it('accepts search, status and framework filters on an empty set', async () => {
    const app = await buildApp()
    try {
      const response = await app.inject({
        method: 'GET',
        url: '/api/audits?search=iso&status=Completed&framework=ISO%2027001',
      })

      assert.equal(response.statusCode, 200)
      assert.deepEqual(response.json().data, [])
    } finally {
      await app.close()
    }
  })

  it('rejects sort fields outside the whitelist', async () => {
    const app = await buildApp()
    try {
      const response = await app.inject({ method: 'GET', url: '/api/audits?sort=findings' })

      assert.equal(response.statusCode, 400)
    } finally {
      await app.close()
    }
  })

  it('rejects invalid status values', async () => {
    const app = await buildApp()
    try {
      const response = await app.inject({ method: 'GET', url: '/api/audits?status=CANCELLED' })

      assert.equal(response.statusCode, 400)
    } finally {
      await app.close()
    }
  })
})

describe('GET /api/audits/:id', () => {
  it('returns the established 404 envelope for unknown ids', async () => {
    const app = await buildApp()
    try {
      const response = await app.inject({ method: 'GET', url: '/api/audits/AUD-MISSING' })
      const body = response.json()

      assert.equal(response.statusCode, 404)
      assert.equal(body.error.code, 'AUDIT_NOT_FOUND')
      assert.match(body.error.message, /AUD-MISSING/)
    } finally {
      await app.close()
    }
  })
})

describe('GET /api/audit-findings', () => {
  it('returns the established empty-collection envelope', async () => {
    const app = await buildApp()
    try {
      const response = await app.inject({ method: 'GET', url: '/api/audit-findings' })
      const body = response.json()

      assert.equal(response.statusCode, 200)
      assert.deepEqual(body.data, [])
      assert.equal(body.meta.total, 0)
    } finally {
      await app.close()
    }
  })

  it('accepts severity/status/owner filters on an empty set', async () => {
    const app = await buildApp()
    try {
      const response = await app.inject({
        method: 'GET',
        url: '/api/audit-findings?severity=High&status=Open&owner=governance',
      })

      assert.equal(response.statusCode, 200)
      assert.deepEqual(response.json().data, [])
    } finally {
      await app.close()
    }
  })

  it('rejects sort fields outside the whitelist', async () => {
    const app = await buildApp()
    try {
      const response = await app.inject({
        method: 'GET',
        url: '/api/audit-findings?sort=remediationId',
      })

      assert.equal(response.statusCode, 400)
    } finally {
      await app.close()
    }
  })
})

describe('GET /api/audit-findings/:id', () => {
  it('returns the established 404 envelope for unknown ids', async () => {
    const app = await buildApp()
    try {
      const response = await app.inject({ method: 'GET', url: '/api/audit-findings/FND-MISSING' })
      const body = response.json()

      assert.equal(response.statusCode, 404)
      assert.equal(body.error.code, 'AUDIT_FINDING_NOT_FOUND')
      assert.match(body.error.message, /FND-MISSING/)
    } finally {
      await app.close()
    }
  })
})

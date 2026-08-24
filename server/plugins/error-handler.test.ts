import assert from 'node:assert/strict'
import Fastify from 'fastify'
import { describe, it } from 'node:test'
import { z } from 'zod'
import { HttpError, errorHandlingPlugin } from './error-handler.js'

async function buildTestApp() {
  const app = Fastify({ logger: false })

  await app.register(errorHandlingPlugin)

  app.get('/ok', async () => ({ ok: true }))

  app.get('/http-error', async () => {
    throw new HttpError(422, 'DOMAIN_RULE_VIOLATION', 'Referenced risk is missing.', {
      riskId: 'RISK-404',
    })
  })

  app.get('/boom', async () => {
    throw new Error('connect ECONNREFUSED postgres://admin:secret@db.internal:5432/crfis')
  })

  app.get('/framework-error', async () => {
    const error = new Error('body exceeded 1 MB limit') as Error & { statusCode?: number }
    error.statusCode = 413

    throw error
  })

  app.get('/zod', async () => {
    const schema = z.object({ q: z.string().min(3) })
    const parsed = schema.safeParse({ q: 'x' })

    if (!parsed.success) {
      throw parsed.error
    }

    return parsed.data
  })

  await app.ready()

  return app
}

describe('central error handling', () => {
  it('leaves successful responses untouched', async () => {
    const app = await buildTestApp()
    try {
      const response = await app.inject({ method: 'GET', url: '/ok' })

      assert.equal(response.statusCode, 200)
      assert.deepEqual(response.json(), { ok: true })
    } finally {
      await app.close()
    }
  })

  it('maps ZodErrors to a 400 validation envelope', async () => {
    const app = await buildTestApp()
    try {
      const response = await app.inject({ method: 'GET', url: '/zod' })
      const body = response.json()

      assert.equal(response.statusCode, 400)
      assert.equal(body.error.code, 'VALIDATION_ERROR')
      assert.ok(Array.isArray(body.error.details))
      assert.equal(body.error.details.length > 0, true)
    } finally {
      await app.close()
    }
  })

  it('passes HttpError payloads through with their status code', async () => {
    const app = await buildTestApp()
    try {
      const response = await app.inject({ method: 'GET', url: '/http-error' })
      const body = response.json()

      assert.equal(response.statusCode, 422)
      assert.deepEqual(body.error, {
        code: 'DOMAIN_RULE_VIOLATION',
        message: 'Referenced risk is missing.',
        details: { riskId: 'RISK-404' },
      })
    } finally {
      await app.close()
    }
  })

  it('hides unexpected server error internals behind a generic 500', async () => {
    const app = await buildTestApp()
    try {
      const response = await app.inject({ method: 'GET', url: '/boom' })
      const body = response.json()
      const serialized = response.body

      assert.equal(response.statusCode, 500)
      assert.equal(body.error.code, 'INTERNAL_SERVER_ERROR')
      assert.equal(body.error.message, 'Internal server error.')
      assert.equal(serialized.includes('postgres'), false)
      assert.equal(serialized.includes('secret'), false)
      assert.equal(serialized.includes('db.internal'), false)
    } finally {
      await app.close()
    }
  })

  it('forwards trusted client-error messages from framework errors', async () => {
    const app = await buildTestApp()
    try {
      const response = await app.inject({ method: 'GET', url: '/framework-error' })
      const body = response.json()

      assert.equal(response.statusCode, 413)
      assert.equal(body.error.message, 'body exceeded 1 MB limit')
    } finally {
      await app.close()
    }
  })

  it('returns a 404 envelope for unknown routes', async () => {
    const app = await buildTestApp()
    try {
      const response = await app.inject({ method: 'GET', url: '/definitely/missing' })
      const body = response.json()

      assert.equal(response.statusCode, 404)
      assert.equal(body.error.code, 'NOT_FOUND')
      assert.match(body.error.message, /GET:\/definitely\/missing/)
    } finally {
      await app.close()
    }
  })
})

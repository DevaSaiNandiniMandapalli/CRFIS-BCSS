import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { buildApp } from '../app.js'

/*
 * Integration tests for the deterministic analyst endpoint against the
 * real development database (read-only, intentionally empty). The endpoint
 * must never claim an external AI provider and never fabricate values.
 */

describe('GET /api/ai/analysis', () => {
  it('labels output as deterministic local analysis with human-in-the-loop language', async () => {
    const app = await buildApp()
    try {
      const response = await app.inject({ method: 'GET', url: '/api/ai/analysis' })
      const body = response.json()

      assert.equal(response.statusCode, 200)
      assert.equal(body.data.mode, 'deterministic')
      assert.equal(body.data.provider, 'local-rule-based')
      assert.equal(body.data.humanInTheLoop, true)
      assert.match(body.data.disclaimer, /No external AI provider is connected/)
      assert.match(body.data.disclaimer, /human reviewer/i)
      assert.equal(typeof body.data.generatedAt, 'string')
    } finally {
      await app.close()
    }
  })

  it('returns structured insights without fabricated financial values on an empty database', async () => {
    const app = await buildApp()
    try {
      const response = await app.inject({ method: 'GET', url: '/api/ai/analysis' })
      const body = response.json()

      assert.equal(response.statusCode, 200)

      const insights = body.data.insights as Array<Record<string, unknown>>
      assert.ok(Array.isArray(insights))

      const byId = new Map(insights.map((insight) => [insight.id as string, insight]))

      // Ranked list insights stay empty - no rows exist to rank.
      const highestExposure = byId.get('highest-exposure-risks') as {
        items?: unknown[]
      }

      assert.deepEqual(highestExposure?.items, [])

      // Count insights are honest zeros.
      assert.equal((byId.get('critical-risk-count') as { count: number }).count, 0)
      assert.equal((byId.get('coverage-gap-context') as { count: number }).count, 0)

      // Bucket insights carry no fabricated currency totals on an empty DB.
      const coverage = byId.get('insurance-coverage') as {
        kind: string
        buckets?: Record<string, string>
      }

      assert.equal(coverage.kind, 'buckets')
      assert.equal(Object.keys(coverage.buckets ?? {}).length, 0)
    } finally {
      await app.close()
    }
  })
})

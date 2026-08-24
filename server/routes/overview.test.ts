import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { buildApp } from '../app.js'

/*
 * Integration tests for GET /api/overview against the real development
 * database (read-only, intentionally empty). Empty tables must produce an
 * honest overview: numeric counters at zero and monetary families null
 * rather than fabricated values.
 */

describe('GET /api/overview', () => {
  it('returns honest zero/unavailable metrics on an empty database', async () => {
    const app = await buildApp()
    try {
      const response = await app.inject({ method: 'GET', url: '/api/overview' })
      const body = response.json()

      assert.equal(response.statusCode, 200)

      const data = body.data

      assert.equal(typeof data.generatedAt, 'string')

      // Counts are real zeros on an empty database.
      assert.equal(data.riskCount, 0)
      assert.equal(data.criticalRiskCount, 0)
      assert.equal(data.assetCount, 0)
      assert.equal(data.highValueAssetCount, 0)
      assert.equal(data.openRemediationCount, 0)
      assert.equal(data.overdueRemediationCount, 0)
      assert.equal(data.policyCount, 0)
      assert.equal(data.scenarioCount, 0)
      assert.equal(data.auditProgramCount, 0)
      assert.equal(data.auditFindingsTotal, 0)

      // Monetary families are unavailable rather than fabricated.
      assert.equal(data.exposureByCurrency, null)
      assert.equal(data.annualizedLossExpectancyByCurrency, null)
      assert.equal(data.remediationOpportunityByCurrency, null)
      assert.equal(data.remediationCostByCurrency, null)
      assert.equal(data.totalAssetValueByCurrency, null)
      assert.equal(data.insuranceCoverageByCurrency, null)
      assert.equal(data.insurancePremiumByCurrency, null)
      assert.equal(data.insuranceDeductibleByCurrency, null)
      assert.equal(data.scenarioImpactByCurrency, null)
    } finally {
      await app.close()
    }
  })

  it('derives cross-family per-currency structures without mixing currencies', async () => {
    const app = await buildApp()
    try {
      const response = await app.inject({ method: 'GET', url: '/api/overview' })
      const data = response.json().data

      // Derived families exist as objects (empty when no rows) - never as a
      // single combined total across currencies.
      assert.deepEqual(data.remainingExposureByCurrency, {})
      assert.deepEqual(data.netRemediationBenefitByCurrency, {})
      assert.deepEqual(data.coverageGapByCurrency, {})
      assert.equal(data.reductionCostRatioByCurrency, null)
    } finally {
      await app.close()
    }
  })
})

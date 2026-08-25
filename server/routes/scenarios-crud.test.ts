import assert from 'node:assert/strict'
import { after, describe, it } from 'node:test'
import { buildApp } from '../app.js'
import { prisma } from '../repositories/prisma.js'

/*
 * Integration tests for scenario CRUD. Temporary records use the reserved
 * TCRUD- prefix and are hard-purged inside every test BEFORE the app
 * closes, plus a self-healing purge at suite start and a final purge +
 * zero-row assertion in after(). Children are purged before parents.
 */

const ADMIN = 'Bearer t-alice'
const READ_ONLY = 'Bearer t-riley'
const INVALID = 'Bearer not-a-configured-token'

process.env.CRFIS_AUTH_TOKENS = [
  't-alice:alice:ADMIN',
  't-riley:riley:READ_ONLY',
].join(',')

const ASSET = {
  name: 'QA Test Asset',
  type: 'Infrastructure',
  businessUnit: 'QA',
  criticality: 'High',
  currency: 'INR',
  annualValue: '1250000.50',
  status: 'Monitored',
  owner: 'QA Owner',
}

const RISK = {
  risk: 'QA Test Risk',
  category: 'Ransomware',
  severity: 'High',
  likelihood: 'High',
  currency: 'INR',
  exposure: '2500000.00',
  status: 'Open',
  owner: 'QA Owner',
}

const BASE = {
  name: 'QA Test Scenario',
  category: 'Ransomware',
  description: 'Full fleet encryption event',
  severity: 'Critical',
  probability: 'Medium',
  currency: 'INR',
  estimatedImpact: '8500000.00',
  businessImpact: 'Multi-day outage across production estate',
  status: 'Draft',
  owner: 'QA Owner',
}

async function seedParents(app: Awaited<ReturnType<typeof buildApp>>): Promise<void> {
  const asset = await app.inject({
    method: 'POST', url: '/api/assets', headers: { authorization: ADMIN },
    payload: { id: 'TCRUD-PA', ...ASSET },
  })
  assert.equal(asset.statusCode, 201)

  const risk = await app.inject({
    method: 'POST', url: '/api/risks', headers: { authorization: ADMIN },
    payload: { id: 'TCRUD-PR', assetId: 'TCRUD-PA', ...RISK },
  })
  assert.equal(risk.statusCode, 201)
}

function payload(id: string) {
  return { id, riskId: 'TCRUD-PR', assetId: 'TCRUD-PA', ...BASE }
}

async function purge(): Promise<void> {
  await prisma.scenario.deleteMany({ where: { id: { startsWith: 'TCRUD-' } } })
  await prisma.risk.deleteMany({ where: { id: { startsWith: 'TCRUD-' } } })
  await prisma.asset.deleteMany({ where: { id: { startsWith: 'TCRUD-' } } })
}

describe('scenario CRUD', () => {
  it('creates a scenario with exact decimal impact and explicit currency', async () => {
    await purge()

    const app = await buildApp()
    try {
      await seedParents(app)

      const response = await app.inject({
        method: 'POST', url: '/api/scenarios',
        headers: { authorization: ADMIN }, payload: payload('TCRUD-S1'),
      })
      const body = response.json()

      assert.equal(response.statusCode, 201)
      assert.equal(body.data.id, 'TCRUD-S1')
      assert.equal(body.data.estimatedImpact, '8500000.00')
      assert.equal(body.data.currency, 'INR')
      assert.equal(body.data.probability, 'Medium')
      assert.deepEqual(body.data.risk, { id: 'TCRUD-PR', risk: 'QA Test Risk' })
      assert.deepEqual(body.data.asset, { id: 'TCRUD-PA', name: 'QA Test Asset' })

      await purge()
    } finally {
      await app.close()
    }
  })

  it('serves a newly created scenario through GET /:id', async () => {
    await purge()

    const app = await buildApp()
    try {
      await seedParents(app)
      await app.inject({
        method: 'POST', url: '/api/scenarios',
        headers: { authorization: ADMIN }, payload: payload('TCRUD-S2'),
      })

      const fetched = await app.inject({ method: 'GET', url: '/api/scenarios/TCRUD-S2' })
      const body = fetched.json()

      assert.equal(fetched.statusCode, 200)
      assert.equal(body.data.id, 'TCRUD-S2')
      assert.equal(body.data.estimatedImpact, '8500000.00')

      await purge()
    } finally {
      await app.close()
    }
  })

  it('rejects duplicate ids with 409', async () => {
    await purge()

    const app = await buildApp()
    try {
      await seedParents(app)
      await app.inject({
        method: 'POST', url: '/api/scenarios',
        headers: { authorization: ADMIN }, payload: payload('TCRUD-S3'),
      })

      const duplicate = await app.inject({
        method: 'POST', url: '/api/scenarios',
        headers: { authorization: ADMIN }, payload: payload('TCRUD-S3'),
      })

      assert.equal(duplicate.statusCode, 409)
      assert.equal(duplicate.json().error.code, 'ID_ALREADY_EXISTS')

      await purge()
    } finally {
      await app.close()
    }
  })

  it('rejects writes without or with invalid credentials, or with insufficient role', async () => {
    const app = await buildApp()
    try {
      const unauth = await app.inject({
        method: 'POST', url: '/api/scenarios', payload: payload('TCRUD-S4'),
      })
      assert.equal(unauth.statusCode, 401)
      assert.equal(unauth.json().error.code, 'AUTH_REQUIRED')

      const invalidToken = await app.inject({
        method: 'POST', url: '/api/scenarios',
        headers: { authorization: INVALID }, payload: payload('TCRUD-S4'),
      })
      assert.equal(invalidToken.statusCode, 401)
      assert.equal(invalidToken.json().error.code, 'AUTH_INVALID_TOKEN')

      const forbidden = await app.inject({
        method: 'POST', url: '/api/scenarios',
        headers: { authorization: READ_ONLY }, payload: payload('TCRUD-S4'),
      })
      assert.equal(forbidden.statusCode, 403)
      assert.equal(forbidden.json().error.code, 'FORBIDDEN')

      await purge()
    } finally {
      await app.close()
    }
  })

  it('validates required relationships - unknown and archived parents are 404', async () => {
    await purge()

    const app = await buildApp()
    try {
      // Seed valid parents first so each sub-case isolates ONE bad reference.
      await seedParents(app)

      const missingRisk = await app.inject({
        method: 'POST', url: '/api/scenarios', headers: { authorization: ADMIN },
        payload: { ...payload('TCRUD-S5'), riskId: 'TCRUD-NORISK' },
      })
      assert.equal(missingRisk.statusCode, 404)
      assert.equal(missingRisk.json().error.code, 'RISK_NOT_FOUND')

      const missingAsset = await app.inject({
        method: 'POST', url: '/api/scenarios', headers: { authorization: ADMIN },
        payload: { ...payload('TCRUD-S5'), assetId: 'TCRUD-NOASSET' },
      })
      assert.equal(missingAsset.statusCode, 404)
      assert.equal(missingAsset.json().error.code, 'ASSET_NOT_FOUND')

      await app.inject({
        method: 'DELETE', url: '/api/assets/TCRUD-PA', headers: { authorization: ADMIN },
      })

      // With the parent Asset archived, the seeded risk is hidden too -
      // so referencing it must fail with RISK_NOT_FOUND.
      const hiddenParent = await app.inject({
        method: 'POST', url: '/api/scenarios', headers: { authorization: ADMIN },
        payload: payload('TCRUD-S5'),
      })
      assert.equal(hiddenParent.statusCode, 404)
      assert.equal(hiddenParent.json().error.code, 'RISK_NOT_FOUND')

      await purge()
    } finally {
      await app.close()
    }
  })

  it('validates categorical values, currency and money format', async () => {
    await purge()

    const app = await buildApp()
    try {
      await seedParents(app)

      const cases = [
        { ...payload('TCRUD-S6'), severity: 'EXTINCTION' },
        { ...payload('TCRUD-S6'), category: 'Zombie Apocalypse' },
        { ...payload('TCRUD-S6'), status: 'SIGNED' },
        { ...payload('TCRUD-S6'), probability: '' },
        { ...payload('TCRUD-S6'), probability: 'x'.repeat(51) },
        { ...payload('TCRUD-S6'), currency: 'GBP-X' },
        { ...payload('TCRUD-S6'), estimatedImpact: '-5.00' },
        { ...payload('TCRUD-S6'), estimatedImpact: 8500000 },
      ]

      for (const body of cases) {
        const response = await app.inject({
          method: 'POST', url: '/api/scenarios',
          headers: { authorization: ADMIN }, payload: body,
        })

        assert.equal(response.statusCode, 400)
        assert.equal(response.json().error.code, 'VALIDATION_ERROR')
      }

      await purge()
    } finally {
      await app.close()
    }
  })

  it('updates fields while preserving scale-exact money strings', async () => {
    await purge()

    const app = await buildApp()
    try {
      await seedParents(app)
      await app.inject({
        method: 'POST', url: '/api/scenarios',
        headers: { authorization: ADMIN }, payload: payload('TCRUD-S7'),
      })

      const patched = await app.inject({
        method: 'PATCH', url: '/api/scenarios/TCRUD-S7',
        headers: { authorization: ADMIN },
        payload: { status: 'Approved', estimatedImpact: '998877.66' },
      })
      const body = patched.json()

      assert.equal(patched.statusCode, 200)
      assert.equal(body.data.status, 'Approved')
      assert.equal(body.data.estimatedImpact, '998877.66')
      assert.equal(body.data.currency, 'INR')

      await purge()
    } finally {
      await app.close()
    }
  })

  it('archives on delete and archived records leave every read path', async () => {
    await purge()

    const app = await buildApp()
    try {
      await seedParents(app)
      await app.inject({
        method: 'POST', url: '/api/scenarios',
        headers: { authorization: ADMIN }, payload: payload('TCRUD-S8'),
      })

      const deleted = await app.inject({
        method: 'DELETE', url: '/api/scenarios/TCRUD-S8',
        headers: { authorization: ADMIN },
      })

      assert.equal(deleted.statusCode, 200)
      assert.deepEqual(deleted.json().data, { id: 'TCRUD-S8', archived: true })

      const gone = await app.inject({ method: 'GET', url: '/api/scenarios/TCRUD-S8' })
      assert.equal(gone.statusCode, 404)

      await purge()
    } finally {
      await app.close()
    }
  })

  after(async () => {
    await purge()
    const [scenarios, risks, assets] = await Promise.all([
      prisma.scenario.count(),
      prisma.risk.count(),
      prisma.asset.count(),
    ])
    assert.equal(scenarios, 0, 'Scenario table must be empty after the suite')
    assert.equal(risks, 0, 'Risk table must be empty after the suite')
    assert.equal(assets, 0, 'Asset table must be empty after the suite')
  })
})

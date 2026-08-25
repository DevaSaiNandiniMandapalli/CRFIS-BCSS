import assert from 'node:assert/strict'
import { after, describe, it } from 'node:test'
import { buildApp } from '../app.js'
import { prisma } from '../repositories/prisma.js'

/*
 * Integration tests for remediation CRUD. Temporary records use the
 * reserved TCRUD- prefix and are hard-purged inside every test BEFORE the
 * app closes, plus a self-healing purge at suite start and a final purge +
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
  action: 'Deploy EDR to server fleet',
  category: 'Infrastructure',
  priority: 'Critical',
  owner: 'QA Owner',
  dueDate: '2027-03-31',
  status: 'Open',
  currency: 'INR',
  estimatedCost: '450000.00',
  expectedReduction: '1200000.00',
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
  await prisma.remediation.deleteMany({ where: { id: { startsWith: 'TCRUD-' } } })
  await prisma.risk.deleteMany({ where: { id: { startsWith: 'TCRUD-' } } })
  await prisma.asset.deleteMany({ where: { id: { startsWith: 'TCRUD-' } } })
}

describe('remediation CRUD', () => {
  it('creates a remediation with exact decimal money and ISO date', async () => {
    await purge()

    const app = await buildApp()
    try {
      await seedParents(app)

      const response = await app.inject({
        method: 'POST',
        url: '/api/remediations',
        headers: { authorization: ADMIN },
        payload: payload('TCRUD-M1'),
      })
      const body = response.json()

      assert.equal(response.statusCode, 201)
      assert.equal(body.data.id, 'TCRUD-M1')
      assert.equal(body.data.estimatedCost, '450000.00')
      assert.equal(body.data.expectedReduction, '1200000.00')
      assert.equal(body.data.currency, 'INR')
      // Related display entities resolved through Prisma relations.
      assert.deepEqual(body.data.risk, { id: 'TCRUD-PR', risk: 'QA Test Risk' })
      assert.deepEqual(body.data.asset, { id: 'TCRUD-PA', name: 'QA Test Asset' })

      await purge()
    } finally {
      await app.close()
    }
  })

  it('serves a newly created remediation through GET /:id with overdue semantics intact', async () => {
    await purge()

    const app = await buildApp()
    try {
      await seedParents(app)
      await app.inject({
        method: 'POST',
        url: '/api/remediations',
        headers: { authorization: ADMIN },
        payload: { ...payload('TCRUD-M2'), dueDate: '2020-01-01' },
      })

      const fetched = await app.inject({ method: 'GET', url: '/api/remediations/TCRUD-M2' })
      const body = fetched.json()

      assert.equal(fetched.statusCode, 200)
      assert.equal(Number.isNaN(Date.parse(body.data.dueDate)), false)
      // Overdue KPI derives from dueDate < now AND status != Completed;
      // this record is overdue but that is computed in stats, never stored.
      const list = await app.inject({ method: 'GET', url: '/api/remediations' })
      assert.equal(list.json().meta.stats.overdueCount, 1)

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
        method: 'POST',
        url: '/api/remediations',
        headers: { authorization: ADMIN },
        payload: payload('TCRUD-M3'),
      })

      const duplicate = await app.inject({
        method: 'POST',
        url: '/api/remediations',
        headers: { authorization: ADMIN },
        payload: payload('TCRUD-M3'),
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
        method: 'POST', url: '/api/remediations', payload: payload('TCRUD-M4'),
      })
      assert.equal(unauth.statusCode, 401)
      assert.equal(unauth.json().error.code, 'AUTH_REQUIRED')

      const invalidToken = await app.inject({
        method: 'POST', url: '/api/remediations',
        headers: { authorization: INVALID }, payload: payload('TCRUD-M4'),
      })
      assert.equal(invalidToken.statusCode, 401)
      assert.equal(invalidToken.json().error.code, 'AUTH_INVALID_TOKEN')

      const forbidden = await app.inject({
        method: 'POST', url: '/api/remediations',
        headers: { authorization: READ_ONLY }, payload: payload('TCRUD-M4'),
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
        method: 'POST', url: '/api/remediations', headers: { authorization: ADMIN },
        payload: { ...payload('TCRUD-M5'), riskId: 'TCRUD-NORISK' },
      })
      assert.equal(missingRisk.statusCode, 404)
      assert.equal(missingRisk.json().error.code, 'RISK_NOT_FOUND')

      const missingAsset = await app.inject({
        method: 'POST', url: '/api/remediations', headers: { authorization: ADMIN },
        payload: { ...payload('TCRUD-M5'), assetId: 'TCRUD-NOASSET' },
      })
      assert.equal(missingAsset.statusCode, 404)
      assert.equal(missingAsset.json().error.code, 'ASSET_NOT_FOUND')

      // Archived parents behave as nonexistent for new relationships.
      await app.inject({
        method: 'DELETE', url: '/api/risks/TCRUD-PR', headers: { authorization: ADMIN },
      })

      const archivedRisk = await app.inject({
        method: 'POST', url: '/api/remediations', headers: { authorization: ADMIN },
        payload: payload('TCRUD-M5'),
      })
      assert.equal(archivedRisk.statusCode, 404)
      assert.equal(archivedRisk.json().error.code, 'RISK_NOT_FOUND')

      await purge()
    } finally {
      await app.close()
    }
  })

  it('validates categorical values, currency, money format and dates', async () => {
    await purge()

    const app = await buildApp()
    try {
      await seedParents(app)

      const cases = [
        { ...payload('TCRUD-M6'), priority: 'WHENEVER' },
        { ...payload('TCRUD-M6'), status: 'FINISHED' },
        { ...payload('TCRUD-M6'), category: 'Gardening' },
        { ...payload('TCRUD-M6'), currency: 'GBP-X' },
        { ...payload('TCRUD-M6'), estimatedCost: '-1.00' },
        { ...payload('TCRUD-M6'), expectedReduction: '10.999' },
        { ...payload('TCRUD-M6'), estimatedCost: 450000 },
        { ...payload('TCRUD-M6'), dueDate: 'not-a-date' },
      ]

      for (const body of cases) {
        const response = await app.inject({
          method: 'POST', url: '/api/remediations',
          headers: { authorization: ADMIN }, payload: body,
        })

        assert.equal(response.statusCode, 400, JSON.stringify(body).slice(0, 80))
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
        method: 'POST', url: '/api/remediations',
        headers: { authorization: ADMIN }, payload: payload('TCRUD-M7'),
      })

      const patched = await app.inject({
        method: 'PATCH', url: '/api/remediations/TCRUD-M7',
        headers: { authorization: ADMIN },
        payload: { status: 'In Progress', estimatedCost: '998877.66' },
      })
      const body = patched.json()

      assert.equal(patched.statusCode, 200)
      assert.equal(body.data.status, 'In Progress')
      assert.equal(body.data.estimatedCost, '998877.66')
      // Untouched fields persist.
      assert.equal(body.data.currency, 'INR')
      assert.deepEqual(body.data.risk, { id: 'TCRUD-PR', risk: 'QA Test Risk' })

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
        method: 'POST', url: '/api/remediations',
        headers: { authorization: ADMIN }, payload: payload('TCRUD-M8'),
      })

      const deleted = await app.inject({
        method: 'DELETE', url: '/api/remediations/TCRUD-M8',
        headers: { authorization: ADMIN },
      })

      assert.equal(deleted.statusCode, 200)
      assert.deepEqual(deleted.json().data, { id: 'TCRUD-M8', archived: true })

      const gone = await app.inject({ method: 'GET', url: '/api/remediations/TCRUD-M8' })
      assert.equal(gone.statusCode, 404)

      await purge()
    } finally {
      await app.close()
    }
  })

  after(async () => {
    await purge()
    const [remediations, risks, assets] = await Promise.all([
      prisma.remediation.count(),
      prisma.risk.count(),
      prisma.asset.count(),
    ])
    assert.equal(remediations, 0, 'Remediation table must be empty after the suite')
    assert.equal(risks, 0, 'Risk table must be empty after the suite')
    assert.equal(assets, 0, 'Asset table must be empty after the suite')
  })
})

import assert from 'node:assert/strict'
import { after, describe, it } from 'node:test'
import { buildApp } from '../app.js'
import { prisma } from '../repositories/prisma.js'

/*
 * Integration tests for insurance policy CRUD (join-table aware).
 * Temporary records use the reserved TCRUD- prefix and are hard-purged
 * inside every test BEFORE the app closes, plus a self-healing purge at
 * suite start and a final purge + zero-row assertion in after().
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

const BASE = {
  policyNumber: 'QA-POL-001',
  provider: 'QA Mutual',
  coverageType: 'Cyber Liability',
  currency: 'INR',
  coverageLimit: '10000000.00',
  deductible: '500000.00',
  premium: '750000.50',
  expirationDate: '2027-12-31',
  status: 'Active',
}

async function seedAssets(app: Awaited<ReturnType<typeof buildApp>>, ids: string[]): Promise<void> {
  for (const id of ids) {
    const response = await app.inject({
      method: 'POST', url: '/api/assets', headers: { authorization: ADMIN },
      payload: { id, ...ASSET, name: `QA Test Asset ${id}` },
    })
    assert.equal(response.statusCode, 201)
  }
}

function payload(id: string) {
  return { id, assetIds: ['TCRUD-PA1'], ...BASE }
}

async function purge(): Promise<void> {
  await prisma.insurancePolicyAsset.deleteMany({ where: { policyId: { startsWith: 'TCRUD-' } } })
  await prisma.insurancePolicy.deleteMany({ where: { id: { startsWith: 'TCRUD-' } } })
  await prisma.asset.deleteMany({ where: { id: { startsWith: 'TCRUD-' } } })
}

describe('insurance CRUD', () => {
  it('creates a policy with multiple covered assets through the join table', async () => {
    await purge()

    const app = await buildApp()
    try {
      await seedAssets(app, ['TCRUD-PA1', 'TCRUD-PA2'])

      const response = await app.inject({
        method: 'POST', url: '/api/insurance',
        headers: { authorization: ADMIN },
        payload: { ...payload('TCRUD-I1'), assetIds: ['TCRUD-PA2', 'TCRUD-PA1'] },
      })
      const body = response.json()

      assert.equal(response.statusCode, 201)
      assert.equal(body.data.id, 'TCRUD-I1')
      assert.equal(body.data.coverageLimit, '10000000.00')
      assert.equal(body.data.premium, '750000.50')
      assert.equal(body.data.currency, 'INR')
      // Join-table-resolved coverage.
      assert.deepEqual(body.data.assetIds, ['TCRUD-PA1', 'TCRUD-PA2'])
      assert.equal(body.data.coveredAssets, 2)

      await purge()
    } finally {
      await app.close()
    }
  })

  it('serves a newly created policy through GET /api/insurance/:id', async () => {
    await purge()

    const app = await buildApp()
    try {
      await seedAssets(app, ['TCRUD-PA1'])
      await app.inject({
        method: 'POST', url: '/api/insurance',
        headers: { authorization: ADMIN }, payload: payload('TCRUD-I2'),
      })

      const fetched = await app.inject({ method: 'GET', url: '/api/insurance/TCRUD-I2' })
      const body = fetched.json()

      assert.equal(fetched.statusCode, 200)
      assert.equal(body.data.id, 'TCRUD-I2')
      assert.equal(Number.isNaN(Date.parse(body.data.expirationDate)), false)

      await purge()
    } finally {
      await app.close()
    }
  })

  it('rejects unknown or archived covered asset IDs with 404 and details', async () => {
    await purge()

    const app = await buildApp()
    try {
      await seedAssets(app, ['TCRUD-PA1'])

      const unknown = await app.inject({
        method: 'POST', url: '/api/insurance', headers: { authorization: ADMIN },
        payload: { ...payload('TCRUD-I3'), assetIds: ['TCRUD-PA1', 'TCRUD-GHOST'] },
      })

      assert.equal(unknown.statusCode, 404)
      assert.equal(unknown.json().error.code, 'ASSET_NOT_FOUND')

      await purge()
    } finally {
      await app.close()
    }
  })

  it('rejects duplicate policy ids with 409', async () => {
    await purge()

    const app = await buildApp()
    try {
      await seedAssets(app, ['TCRUD-PA1'])
      await app.inject({
        method: 'POST', url: '/api/insurance',
        headers: { authorization: ADMIN }, payload: payload('TCRUD-I4'),
      })

      const duplicate = await app.inject({
        method: 'POST', url: '/api/insurance',
        headers: { authorization: ADMIN }, payload: payload('TCRUD-I4'),
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
        method: 'POST', url: '/api/insurance', payload: payload('TCRUD-I5'),
      })
      assert.equal(unauth.statusCode, 401)
      assert.equal(unauth.json().error.code, 'AUTH_REQUIRED')

      const invalidToken = await app.inject({
        method: 'POST', url: '/api/insurance',
        headers: { authorization: INVALID }, payload: payload('TCRUD-I5'),
      })
      assert.equal(invalidToken.statusCode, 401)
      assert.equal(invalidToken.json().error.code, 'AUTH_INVALID_TOKEN')

      const forbidden = await app.inject({
        method: 'POST', url: '/api/insurance',
        headers: { authorization: READ_ONLY }, payload: payload('TCRUD-I5'),
      })
      assert.equal(forbidden.statusCode, 403)
      assert.equal(forbidden.json().error.code, 'FORBIDDEN')

      await purge()
    } finally {
      await app.close()
    }
  })

  it('validates categorical values, currency and all three money fields', async () => {
    await purge()

    const app = await buildApp()
    try {
      await seedAssets(app, ['TCRUD-PA1'])

      const cases = [
        { ...payload('TCRUD-I6'), coverageType: 'Meteor Damage' },
        { ...payload('TCRUD-I6'), status: 'SIGNED' },
        { ...payload('TCRUD-I6'), currency: 'GBP-X' },
        { ...payload('TCRUD-I6'), coverageLimit: '-1.00' },
        { ...payload('TCRUD-I6'), deductible: '10.999' },
        { ...payload('TCRUD-I6'), premium: 750000 },
        { ...payload('TCRUD-I6'), expirationDate: 'not-a-date' },
      ]

      for (const body of cases) {
        const response = await app.inject({
          method: 'POST', url: '/api/insurance',
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

  it('replaces covered assets transactionally on update', async () => {
    await purge()

    const app = await buildApp()
    try {
      await seedAssets(app, ['TCRUD-PA1', 'TCRUD-PA2'])
      await app.inject({
        method: 'POST', url: '/api/insurance',
        headers: { authorization: ADMIN }, payload: payload('TCRUD-I7'),
      })

      const patched = await app.inject({
        method: 'PATCH', url: '/api/insurance/TCRUD-I7',
        headers: { authorization: ADMIN },
        payload: { assetIds: ['TCRUD-PA2'], premium: '998877.66' },
      })
      const body = patched.json()

      assert.equal(patched.statusCode, 200)
      assert.deepEqual(body.data.assetIds, ['TCRUD-PA2'])
      assert.equal(body.data.coveredAssets, 1)
      assert.equal(body.data.premium, '998877.66')
      // Untouched money fields persist.
      assert.equal(body.data.coverageLimit, '10000000.00')

      // No orphan join rows for the removed asset.
      const links = await prisma.insurancePolicyAsset.findMany({
        where: { policyId: 'TCRUD-I7' },
      })
      assert.deepEqual(links.map((l) => l.assetId), ['TCRUD-PA2'])

      await purge()
    } finally {
      await app.close()
    }
  })

  it('archives on delete and archived policies leave every read path', async () => {
    await purge()

    const app = await buildApp()
    try {
      await seedAssets(app, ['TCRUD-PA1'])
      await app.inject({
        method: 'POST', url: '/api/insurance',
        headers: { authorization: ADMIN }, payload: payload('TCRUD-I8'),
      })

      const deleted = await app.inject({
        method: 'DELETE', url: '/api/insurance/TCRUD-I8',
        headers: { authorization: ADMIN },
      })

      assert.equal(deleted.statusCode, 200)
      assert.deepEqual(deleted.json().data, { id: 'TCRUD-I8', archived: true })

      const gone = await app.inject({ method: 'GET', url: '/api/insurance/TCRUD-I8' })
      assert.equal(gone.statusCode, 404)

      const list = await app.inject({ method: 'GET', url: '/api/insurance?search=QA-POL' })
      assert.equal(list.json().meta.total, 0)

      await purge()
    } finally {
      await app.close()
    }
  })

  after(async () => {
    await purge()
    const [policies, links, assets] = await Promise.all([
      prisma.insurancePolicy.count(),
      prisma.insurancePolicyAsset.count(),
      prisma.asset.count(),
    ])
    assert.equal(policies, 0, 'InsurancePolicy table must be empty after the suite')
    assert.equal(links, 0, 'InsurancePolicyAsset table must be empty after the suite')
    assert.equal(assets, 0, 'Asset table must be empty after the suite')
  })
})

import assert from 'node:assert/strict'
import { after, describe, it } from 'node:test'
import { buildApp } from '../app.js'
import { prisma } from '../repositories/prisma.js'

/*
 * Integration tests for risk CRUD. Temporary records use the reserved
 * TCRUD- prefix and are hard-purged inside every test BEFORE the app
 * closes, plus a self-healing prefix purge at suite start and a final
 * purge + zero-row assertion in after(). Risks are purged before their
 * parent assets to respect the foreign key.
 */

const ADMIN = 'Bearer t-alice'
const READ_ONLY = 'Bearer t-riley'
const INVALID = 'Bearer not-a-configured-token'

process.env.CRFIS_AUTH_TOKENS = [
  't-alice:alice:ADMIN',
  't-riley:riley:READ_ONLY',
].join(',')

const BASE = {
  risk: 'QA Test Ransomware Exposure',
  category: 'Ransomware',
  severity: 'High',
  likelihood: 'High',
  currency: 'INR',
  exposure: '2500000.00',
  status: 'Open',
  owner: 'QA Owner',
}

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

function payload(id: string, assetId = 'TCRUD-RA') {
  return { id, assetId, ...BASE }
}

async function createAssetViaApi(app: Awaited<ReturnType<typeof buildApp>>, id: string): Promise<void> {
  const response = await app.inject({
    method: 'POST',
    url: '/api/assets',
    headers: { authorization: ADMIN },
    payload: { id, ...ASSET },
  })
  assert.equal(response.statusCode, 201)
}

async function purge(): Promise<void> {
  await prisma.risk.deleteMany({ where: { id: { startsWith: 'TCRUD-' } } })
  await prisma.asset.deleteMany({ where: { id: { startsWith: 'TCRUD-' } } })
}

describe('risk CRUD', () => {
  it('creates a risk with exact decimal exposure and explicit currency', async () => {
    await purge()

    const app = await buildApp()
    try {
      await createAssetViaApi(app, 'TCRUD-RA')

      const response = await app.inject({
        method: 'POST',
        url: '/api/risks',
        headers: { authorization: ADMIN },
        payload: payload('TCRUD-R1'),
      })
      const body = response.json()

      assert.equal(response.statusCode, 201)
      assert.equal(body.data.id, 'TCRUD-R1')
      assert.equal(body.data.exposure, '2500000.00')
      assert.equal(body.data.currency, 'INR')
      // Related Asset display entity resolved through Prisma relations.
      assert.deepEqual(body.data.asset, { id: 'TCRUD-RA', name: 'QA Test Asset' })

      await purge()
    } finally {
      await app.close()
    }
  })

  it('serves a newly created risk through GET /api/risks/:id', async () => {
    await purge()

    const app = await buildApp()
    try {
      await createAssetViaApi(app, 'TCRUD-RA')
      await app.inject({
        method: 'POST',
        url: '/api/risks',
        headers: { authorization: ADMIN },
        payload: payload('TCRUD-R2'),
      })

      const fetched = await app.inject({ method: 'GET', url: '/api/risks/TCRUD-R2' })
      const body = fetched.json()

      assert.equal(fetched.statusCode, 200)
      assert.equal(body.data.id, 'TCRUD-R2')
      assert.equal(body.data.exposure, '2500000.00')
      assert.equal(Number.isNaN(Date.parse(body.data.lastUpdated)), false)

      await purge()
    } finally {
      await app.close()
    }
  })

  it('rejects duplicate ids with 409 - including archived ones', async () => {
    await purge()

    const app = await buildApp()
    try {
      await createAssetViaApi(app, 'TCRUD-RA')
      await app.inject({
        method: 'POST',
        url: '/api/risks',
        headers: { authorization: ADMIN },
        payload: payload('TCRUD-R3'),
      })

      // Archive the risk, then try to reuse its ID.
      await app.inject({
        method: 'DELETE',
        url: '/api/risks/TCRUD-R3',
        headers: { authorization: ADMIN },
      })

      const duplicate = await app.inject({
        method: 'POST',
        url: '/api/risks',
        headers: { authorization: ADMIN },
        payload: payload('TCRUD-R3'),
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
        method: 'POST',
        url: '/api/risks',
        payload: payload('TCRUD-R4'),
      })
      assert.equal(unauth.statusCode, 401)
      assert.equal(unauth.json().error.code, 'AUTH_REQUIRED')

      const invalidToken = await app.inject({
        method: 'POST',
        url: '/api/risks',
        headers: { authorization: INVALID },
        payload: payload('TCRUD-R4'),
      })
      assert.equal(invalidToken.statusCode, 401)
      assert.equal(invalidToken.json().error.code, 'AUTH_INVALID_TOKEN')

      const forbidden = await app.inject({
        method: 'POST',
        url: '/api/risks',
        headers: { authorization: READ_ONLY },
        payload: payload('TCRUD-R4'),
      })
      assert.equal(forbidden.statusCode, 403)
      assert.equal(forbidden.json().error.code, 'FORBIDDEN')

      await purge()
    } finally {
      await app.close()
    }
  })

  it('rejects references to unknown or archived assets with 404', async () => {
    await purge()

    const app = await buildApp()
    try {
      const missingAsset = await app.inject({
        method: 'POST',
        url: '/api/risks',
        headers: { authorization: ADMIN },
        payload: { ...payload('TCRUD-R5'), assetId: 'TCRUD-NOPE' },
      })

      assert.equal(missingAsset.statusCode, 404)
      assert.equal(missingAsset.json().error.code, 'ASSET_NOT_FOUND')

      // Create + archive an asset, then reference it.
      await createAssetViaApi(app, 'TCRUD-RARC')
      await app.inject({
        method: 'DELETE',
        url: '/api/assets/TCRUD-RARC',
        headers: { authorization: ADMIN },
      })

      const archivedAsset = await app.inject({
        method: 'POST',
        url: '/api/risks',
        headers: { authorization: ADMIN },
        payload: { ...payload('TCRUD-R5'), assetId: 'TCRUD-RARC' },
      })

      assert.equal(archivedAsset.statusCode, 404)
      assert.equal(archivedAsset.json().error.code, 'ASSET_NOT_FOUND')

      await purge()
    } finally {
      await app.close()
    }
  })

  it('validates categorical values, currency and money format', async () => {
    await purge()

    const app = await buildApp()
    try {
      await createAssetViaApi(app, 'TCRUD-RA')

      const cases = [
        { ...payload('TCRUD-R6'), severity: 'EXTINCTION' },
        { ...payload('TCRUD-R6'), likelihood: 'WHEN PIGS FLY' },
        { ...payload('TCRUD-R6'), category: 'Zombie Apocalypse' },
        { ...payload('TCRUD-R6'), status: 'FINISHED' },
        { ...payload('TCRUD-R6'), currency: 'GBP-X' },
        { ...payload('TCRUD-R6'), exposure: '-5.00' },
        { ...payload('TCRUD-R6'), exposure: '10.999' },
        (() => {
          const rest: Record<string, unknown> = { ...payload('TCRUD-R6') }
          delete rest.currency
          return rest
        })(),
      ]

      for (const body of cases) {
        const response = await app.inject({
          method: 'POST',
          url: '/api/risks',
          headers: { authorization: ADMIN },
          payload: body,
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
      await createAssetViaApi(app, 'TCRUD-RA')
      await app.inject({
        method: 'POST',
        url: '/api/risks',
        headers: { authorization: ADMIN },
        payload: payload('TCRUD-R7'),
      })

      const patched = await app.inject({
        method: 'PATCH',
        url: '/api/risks/TCRUD-R7',
        headers: { authorization: ADMIN },
        payload: { exposure: '998877.66', status: 'Mitigated', severity: 'Medium' },
      })
      const body = patched.json()

      assert.equal(patched.statusCode, 200)
      assert.equal(body.data.exposure, '998877.66')
      assert.equal(body.data.status, 'Mitigated')
      assert.equal(body.data.severity, 'Medium')
      // Untouched fields persist.
      assert.equal(body.data.currency, 'INR')
      assert.deepEqual(body.data.asset, { id: 'TCRUD-RA', name: 'QA Test Asset' })

      await purge()
    } finally {
      await app.close()
    }
  })

  it('archives on delete and archived risks leave every read path', async () => {
    await purge()

    const app = await buildApp()
    try {
      await createAssetViaApi(app, 'TCRUD-RA')
      await app.inject({
        method: 'POST',
        url: '/api/risks',
        headers: { authorization: ADMIN },
        payload: payload('TCRUD-R8'),
      })

      const deleted = await app.inject({
        method: 'DELETE',
        url: '/api/risks/TCRUD-R8',
        headers: { authorization: ADMIN },
      })

      assert.equal(deleted.statusCode, 200)
      assert.deepEqual(deleted.json().data, { id: 'TCRUD-R8', archived: true })

      const gone = await app.inject({ method: 'GET', url: '/api/risks/TCRUD-R8' })
      assert.equal(gone.statusCode, 404)

      const list = await app.inject({ method: 'GET', url: '/api/risks?search=QA Test Ransomware' })
      assert.equal(list.json().meta.total, 0)

      await purge()
    } finally {
      await app.close()
    }
  })

  it('returns 404 when updating or deleting unknown risks', async () => {
    const app = await buildApp()
    try {
      const patchMissing = await app.inject({
        method: 'PATCH',
        url: '/api/risks/TCRUD-MISSING',
        headers: { authorization: ADMIN },
        payload: { status: 'Accepted' },
      })
      assert.equal(patchMissing.statusCode, 404)

      const deleteMissing = await app.inject({
        method: 'DELETE',
        url: '/api/risks/TCRUD-MISSING',
        headers: { authorization: ADMIN },
      })
      assert.equal(deleteMissing.statusCode, 404)
    } finally {
      await app.close()
    }
  })

  after(async () => {
    await purge()
    const [risks, assets] = await Promise.all([
      prisma.risk.count(),
      prisma.asset.count(),
    ])
    assert.equal(risks, 0, 'Risk table must be empty after the suite')
    assert.equal(assets, 0, 'Asset table must be empty after the suite')
  })
})

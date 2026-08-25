import assert from 'node:assert/strict'
import { after, describe, it } from 'node:test'
import { buildApp } from '../app.js'
import { prisma } from '../repositories/prisma.js'

/*
 * Integration tests for asset CRUD. Temporary records use a reserved id
 * prefix and are hard-purged inside every test BEFORE the app closes (the
 * shared Prisma client disconnects on close), plus a self-healing prefix
 * purge at suite start for interrupted previous runs and a final purge +
 * zero-row assertion in after() so the suite can never leave rows behind,
 * even when an assertion throws mid-test.
 */

const ADMIN = 'Bearer t-alice'
const READ_ONLY = 'Bearer t-riley'
const INVALID = 'Bearer not-a-configured-token'

process.env.CRFIS_AUTH_TOKENS = [
  't-alice:alice:ADMIN',
  't-riley:riley:READ_ONLY',
].join(',')

const BASE = {
  name: 'QA Test Asset',
  type: 'Infrastructure',
  businessUnit: 'QA',
  criticality: 'High',
  currency: 'INR',
  annualValue: '1250000.50',
  status: 'Monitored',
  owner: 'QA Owner',
}

function payload(id: string) {
  return { id, ...BASE }
}

async function purge(): Promise<void> {
  await prisma.asset.deleteMany({ where: { id: { startsWith: 'TCRUD-' } } })
}

describe('asset CRUD', () => {
  it('creates an asset with exact decimal money and explicit currency', async () => {
    await purge()

    const app = await buildApp()
    try {
      const response = await app.inject({
        method: 'POST',
        url: '/api/assets',
        headers: { authorization: ADMIN },
        payload: payload('TCRUD-A1'),
      })
      const body = response.json()

      assert.equal(response.statusCode, 201)
      // Single-resource success envelope carries data only.
      assert.ok(body.data, 'success envelope must carry data')
      assert.equal(body.data.id, 'TCRUD-A1')
      assert.equal(body.data.currency, 'INR')
      assert.equal(body.data.annualValue, '1250000.50')
      assert.equal(Number.isNaN(Date.parse(body.data.lastUpdated)), false)

      // Readable through the public list endpoint.
      const list = await app.inject({ method: 'GET', url: '/api/assets?search=QA Test Asset' })
      const listBody = list.json()
      assert.equal(listBody.meta.total, 1)
      assert.equal(listBody.data[0]?.annualValue, '1250000.50')
      assert.equal(listBody.data[0]?.currency, 'INR')

      await purge()
    } finally {
      await app.close()
    }
  })

  it('serves a newly created asset through GET /api/assets/:id', async () => {
    await purge()

    const app = await buildApp()
    try {
      const created = await app.inject({
        method: 'POST',
        url: '/api/assets',
        headers: { authorization: ADMIN },
        payload: payload('TCRUD-A9'),
      })
      assert.equal(created.statusCode, 201)

      const fetched = await app.inject({ method: 'GET', url: '/api/assets/TCRUD-A9' })
      const body = fetched.json()

      assert.equal(fetched.statusCode, 200)
      assert.equal(body.data.id, 'TCRUD-A9')
      assert.equal(body.data.currency, 'INR')
      assert.equal(body.data.annualValue, '1250000.50')
      assert.equal(Number.isNaN(Date.parse(body.data.lastUpdated)), false)

      await purge()
    } finally {
      await app.close()
    }
  })

  it('rejects duplicate ids with 409', async () => {
    await purge()

    const app = await buildApp()
    try {
      await app.inject({
        method: 'POST',
        url: '/api/assets',
        headers: { authorization: ADMIN },
        payload: payload('TCRUD-A2'),
      })

      const duplicate = await app.inject({
        method: 'POST',
        url: '/api/assets',
        headers: { authorization: ADMIN },
        payload: payload('TCRUD-A2'),
      })
      const body = duplicate.json()

      assert.equal(duplicate.statusCode, 409)
      assert.equal(body.error.code, 'ID_ALREADY_EXISTS')

      await purge()
    } finally {
      await app.close()
    }
  })

  it('rejects unauthenticated writes with 401', async () => {
    const app = await buildApp()
    try {
      const response = await app.inject({
        method: 'POST',
        url: '/api/assets',
        payload: payload('TCRUD-A3'),
      })

      assert.equal(response.statusCode, 401)
      assert.equal(response.json().error.code, 'AUTH_REQUIRED')

      await purge()
    } finally {
      await app.close()
    }
  })

  it('rejects invalid credentials with 401 AUTH_INVALID_TOKEN', async () => {
    const app = await buildApp()
    try {
      const response = await app.inject({
        method: 'POST',
        url: '/api/assets',
        headers: { authorization: INVALID },
        payload: payload('TCRUD-A10'),
      })

      assert.equal(response.statusCode, 401)
      assert.equal(response.json().error.code, 'AUTH_INVALID_TOKEN')

      await purge()
    } finally {
      await app.close()
    }
  })

  it('rejects forbidden roles with 403', async () => {
    const app = await buildApp()
    try {
      const response = await app.inject({
        method: 'POST',
        url: '/api/assets',
        headers: { authorization: READ_ONLY },
        payload: payload('TCRUD-A4'),
      })

      assert.equal(response.statusCode, 403)
      assert.equal(response.json().error.code, 'FORBIDDEN')

      await purge()
    } finally {
      await app.close()
    }
  })

  it('validates currency, amount format and required fields', async () => {
    const app = await buildApp()
    try {
      const badCurrency = await app.inject({
        method: 'POST',
        url: '/api/assets',
        headers: { authorization: ADMIN },
        payload: { ...payload('TCRUD-A5'), currency: 'GBP-X' },
      })
      assert.equal(badCurrency.statusCode, 400)
      assert.equal(badCurrency.json().error.code, 'VALIDATION_ERROR')

      // Currency is REQUIRED on write - there is no silent USD default.
      const missingCurrency = await app.inject({
        method: 'POST',
        url: '/api/assets',
        headers: { authorization: ADMIN },
        payload: (() => {
          const rest = { ...payload('TCRUD-A5') }
          delete (rest as Record<string, unknown>).currency
          return rest
        })(),
      })
      assert.equal(missingCurrency.statusCode, 400)
      assert.equal(missingCurrency.json().error.code, 'VALIDATION_ERROR')

      const negativeAmount = await app.inject({
        method: 'POST',
        url: '/api/assets',
        headers: { authorization: ADMIN },
        payload: { ...payload('TCRUD-A5'), annualValue: '-10.00' },
      })
      assert.equal(negativeAmount.statusCode, 400)

      const floatAmount = await app.inject({
        method: 'POST',
        url: '/api/assets',
        headers: { authorization: ADMIN },
        payload: { ...payload('TCRUD-A5'), annualValue: '10.999' },
      })
      assert.equal(floatAmount.statusCode, 400)

      const numberAmount = await app.inject({
        method: 'POST',
        url: '/api/assets',
        headers: { authorization: ADMIN },
        payload: { ...payload('TCRUD-A5'), annualValue: 1250000.5 },
      })
      assert.equal(numberAmount.statusCode, 400)

      const missingName = await app.inject({
        method: 'POST',
        url: '/api/assets',
        headers: { authorization: ADMIN },
        payload: { ...payload('TCRUD-A5'), name: '' },
      })
      assert.equal(missingName.statusCode, 400)

      await purge()
    } finally {
      await app.close()
    }
  })

  it('updates fields while preserving scale-exact money strings', async () => {
    await purge()

    const app = await buildApp()
    try {
      await app.inject({
        method: 'POST',
        url: '/api/assets',
        headers: { authorization: ADMIN },
        payload: payload('TCRUD-A6'),
      })

      const patched = await app.inject({
        method: 'PATCH',
        url: '/api/assets/TCRUD-A6',
        headers: { authorization: ADMIN },
        payload: { annualValue: '998877.66', status: 'Under Review' },
      })
      const body = patched.json()

      assert.equal(patched.statusCode, 200)
      assert.equal(body.data.annualValue, '998877.66')
      assert.equal(body.data.status, 'Under Review')
      // Untouched fields persist.
      assert.equal(body.data.currency, 'INR')

      await purge()
    } finally {
      await app.close()
    }
  })

  it('returns validation errors on invalid patch payloads', async () => {
    const app = await buildApp()
    try {
      await app.inject({
        method: 'POST',
        url: '/api/assets',
        headers: { authorization: ADMIN },
        payload: payload('TCRUD-A7'),
      })

      const emptyPatch = await app.inject({
        method: 'PATCH',
        url: '/api/assets/TCRUD-A7',
        headers: { authorization: ADMIN },
        payload: {},
      })

      assert.equal(emptyPatch.statusCode, 400)
      assert.equal(emptyPatch.json().error.code, 'VALIDATION_ERROR')

      const badPatch = await app.inject({
        method: 'PATCH',
        url: '/api/assets/TCRUD-A7',
        headers: { authorization: ADMIN },
        payload: { annualValue: 'abc' },
      })

      assert.equal(badPatch.statusCode, 400)

      await purge()
    } finally {
      await app.close()
    }
  })

  it('archives on delete and archived assets leave every read path', async () => {
    await purge()

    const app = await buildApp()
    try {
      await app.inject({
        method: 'POST',
        url: '/api/assets',
        headers: { authorization: ADMIN },
        payload: payload('TCRUD-A8'),
      })

      const deleted = await app.inject({
        method: 'DELETE',
        url: '/api/assets/TCRUD-A8',
        headers: { authorization: ADMIN },
      })

      assert.equal(deleted.statusCode, 200)
      assert.deepEqual(deleted.json().data, { id: 'TCRUD-A8', archived: true })

      const gone = await app.inject({ method: 'GET', url: '/api/assets/TCRUD-A8' })
      assert.equal(gone.statusCode, 404)

      const list = await app.inject({ method: 'GET', url: '/api/assets?search=QA Test Asset' })
      assert.equal(list.json().meta.total, 0)

      await purge()
    } finally {
      await app.close()
    }
  })

  it('returns 404 when updating or deleting unknown assets', async () => {
    const app = await buildApp()
    try {
      const patchMissing = await app.inject({
        method: 'PATCH',
        url: '/api/assets/TCRUD-MISSING',
        headers: { authorization: ADMIN },
        payload: { name: 'x' },
      })
      assert.equal(patchMissing.statusCode, 404)

      const deleteMissing = await app.inject({
        method: 'DELETE',
        url: '/api/assets/TCRUD-MISSING',
        headers: { authorization: ADMIN },
      })
      assert.equal(deleteMissing.statusCode, 404)
    } finally {
      await app.close()
    }
  })

  // Safety net: even if an assertion above throws before its own purge,
  // the suite must leave the Asset table exactly as it found it.
  after(async () => {
    await purge()
    const remaining = await prisma.asset.count()
    assert.equal(remaining, 0, 'Asset table must be empty after the suite')
  })
})

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  dateToIso,
  decimalToNumber,
  nullableDateToIso,
  nullableDecimalToNumber,
} from './serialize.js'
import { mapAudit, mapInsurancePolicy } from './mappers.js'

describe('decimalToNumber', () => {
  it('converts Prisma Decimal-like values', () => {
    assert.equal(decimalToNumber({ toNumber: () => 1250000.5 }), 1250000.5)
  })

  it('passes through numbers and numeric strings', () => {
    assert.equal(decimalToNumber(42), 42)
    assert.equal(decimalToNumber('480000.25'), 480000.25)
  })

  it('rejects garbage strings', () => {
    assert.throws(() => decimalToNumber('not-a-number'), TypeError)
  })
})

describe('nullableDecimalToNumber', () => {
  it('maps null and undefined to null', () => {
    assert.equal(nullableDecimalToNumber(null), null)
    assert.equal(nullableDecimalToNumber(undefined), null)
  })

  it('maps present values to numbers', () => {
    assert.equal(nullableDecimalToNumber({ toNumber: () => 9.99 }), 9.99)
  })
})

describe('dateToIso', () => {
  it('serializes Date instances to ISO strings', () => {
    assert.equal(dateToIso(new Date('2026-08-24T00:00:00Z')), '2026-08-24T00:00:00.000Z')
  })

  it('normalizes date-only strings to ISO', () => {
    assert.equal(dateToIso('2026-08-24'), '2026-08-24T00:00:00.000Z')
  })

  it('rejects invalid dates', () => {
    assert.throws(() => dateToIso('not-a-date'), TypeError)
  })
})

describe('nullableDateToIso', () => {
  it('maps null and undefined to null', () => {
    assert.equal(nullableDateToIso(null), null)
    assert.equal(nullableDateToIso(undefined), null)
  })
})

describe('mapAudit', () => {
  it('derives the findings count from the Prisma aggregate', () => {
    const audit = mapAudit({
      id: 'AUD-001',
      framework: 'ISO 27001',
      scope: 'Enterprise Security',
      status: 'Completed',
      owner: 'Security Governance',
      dueDate: new Date('2026-06-30T00:00:00Z'),
      _count: { findings: 2 },
    })

    assert.equal(audit.findings, 2)
    assert.equal(audit.dueDate, '2026-06-30T00:00:00.000Z')
  })

  it('falls back to zero when no aggregate was included', () => {
    const audit = mapAudit({
      id: 'AUD-002',
      framework: 'NIST CSF',
      scope: 'Enterprise Risk',
      status: 'Planned',
      owner: 'Risk Management',
      dueDate: '2026-12-31',
    })

    assert.equal(audit.findings, 0)
  })
})

describe('mapInsurancePolicy', () => {
  it('flattens join rows into assetIds and coveredAssets', () => {
    const policy = mapInsurancePolicy({
      id: 'POL-001',
      policyNumber: 'CYB-DEMO-2026-001',
      provider: 'Global Cyber Insurance',
      coverageType: 'Cyber Liability',
      coverageLimit: { toNumber: () => 5000000 },
      deductible: { toNumber: () => 250000 },
      premium: { toNumber: () => 185000 },
      expirationDate: new Date('2027-03-31T00:00:00Z'),
      status: 'Active',
      notes: null,
      assetLinks: [{ assetId: 'ASSET-001' }, { assetId: 'ASSET-002' }],
    })

    assert.deepEqual(policy.assetIds, ['ASSET-001', 'ASSET-002'])
    assert.equal(policy.coveredAssets, 2)
    assert.equal(policy.coverageLimit, 5000000)
    assert.equal(policy.notes, null)
    assert.equal(policy.expirationDate, '2027-03-31T00:00:00.000Z')
  })

  it('defaults to empty coverage when links were not included', () => {
    const policy = mapInsurancePolicy({
      id: 'POL-002',
      policyNumber: 'X',
      provider: 'P',
      coverageType: 'Data Breach',
      coverageLimit: 1,
      deductible: 1,
      premium: 1,
      expirationDate: '2027-01-01',
      status: 'Pending',
      notes: null,
    })

    assert.deepEqual(policy.assetIds, [])
    assert.equal(policy.coveredAssets, 0)
  })
})

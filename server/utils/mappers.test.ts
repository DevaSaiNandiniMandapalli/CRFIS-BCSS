import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { mapAsset, mapRisk } from './mappers.js'

/*
 * Mapper contract tests. Money must serialize as decimal STRINGS with the
 * record's own currency passed through untouched - USD, INR, EUR or any
 * other ISO-4217 code. There is no conversion and no default substitution.
 */

function decimal(value: string): { toNumber: () => number; toString: () => string } {
  return {
    toNumber: () => Number.parseFloat(value),
    toString: () => value,
  }
}

describe('mapAsset', () => {
  it('serializes annualValue as a scale-preserving decimal string', () => {
    const dto = mapAsset({
      id: 'ASSET-001',
      name: 'Core Infrastructure',
      type: 'Infrastructure',
      businessUnit: 'Technology',
      criticality: 'Critical',
      currency: 'USD',
      annualValue: decimal('1800000.00'),
      status: 'At Risk',
      owner: 'Infrastructure Team',
      lastUpdated: new Date('2026-08-18T00:00:00Z'),
    })

    assert.equal(dto.annualValue, '1800000.00')
    assert.equal(dto.lastUpdated, '2026-08-18T00:00:00.000Z')
  })

  it('passes the record currency through without substitution', () => {
    const base = {
      id: 'ASSET-002',
      name: 'Mumbai Data Centre',
      type: 'Infrastructure',
      businessUnit: 'Technology',
      criticality: 'High',
      annualValue: decimal('1250000.50'),
      status: 'Monitored',
      owner: 'Facilities',
      lastUpdated: new Date('2026-08-19T00:00:00Z'),
    }

    assert.equal(mapAsset({ ...base, currency: 'INR' }).currency, 'INR')
    assert.equal(mapAsset({ ...base, currency: 'EUR' }).currency, 'EUR')
    assert.equal(mapAsset({ ...base, currency: 'JPY' }).currency, 'JPY')

    const inr = mapAsset({ ...base, currency: 'INR' })
    assert.equal(inr.annualValue, '1250000.50')
  })
})

describe('mapRisk', () => {
  it('includes the related Asset display entity when loaded', () => {
    const dto = mapRisk({
      id: 'RISK-001',
      risk: 'Ransomware Exposure',
      category: 'Ransomware',
      severity: 'Critical',
      likelihood: 'High',
      currency: 'USD',
      exposure: decimal('1250000.00'),
      status: 'Open',
      owner: 'Infrastructure',
      lastUpdated: new Date('2026-08-18T00:00:00Z'),
      assetId: 'ASSET-001',
      asset: { id: 'ASSET-001', name: 'Core Infrastructure' },
    })

    assert.deepEqual(dto.asset, { id: 'ASSET-001', name: 'Core Infrastructure' })
    assert.equal(dto.exposure, '1250000.00')
    assert.equal(dto.currency, 'USD')
  })

  it('maps a missing relation to null instead of inventing data', () => {
    const dto = mapRisk({
      id: 'RISK-002',
      risk: 'Credential Compromise',
      category: 'Identity',
      severity: 'High',
      likelihood: 'Medium',
      currency: 'EUR',
      exposure: decimal('480000.00'),
      status: 'Under Review',
      owner: 'IAM Team',
      lastUpdated: new Date('2026-08-17T00:00:00Z'),
      assetId: 'ASSET-MISSING',
      asset: null,
    })

    assert.equal(dto.asset, null)
    assert.equal(dto.assetId, 'ASSET-MISSING')
    assert.equal(dto.currency, 'EUR')
  })
})

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { mapAsset, mapRemediation, mapRisk, mapScenario } from './mappers.js'

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

describe('mapRemediation', () => {
  const base = {
    id: 'REM-001',
    action: 'Harden backup and recovery controls',
    category: 'Backup & Recovery',
    priority: 'Critical',
    owner: 'Infrastructure Team',
    dueDate: new Date('2026-09-15T00:00:00Z'),
    status: 'In Progress',
    estimatedCost: decimal('85000.00'),
    expectedReduction: decimal('420000.00'),
    riskId: 'RISK-001',
    assetId: 'ASSET-001',
  }

  it('serializes both money fields as scale-exact strings with record currency', () => {
    const dto = mapRemediation({
      ...base,
      currency: 'INR',
      risk: { id: 'RISK-001', risk: 'Ransomware Exposure' },
      asset: { id: 'ASSET-001', name: 'Core Infrastructure' },
    })

    assert.equal(dto.estimatedCost, '85000.00')
    assert.equal(dto.expectedReduction, '420000.00')
    assert.equal(dto.currency, 'INR')
    assert.deepEqual(dto.risk, { id: 'RISK-001', risk: 'Ransomware Exposure' })
    assert.deepEqual(dto.asset, { id: 'ASSET-001', name: 'Core Infrastructure' })
    assert.equal(dto.dueDate, '2026-09-15T00:00:00.000Z')
  })

  it('covers EUR, GBP and JPY passthrough without substitution', () => {
    for (const currency of ['EUR', 'GBP', 'JPY']) {
      const dto = mapRemediation({ ...base, currency })
      assert.equal(dto.currency, currency)
      assert.equal(dto.expectedReduction, '420000.00')
    }
  })

  it('maps missing relations to null instead of inventing data', () => {
    const dto = mapRemediation({ ...base, currency: 'USD', risk: null, asset: null })

    assert.equal(dto.risk, null)
    assert.equal(dto.asset, null)
    assert.equal(dto.riskId, 'RISK-001')
    assert.equal(dto.assetId, 'ASSET-001')
  })
})

describe('mapScenario', () => {
  const base = {
    id: 'SCN-001',
    name: 'Enterprise Ransomware Event',
    category: 'Ransomware',
    description: 'Demonstration scenario.',
    severity: 'Critical',
    probability: 'Medium',
    businessImpact: 'Extended operational disruption',
    status: 'Under Review',
    owner: 'Security Operations',
    riskId: 'RISK-001',
    assetId: 'ASSET-001',
  }

  it('preserves exact Decimal representation and currency', () => {
    const dto = mapScenario({
      ...base,
      currency: 'JPY',
      estimatedImpact: decimal('1850000.00'),
      risk: { id: 'RISK-001', risk: 'Ransomware Exposure' },
      asset: { id: 'ASSET-001', name: 'Core Infrastructure' },
    })

    assert.equal(dto.estimatedImpact, '1850000.00')
    assert.equal(dto.currency, 'JPY')
    assert.deepEqual(dto.risk, { id: 'RISK-001', risk: 'Ransomware Exposure' })
    assert.deepEqual(dto.asset, { id: 'ASSET-001', name: 'Core Infrastructure' })
  })

  it('passes USD through untouched alongside decimal strings', () => {
    const dto = mapScenario({
      ...base,
      currency: 'USD',
      estimatedImpact: decimal('980000.75'),
      risk: null,
      asset: null,
    })

    assert.equal(dto.currency, 'USD')
    assert.equal(dto.estimatedImpact, '980000.75')
    assert.equal(dto.risk, null)
    assert.equal(dto.asset, null)
  })
})

import { getAssetStats, listAssets } from '../repositories/assets.js'
import { getAuditStats, listAudits } from '../repositories/audits.js'
import { getInsuranceStats, listPolicies } from '../repositories/insurance.js'
import { getRemediationStats } from '../repositories/remediations.js'
import { getRiskStats, listRisks } from '../repositories/risks.js'
import { getScenarioStats, listScenarios } from '../repositories/scenarios.js'

/*
 * Executive Overview aggregation.
 *
 * Currency safety rules:
 * - Every monetary family is reported as per-currency buckets of exact
 *   decimal strings. Currencies are NEVER added together.
 * - Cross-family derivations (remaining exposure, net benefit, coverage gap,
 *   ratio) are computed ONLY within a single currency bucket.
 * - An entirely empty domain yields `null` for its monetary family so the
 *   UI can render an honest unavailable state instead of fake zeros.
 *
 * The ALE factor (25% of exposure) is the long-standing CRFIS demonstration
 * heuristic documented in utils/financialMetrics.ts - it is NOT a production
 * actuarial model.
 */

const ALE_FACTOR = 0.25

export interface OverviewPayload {
  generatedAt: string
  exposureByCurrency: Record<string, string> | null
  annualizedLossExpectancyByCurrency: Record<string, string> | null
  criticalRiskCount: number
  riskCount: number

  remediationOpportunityByCurrency: Record<string, string> | null
  remediationCostByCurrency: Record<string, string> | null
  netRemediationBenefitByCurrency: Record<string, string> | null
  remainingExposureByCurrency: Record<string, string> | null
  reductionCostRatioByCurrency: Record<string, number> | null
  openRemediationCount: number
  overdueRemediationCount: number

  totalAssetValueByCurrency: Record<string, string> | null
  assetCount: number
  highValueAssetCount: number

  insuranceCoverageByCurrency: Record<string, string> | null
  insurancePremiumByCurrency: Record<string, string> | null
  insuranceDeductibleByCurrency: Record<string, string> | null
  policyCount: number
  coverageGapByCurrency: Record<string, string> | null

  scenarioImpactByCurrency: Record<string, string> | null
  scenarioCount: number

  auditProgramCount: number
  auditFindingsTotal: number
  highCriticalFindings: number
}

function isEmptyBuckets(buckets: Record<string, string>): boolean {
  return Object.keys(buckets).length === 0
}

function subtractPerCurrency(
  a: Record<string, string> | null,
  b: Record<string, string> | null,
): Record<string, string> | null {
  if (!a && !b) {
    return null
  }

  const result: Record<string, string> = {}
  const currencies = new Set([...Object.keys(a ?? {}), ...Object.keys(b ?? {})])

  for (const currency of currencies) {
    const left = Number.parseFloat(a?.[currency] ?? '0')
    const right = Number.parseFloat(b?.[currency] ?? '0')

    // Presentation-level decimal math on server-aggregated buckets.
    result[currency] = String(left - right)
  }

  return result
}

export async function buildOverview(): Promise<OverviewPayload> {
  const now = new Date()

  const [
    riskStats,
    remediationStats,
    assetStats,
    insuranceStats,
    scenarioStats,
    auditStats,
  ] = await Promise.all([
    getRiskStats({}),
    getRemediationStats({}, now),
    getAssetStats({}),
    getInsuranceStats({}),
    getScenarioStats({}),
    getAuditStats({}),
  ])

  // Domain row counts via scoped single-row lists (meta.total).
  const [risks, assets, policies, scenarios, audits] = await Promise.all([
    listRisks({ filters: {}, page: 1, pageSize: 1, sortBy: 'exposure', order: 'desc' }),
    listAssets({ filters: {}, page: 1, pageSize: 1, sortBy: 'name', order: 'asc' }),
    listPolicies({ filters: {}, page: 1, pageSize: 1, sortBy: 'expirationDate', order: 'asc' }),
    listScenarios({ filters: {}, page: 1, pageSize: 1, sortBy: 'name', order: 'asc' }),
    listAudits({ filters: {}, page: 1, pageSize: 1, sortBy: 'dueDate', order: 'asc' }),
  ])

  const exposureByCurrency = riskStats.exposureByCurrency
  const hasExposure = !isEmptyBuckets(exposureByCurrency)

  const aleByCurrency: Record<string, string> | null = hasExposure
    ? Object.fromEntries(
        Object.entries(exposureByCurrency).map(([currency, amount]) => [
          currency,
          String(Number.parseFloat(amount) * ALE_FACTOR),
        ]),
      )
    : null

  // Remaining exposure per currency: exposure minus achieved reduction,
  // floored at zero WITHIN each currency.
  const reduction = remediationStats.expectedReductionByCurrency
  const remainingExposure: Record<string, string> = {}
  {
    const currencies = new Set([
      ...Object.keys(exposureByCurrency),
      ...Object.keys(reduction),
    ])

    for (const currency of currencies) {
      const exposureValue = Number.parseFloat(exposureByCurrency[currency] ?? '0')
      const reductionValue = Number.parseFloat(reduction[currency] ?? '0')

      remainingExposure[currency] = String(Math.max(exposureValue - reductionValue, 0))
    }
  }

  const cost = remediationStats.estimatedCostByCurrency
  const netBenefit = subtractPerCurrency(reduction, cost)

  const ratioByCurrency: Record<string, number> = {}
  {
    const currencies = new Set([
      ...Object.keys(reduction),
      ...Object.keys(cost),
    ])

    for (const currency of currencies) {
      const reductionValue = Number.parseFloat(reduction[currency] ?? '0')
      const costValue = Number.parseFloat(cost[currency] ?? '0')

      ratioByCurrency[currency] = costValue === 0 ? 0 : reductionValue / costValue
    }
  }

  const coverageGap: Record<string, string> = {}
  {
    const coverage = insuranceStats.coverageLimitByCurrency
    const currencies = new Set([
      ...Object.keys(exposureByCurrency),
      ...Object.keys(coverage),
    ])

    for (const currency of currencies) {
      const exposureValue = Number.parseFloat(exposureByCurrency[currency] ?? '0')
      const coverageValue = Number.parseFloat(coverage[currency] ?? '0')

      coverageGap[currency] = String(Math.max(exposureValue - coverageValue, 0))
    }
  }

  return {
    generatedAt: now.toISOString(),

    exposureByCurrency: hasExposure ? exposureByCurrency : null,
    annualizedLossExpectancyByCurrency: aleByCurrency,
    criticalRiskCount: riskStats.bySeverity['Critical'] ?? 0,
    riskCount: risks.total,

    remediationOpportunityByCurrency: isEmptyBuckets(reduction) ? null : reduction,
    remediationCostByCurrency: isEmptyBuckets(cost) ? null : cost,
    netRemediationBenefitByCurrency: netBenefit,
    remainingExposureByCurrency: remainingExposure,
    reductionCostRatioByCurrency:
      Object.keys(ratioByCurrency).length === 0 ? null : ratioByCurrency,
    openRemediationCount: remediationStats.byStatus['Open'] ?? 0,
    overdueRemediationCount: remediationStats.overdueCount,

    totalAssetValueByCurrency: isEmptyBuckets(assetStats.annualValueByCurrency)
      ? null
      : assetStats.annualValueByCurrency,
    assetCount: assets.total,
    highValueAssetCount: assetStats.highValueCount,

    insuranceCoverageByCurrency: isEmptyBuckets(insuranceStats.coverageLimitByCurrency)
      ? null
      : insuranceStats.coverageLimitByCurrency,
    insurancePremiumByCurrency: isEmptyBuckets(insuranceStats.premiumByCurrency)
      ? null
      : insuranceStats.premiumByCurrency,
    insuranceDeductibleByCurrency: isEmptyBuckets(insuranceStats.deductibleByCurrency)
      ? null
      : insuranceStats.deductibleByCurrency,
    policyCount: policies.total,
    coverageGapByCurrency: coverageGap,

    scenarioImpactByCurrency: isEmptyBuckets(scenarioStats.estimatedImpactByCurrency)
      ? null
      : scenarioStats.estimatedImpactByCurrency,
    scenarioCount: scenarios.total,

    auditProgramCount: audits.total,
    auditFindingsTotal: auditStats.findingsTotal,
    highCriticalFindings: auditStats.highCriticalFindings,
  }
}

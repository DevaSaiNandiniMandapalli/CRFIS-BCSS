import {
  getInsuranceStats,
  listPolicies,
} from '../repositories/insurance.js'
import { getRiskStats, listRisks } from '../repositories/risks.js'
import { listRemediations } from '../repositories/remediations.js'
import { listScenarios } from '../repositories/scenarios.js'

/*
 * Deterministic CRFIS analysis service (Phase 3L).
 *
 * - NO external AI provider is connected. Every answer is produced by
 *   fixed rules over live database statistics.
 * - All monetary reasoning is per-currency; currencies are never combined.
 * - Responses are clearly labelled so humans know this is not an external
 *   model and not authoritative.
 */

export interface AnalysisItem {
  id: string
  label: string
  currency?: string
  amount?: string
}

export interface AnalysisInsight {
  id: string
  title: string
  /** 'buckets' renders per-currency money; 'count' is a plain number;
   *  'items' is an explicit ranked list. */
  kind: 'buckets' | 'count' | 'items'
  buckets?: Record<string, string>
  count?: number
  items?: AnalysisItem[]
  note: string
}

export interface AnalysisPayload {
  mode: 'deterministic'
  provider: 'local-rule-based'
  humanInTheLoop: true
  disclaimer: string
  generatedAt: string
  insights: AnalysisInsight[]
}

function rankLabel(prefix: string, index: number): string {
  return `${prefix} ${index + 1}`
}

export async function buildAnalysis(): Promise<AnalysisPayload> {
  const [
    topExposureRisks,
    riskStats,
    topReductionActions,
    criticalRisks,
    policies,
    topImpactScenarios,
  ] = await Promise.all([
    listRisks({ filters: {}, page: 1, pageSize: 3, sortBy: 'exposure', order: 'desc' }),
    getRiskStats({}),
    listRemediations({ filters: {}, page: 1, pageSize: 3, sortBy: 'expectedReduction', order: 'desc' }),
    listRisks({ filters: { severity: 'Critical' }, page: 1, pageSize: 5, sortBy: 'exposure', order: 'desc' }),
    listPolicies({ filters: {}, page: 1, pageSize: 1, sortBy: 'expirationDate', order: 'asc' }),
    listScenarios({ filters: {}, page: 1, pageSize: 3, sortBy: 'estimatedImpact', order: 'desc' }),
  ])

  const insuranceCoverage = await getInsuranceStats({})
  const policyRows = policies.rows

  const insights: AnalysisInsight[] = [
    {
      id: 'highest-exposure-risks',
      title: 'Highest financial exposure',
      kind: 'items',
      items: topExposureRisks.rows.map((risk, index) => ({
        id: risk.id,
        label: `${rankLabel('Risk', index)}: ${risk.risk}`,
        currency: risk.currency,
        amount: risk.exposure.toString(),
      })),
      note: 'Top risks by recorded exposure, per record currency.',
    },
    {
      id: 'critical-risk-count',
      title: 'Critical risks requiring attention',
      kind: 'count',
      count: riskStats.bySeverity['Critical'] ?? 0,
      note: criticalRisks.total > 0
        ? `Includes ${criticalRisks.rows.map((risk) => risk.risk).join(', ')}.`
        : 'No critical risks on record.',
    },
    {
      id: 'greatest-expected-reduction',
      title: 'Greatest expected reduction actions',
      kind: 'items',
      items: topReductionActions.rows.map((item, index) => ({
        id: item.id,
        label: `${rankLabel('Action', index)}: ${item.action}`,
        currency: item.currency,
        amount: item.expectedReduction.toString(),
      })),
      note: 'Top remediation actions by expected exposure reduction.',
    },
    {
      id: 'insurance-coverage',
      title: 'Insurance coverage on record',
      kind: 'buckets',
      buckets: insuranceCoverage.coverageLimitByCurrency,
      note: `Across ${policyRows.length} recorded policies, grouped by policy currency.`,
    },
    {
      id: 'highest-impact-scenarios',
      title: 'Highest estimated scenario impact',
      kind: 'items',
      items: topImpactScenarios.rows.map((scenario, index) => ({
        id: scenario.id,
        label: `${rankLabel('Scenario', index)}: ${scenario.name}`,
        currency: scenario.currency,
        amount: scenario.estimatedImpact.toString(),
      })),
      note: 'Top modeled scenarios by estimated financial impact.',
    },
    {
      id: 'coverage-gap-context',
      title: 'Insurance policies on record',
      kind: 'count',
      count: policies.total,
      note: 'Premium and deductible totals are available on the Insurance page, grouped by currency.',
    },
  ]

  return {
    mode: 'deterministic',
    provider: 'local-rule-based',
    humanInTheLoop: true,
    disclaimer:
      'Deterministic analysis generated locally from CRFIS database statistics. ' +
      'No external AI provider is connected. This output is decision support only - ' +
      'a human reviewer must validate every conclusion before action.',
    generatedAt: new Date().toISOString(),
    insights,
  }
}

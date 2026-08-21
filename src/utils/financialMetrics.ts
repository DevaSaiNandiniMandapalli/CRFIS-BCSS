import type { Risk } from '../types/risk'
import type { Remediation } from '../types/remediation'
import type { InsurancePolicy } from '../types/insurance'
import type { Scenario } from '../types/scenario'
import type { Asset } from '../types/asset'

export function calculateTotalExposure(risks: Risk[]): number {
  return risks.reduce((total, risk) => total + risk.exposure, 0)
}

export function calculateCriticalRiskCount(risks: Risk[]): number {
  return risks.filter((risk) => risk.severity === 'Critical').length
}

export function calculateRemediationOpportunity(
  remediations: Remediation[],
): number {
  return remediations.reduce(
    (total, remediation) => total + remediation.expectedReduction,
    0,
  )
}

export function calculateRemediationCost(
  remediations: Remediation[],
): number {
  return remediations.reduce(
    (total, remediation) => total + remediation.estimatedCost,
    0,
  )
}

export function calculateNetRemediationBenefit(
  remediations: Remediation[],
): number {
  const reduction = calculateRemediationOpportunity(remediations)
  const cost = calculateRemediationCost(remediations)

  return reduction - cost
}

export function calculateReductionToCostRatio(
  remediations: Remediation[],
): number {
  const cost = calculateRemediationCost(remediations)

  if (cost === 0) {
    return 0
  }

  return calculateRemediationOpportunity(remediations) / cost
}

export function calculateRemainingExposure(
  risks: Risk[],
  remediations: Remediation[],
): number {
  const exposure = calculateTotalExposure(risks)
  const reduction = calculateRemediationOpportunity(remediations)

  return Math.max(exposure - reduction, 0)
}

export function calculateTotalInsuranceCoverage(
  policies: InsurancePolicy[],
): number {
  return policies.reduce(
    (total, policy) => total + policy.coverageLimit,
    0,
  )
}

export function calculateTotalInsurancePremium(
  policies: InsurancePolicy[],
): number {
  return policies.reduce(
    (total, policy) => total + policy.premium,
    0,
  )
}

export function calculateTotalInsuranceDeductible(
  policies: InsurancePolicy[],
): number {
  return policies.reduce(
    (total, policy) => total + policy.deductible,
    0,
  )
}

export function calculateInsuranceCoverageGap(
  risks: Risk[],
  policies: InsurancePolicy[],
): number {
  const exposure = calculateTotalExposure(risks)
  const coverage = calculateTotalInsuranceCoverage(policies)

  return Math.max(exposure - coverage, 0)
}

export function calculateAnnualizedLossExpectancy(
  risks: Risk[],
): number {
  /*
   * CRFIS demonstration assumption:
   * 25% of total exposure.
   *
   * This is NOT a production financial,
   * actuarial, or risk calculation.
   */
  return calculateTotalExposure(risks) * 0.25
}

export function calculateTotalScenarioImpact(
  scenarios: Scenario[],
): number {
  return scenarios.reduce(
    (total, scenario) => total + scenario.estimatedImpact,
    0,
  )
}
export function calculateTotalAssetValue(
  assets: Asset[],
): number {
  return assets.reduce(
    (total, asset) => total + asset.annualValue,
    0,
  )
}
import type { Risk } from '../types/risk'
import type { Remediation } from '../types/remediation'
import type { InsurancePolicy } from '../types/insurance'

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
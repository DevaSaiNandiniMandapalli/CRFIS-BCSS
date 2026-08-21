import type { Risk } from '../types/risk'
import type { Remediation } from '../types/remediation'

export function calculateTotalExposure(risks: Risk[]): number {
  return risks.reduce((total, risk) => total + risk.exposure, 0)
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
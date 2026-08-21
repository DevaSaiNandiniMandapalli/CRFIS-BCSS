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
import type { Money } from './money'

export type ThemePreference = 'light' | 'dark' | 'system'

/** A financial threshold with an explicit currency denomination. */
export interface RiskThreshold {
  amount: Money
  description: string
}

export interface PlatformSettings {
  workspaceName: string
  environment: string
  version: string
  dataConnection: string
}

export interface RiskSettings {
  criticalThreshold: RiskThreshold
  highThreshold: RiskThreshold
  financialModel: string
}

export interface GovernanceSettings {
  approvalRequired: boolean
  evidenceRequired: boolean
  auditTracking: boolean
}

export interface AISettings {
  demoMode: boolean
  humanReview: boolean
  decisionSupportOnly: boolean
}

export interface CRFISSettings {
  platform: PlatformSettings
  theme: ThemePreference
  risk: RiskSettings
  governance: GovernanceSettings
  ai: AISettings
}
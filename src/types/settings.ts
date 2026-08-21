export type ThemePreference = 'light' | 'dark' | 'system'

export interface PlatformSettings {
  workspaceName: string
  environment: string
  version: string
  dataConnection: string
}

export interface RiskSettings {
  criticalThreshold: string
  highThreshold: string
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
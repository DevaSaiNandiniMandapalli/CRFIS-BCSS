export type RemediationPriority =
  | 'Critical'
  | 'High'
  | 'Medium'
  | 'Low'

export type RemediationStatus =
  | 'Open'
  | 'In Progress'
  | 'Blocked'
  | 'Completed'

export type RemediationCategory =
  | 'Access Control'
  | 'Infrastructure'
  | 'Data Protection'
  | 'Cloud Security'
  | 'Backup & Recovery'
  | 'Third Party'

export interface Remediation {
  id: string
  action: string

  // Existing display name.
  relatedRisk: string

  // Actual relationship to the Risk Register.
  riskId: string

  // Existing display name.
  asset: string

  // Actual relationship to the Asset Register.
  assetId: string

  category: RemediationCategory
  priority: RemediationPriority
  owner: string
  dueDate: string
  status: RemediationStatus
  estimatedCost: number
  expectedReduction: number
  isDemo: true
}
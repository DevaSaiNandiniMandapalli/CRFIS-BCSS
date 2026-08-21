export type ScenarioSeverity = 'Critical' | 'High' | 'Medium' | 'Low'

export type ScenarioStatus =
  | 'Draft'
  | 'Under Review'
  | 'Approved'
  | 'Archived'

export type ScenarioCategory =
  | 'Ransomware'
  | 'Data Breach'
  | 'Business Interruption'
  | 'Cloud Outage'
  | 'Third Party'
  | 'Insider Threat'

export interface Scenario {
  id: string
  name: string
  category: ScenarioCategory
  description: string

  // Relationships to the existing CRFIS risk and asset registers.
  riskId: string
  assetId: string

  severity: ScenarioSeverity
  probability: string
  estimatedImpact: number
  businessImpact: string
  status: ScenarioStatus
  owner: string
  isDemo: true
}
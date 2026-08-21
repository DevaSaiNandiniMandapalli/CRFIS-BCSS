export type RiskSeverity =
  | 'Critical'
  | 'High'
  | 'Medium'
  | 'Low'

export type RiskLikelihood =
  | 'Very High'
  | 'High'
  | 'Medium'
  | 'Low'

export type RiskStatus =
  | 'Open'
  | 'Under Review'
  | 'Mitigated'
  | 'Accepted'

export type RiskCategory =
  | 'Ransomware'
  | 'Identity'
  | 'Data Security'
  | 'Cloud Security'
  | 'Third Party'
  | 'Insider Risk'

export interface Risk {
  id: string
  risk: string

  // Display name kept for compatibility with the current UI.
  asset: string

  // Relationship to the Asset Register.
  assetId: string

  category: RiskCategory
  severity: RiskSeverity
  likelihood: RiskLikelihood
  exposure: number
  status: RiskStatus
  owner: string
  lastUpdated: string
  isDemo: true
}
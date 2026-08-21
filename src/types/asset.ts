export type AssetCriticality = 'Critical' | 'High' | 'Medium' | 'Low'

export type AssetStatus = 'At Risk' | 'Monitored' | 'Healthy' | 'Under Review'

export type AssetType =
  | 'Infrastructure'
  | 'Application'
  | 'Data'
  | 'Cloud'
  | 'Endpoint'
  | 'Third Party'

export interface Asset {
  id: string
  name: string
  type: AssetType
  businessUnit: string
  criticality: AssetCriticality
  annualValue: number
  status: AssetStatus
  owner: string
  lastUpdated: string
  isDemo: true
}
import type { CurrencyCode } from './money'

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

  /*
   * Currency of annualValue. Assets may operate in different countries,
   * so the denomination is always explicit - never assumed.
   */
  currency: CurrencyCode
  annualValue: number

  status: AssetStatus
  owner: string
  lastUpdated: string
  isDemo: true
}
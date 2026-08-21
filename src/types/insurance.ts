export type InsuranceStatus =
  | 'Active'
  | 'Expiring Soon'
  | 'Under Review'
  | 'Pending'

export type InsuranceCoverageType =
  | 'Cyber Liability'
  | 'Business Interruption'
  | 'Data Breach'
  | 'Ransomware'
  | 'Technology Errors & Omissions'

export interface InsurancePolicy {
  id: string
  policyNumber: string
  provider: string
  coverageType: InsuranceCoverageType
  coverageLimit: number
  deductible: number
  premium: number
  expirationDate: string
  status: InsuranceStatus
  coveredAssets: number
  notes: string
  isDemo: true
}
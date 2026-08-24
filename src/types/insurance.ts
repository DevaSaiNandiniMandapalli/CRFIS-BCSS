import type { CurrencyCode } from './money'

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

  /*
   * Policy currency, set by the insurer contract. Coverage limit,
   * deductible, and premium are always denominated in this currency.
   */
  currency: CurrencyCode
  coverageLimit: number
  deductible: number
  premium: number
  expirationDate: string
  status: InsuranceStatus

  // Existing display count.
  coveredAssets: number

  // Actual relationships to the Asset Register.
  assetIds: string[]

  notes: string
  isDemo: true
}
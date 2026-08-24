import type { CurrencyCode } from './money'

/*
 * API wire contracts for Phase 3D read endpoints.
 *
 * Money is a decimal STRING (exact scale preserved) paired with the
 * record's own ISO-4217 currency. The frontend never infers or converts.
 */

export interface AssetDto {
  id: string
  name: string
  type: string
  businessUnit: string
  criticality: string
  currency: CurrencyCode
  annualValue: string
  status: string
  owner: string
  lastUpdated: string
}

export interface AssetListStats {
  byCriticality: Record<string, number>
  byStatus: Record<string, number>
  annualValueByCurrency: Record<string, string>
  highValueCount: number
}

export interface RiskDto {
  id: string
  risk: string
  assetId: string
  asset: { id: string; name: string } | null
  category: string
  severity: string
  likelihood: string
  currency: CurrencyCode
  exposure: string
  status: string
  owner: string
  lastUpdated: string
}

export interface RiskListStats {
  bySeverity: Record<string, number>
  byStatus: Record<string, number>
  exposureByCurrency: Record<string, string>
}

export interface ListMeta {
  total: number
  page: number
  pageSize: number
  pageCount: number
}

export interface AssetListResponse {
  data: AssetDto[]
  meta: ListMeta & { stats: AssetListStats }
}

export interface RiskListResponse {
  data: RiskDto[]
  meta: ListMeta & { stats: RiskListStats }
}

export interface RemediationDto {
  id: string
  action: string
  category: string
  priority: string
  owner: string
  dueDate: string
  status: string
  currency: CurrencyCode
  estimatedCost: string
  expectedReduction: string
  riskId: string
  risk: { id: string; risk: string } | null
  assetId: string
  asset: { id: string; name: string } | null
}

export interface RemediationListStats {
  byPriority: Record<string, number>
  byStatus: Record<string, number>
  expectedReductionByCurrency: Record<string, string>
  estimatedCostByCurrency: Record<string, string>
  overdueCount: number
}

export interface RemediationListResponse {
  data: RemediationDto[]
  meta: ListMeta & { stats: RemediationListStats }
}

export interface ScenarioDto {
  id: string
  name: string
  category: string
  description: string
  severity: string
  probability: string
  currency: CurrencyCode
  estimatedImpact: string
  businessImpact: string
  status: string
  owner: string
  riskId: string
  risk: { id: string; risk: string } | null
  assetId: string
  asset: { id: string; name: string } | null
}

export interface ScenarioListStats {
  bySeverity: Record<string, number>
  byStatus: Record<string, number>
  estimatedImpactByCurrency: Record<string, string>
}

export interface ScenarioListResponse {
  data: ScenarioDto[]
  meta: ListMeta & { stats: ScenarioListStats }
}

export interface InsurancePolicyDto {
  id: string
  policyNumber: string
  provider: string
  coverageType: string
  currency: CurrencyCode
  coverageLimit: string
  deductible: string
  premium: string
  expirationDate: string
  status: string
  notes: string | null
  assetIds: string[]
  coveredAssets: number
  assets: Array<{ id: string; name: string }>
}

export interface InsuranceListStats {
  byStatus: Record<string, number>
  coverageLimitByCurrency: Record<string, string>
  premiumByCurrency: Record<string, string>
  deductibleByCurrency: Record<string, string>
}

export interface InsuranceListResponse {
  data: InsurancePolicyDto[]
  meta: ListMeta & { stats: InsuranceListStats }
}

export interface AuditDto {
  id: string
  framework: string
  scope: string
  status: string
  findings: number
  owner: string
  dueDate: string
}

export interface AuditListStats {
  byStatus: Record<string, number>
  findingsTotal: number
  highCriticalFindings: number
}

export interface AuditListResponse {
  data: AuditDto[]
  meta: ListMeta & { stats: AuditListStats }
}

export interface AuditFindingDto {
  id: string
  auditId: string
  audit: { id: string } | null
  riskId: string | null
  risk: { id: string; risk: string } | null
  remediationId: string | null
  remediation: { id: string } | null
  description: string
  severity: string
  status: string
  owner: string
  dueDate: string
}

export type AuditFindingListResponse = {
  data: AuditFindingDto[]
  meta: ListMeta
}

export interface ReportDto {
  id: string
  name: string
  type: string
  period: string
  status: string
  generatedAt: string
  owner: string
}

export type ReportListResponse = {
  data: ReportDto[]
  meta: ListMeta
}

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

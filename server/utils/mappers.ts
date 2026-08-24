import { dateToIso, decimalToString, type MoneyInput } from './serialize.js'

// Central API mappers: database rows in, JSON-safe DTOs out.
//
// Rules for every mapper:
// - Money goes through decimalToString (scale-exact strings) paired with
//   the record's currency; dates through dateToIso.
// - Nullable columns stay nullable.
// - Display-only fields the UI expects (`asset`, `relatedRisk`, `findings`,
//   `assetIds`, `coveredAssets`) are derived here from included relations or
//   aggregates - never stored in the database.
// - The demo-data-only `isDemo` flag is intentionally NOT emitted; it belongs
//   to static frontend fixtures, not to persisted records.

type DateInput = Date | string

export interface AssetRecord {
  id: string
  name: string
  type: string
  businessUnit: string
  criticality: string
  currency: string
  annualValue: MoneyInput
  status: string
  owner: string
  lastUpdated: DateInput
}

/**
 * API DTO. Money is a decimal STRING preserving database scale and the
 * currency always comes from the record - never inferred, never converted.
 */
export interface MappedAsset {
  id: string
  name: string
  type: string
  businessUnit: string
  criticality: string
  currency: string
  annualValue: string
  status: string
  owner: string
  lastUpdated: string
}

export function mapAsset(asset: AssetRecord): MappedAsset {
  return {
    id: asset.id,
    name: asset.name,
    type: asset.type,
    businessUnit: asset.businessUnit,
    criticality: asset.criticality,
    currency: asset.currency,
    annualValue: decimalToString(asset.annualValue),
    status: asset.status,
    owner: asset.owner,
    lastUpdated: dateToIso(asset.lastUpdated),
  }
}

export interface RiskRecord {
  id: string
  risk: string
  category: string
  severity: string
  likelihood: string
  currency: string
  exposure: MoneyInput
  status: string
  owner: string
  lastUpdated: DateInput
  // Resolved from the required Asset relation via include({ asset: true }).
  assetId: string
  asset?: { id: string; name: string } | null
}

export interface MappedRisk {
  id: string
  risk: string
  assetId: string
  // Related display entity loaded through Prisma relations, never assembled
  // from client/demo data.
  asset: { id: string; name: string } | null
  category: string
  severity: string
  likelihood: string
  currency: string
  exposure: string
  status: string
  owner: string
  lastUpdated: string
}

export function mapRisk(risk: RiskRecord): MappedRisk {
  return {
    id: risk.id,
    risk: risk.risk,
    assetId: risk.assetId,
    asset: risk.asset ? { id: risk.asset.id, name: risk.asset.name } : null,
    category: risk.category,
    severity: risk.severity,
    likelihood: risk.likelihood,
    currency: risk.currency,
    exposure: decimalToString(risk.exposure),
    status: risk.status,
    owner: risk.owner,
    lastUpdated: dateToIso(risk.lastUpdated),
  }
}

export interface RemediationRecord {
  id: string
  action: string
  category: string
  priority: string
  owner: string
  dueDate: DateInput
  status: string
  currency: string
  estimatedCost: MoneyInput
  expectedReduction: MoneyInput
  // Resolved from relations via include({ risk, asset }) - never assembled
  // from client or demo data.
  riskId: string
  risk?: { id: string; risk: string } | null
  assetId: string
  asset?: { id: string; name: string } | null
}

/**
 * API DTO. Money fields are decimal STRINGS with the record's own currency;
 * dates are ISO strings; relations are the display entities the UI expects.
 */
export interface MappedRemediation {
  id: string
  action: string
  category: string
  priority: string
  owner: string
  dueDate: string
  status: string
  currency: string
  estimatedCost: string
  expectedReduction: string
  riskId: string
  risk: { id: string; risk: string } | null
  assetId: string
  asset: { id: string; name: string } | null
}

export function mapRemediation(remediation: RemediationRecord): MappedRemediation {
  return {
    id: remediation.id,
    action: remediation.action,
    category: remediation.category,
    priority: remediation.priority,
    owner: remediation.owner,
    dueDate: dateToIso(remediation.dueDate),
    status: remediation.status,
    currency: remediation.currency,
    estimatedCost: decimalToString(remediation.estimatedCost),
    expectedReduction: decimalToString(remediation.expectedReduction),
    riskId: remediation.riskId,
    risk: remediation.risk ? { id: remediation.risk.id, risk: remediation.risk.risk } : null,
    assetId: remediation.assetId,
    asset: remediation.asset
      ? { id: remediation.asset.id, name: remediation.asset.name }
      : null,
  }
}

export interface ScenarioRecord {
  id: string
  name: string
  category: string
  description: string
  severity: string
  probability: string
  currency: string
  estimatedImpact: MoneyInput
  businessImpact: string
  status: string
  owner: string
  riskId: string
  assetId: string
  risk?: { id: string; risk: string } | null
  asset?: { id: string; name: string } | null
}

export interface MappedScenario {
  id: string
  name: string
  category: string
  description: string
  severity: string
  probability: string
  currency: string
  estimatedImpact: string
  businessImpact: string
  status: string
  owner: string
  riskId: string
  risk: { id: string; risk: string } | null
  assetId: string
  asset: { id: string; name: string } | null
}

export function mapScenario(scenario: ScenarioRecord): MappedScenario {
  return {
    id: scenario.id,
    name: scenario.name,
    category: scenario.category,
    description: scenario.description,
    severity: scenario.severity,
    probability: scenario.probability,
    currency: scenario.currency,
    estimatedImpact: decimalToString(scenario.estimatedImpact),
    businessImpact: scenario.businessImpact,
    status: scenario.status,
    owner: scenario.owner,
    riskId: scenario.riskId,
    risk: scenario.risk ? { id: scenario.risk.id, risk: scenario.risk.risk } : null,
    assetId: scenario.assetId,
    asset: scenario.asset
      ? { id: scenario.asset.id, name: scenario.asset.name }
      : null,
  }
}

export interface InsurancePolicyRecord {
  id: string
  policyNumber: string
  provider: string
  coverageType: string
  currency: string
  coverageLimit: MoneyInput
  deductible: MoneyInput
  premium: MoneyInput
  expirationDate: DateInput
  status: string
  notes: string | null
  // Join-table rows with the related Asset resolved via include().
  assetLinks?: Array<{ assetId: string; asset: { id: string; name: string } }> | null
}

/**
 * API DTO. Money fields are scale-exact decimal strings denominated in the
 * policy's own currency; null notes stay null; covered assets are resolved
 * through the join table into display entities.
 */
export interface MappedInsurancePolicy {
  id: string
  policyNumber: string
  provider: string
  coverageType: string
  currency: string
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

export function mapInsurancePolicy(policy: InsurancePolicyRecord): MappedInsurancePolicy {
  const links = policy.assetLinks ?? []

  return {
    id: policy.id,
    policyNumber: policy.policyNumber,
    provider: policy.provider,
    coverageType: policy.coverageType,
    currency: policy.currency,
    coverageLimit: decimalToString(policy.coverageLimit),
    deductible: decimalToString(policy.deductible),
    premium: decimalToString(policy.premium),
    expirationDate: dateToIso(policy.expirationDate),
    status: policy.status,
    notes: policy.notes,
    assetIds: links.map((link) => link.assetId),
    coveredAssets: links.length,
    assets: links.map((link) => ({ id: link.asset.id, name: link.asset.name })),
  }
}

export interface AuditRecord {
  id: string
  framework: string
  scope: string
  status: string
  owner: string
  dueDate: DateInput
  // Prisma aggregate via include({ _count: { select: { findings: true } } }).
  _count?: { findings: number } | null
}

export interface MappedAudit {
  id: string
  framework: string
  scope: string
  status: string
  findings: number
  owner: string
  dueDate: string
}

export function mapAudit(audit: AuditRecord): MappedAudit {
  return {
    id: audit.id,
    framework: audit.framework,
    scope: audit.scope,
    status: audit.status,
    findings: audit._count?.findings ?? 0,
    owner: audit.owner,
    dueDate: dateToIso(audit.dueDate),
  }
}

export interface AuditFindingRecord {
  id: string
  auditId: string
  riskId: string | null
  remediationId: string | null
  description: string
  severity: string
  status: string
  owner: string
  dueDate: DateInput
}

export interface MappedAuditFinding {
  id: string
  auditId: string
  riskId: string | null
  remediationId: string | null
  description: string
  severity: string
  status: string
  owner: string
  dueDate: string
}

export function mapAuditFinding(finding: AuditFindingRecord): MappedAuditFinding {
  return {
    id: finding.id,
    auditId: finding.auditId,
    riskId: finding.riskId,
    remediationId: finding.remediationId,
    description: finding.description,
    severity: finding.severity,
    status: finding.status,
    owner: finding.owner,
    dueDate: dateToIso(finding.dueDate),
  }
}

export interface ReportRecord {
  id: string
  name: string
  type: string
  period: string
  status: string
  generatedAt: DateInput
  owner: string
}

export interface MappedReport extends Omit<ReportRecord, 'generatedAt'> {
  generatedAt: string
}

export function mapReport(report: ReportRecord): MappedReport {
  return {
    id: report.id,
    name: report.name,
    type: report.type,
    period: report.period,
    status: report.status,
    generatedAt: dateToIso(report.generatedAt),
    owner: report.owner,
  }
}

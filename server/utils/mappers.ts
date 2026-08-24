import { dateToIso, decimalToNumber, type MoneyInput } from './serialize.js'

// Central API mappers: database rows in, JSON-safe DTOs out.
//
// Rules for every mapper:
// - Money goes through decimalToNumber, dates through dateToIso.
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
  annualValue: MoneyInput
  status: string
  owner: string
  lastUpdated: DateInput
}

export interface MappedAsset {
  id: string
  name: string
  type: string
  businessUnit: string
  criticality: string
  annualValue: number
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
    annualValue: decimalToNumber(asset.annualValue),
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
  exposure: MoneyInput
  status: string
  owner: string
  lastUpdated: DateInput
  // Resolved from the required Asset relation via include({ asset: true }).
  asset?: { name: string } | null
}

export interface MappedRisk {
  id: string
  risk: string
  asset: string | null
  assetId: string
  category: string
  severity: string
  likelihood: string
  exposure: number
  status: string
  owner: string
  lastUpdated: string
}

export function mapRisk(risk: RiskRecord & { assetId: string }): MappedRisk {
  return {
    id: risk.id,
    risk: risk.risk,
    asset: risk.asset?.name ?? null,
    assetId: risk.assetId,
    category: risk.category,
    severity: risk.severity,
    likelihood: risk.likelihood,
    exposure: decimalToNumber(risk.exposure),
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
  estimatedCost: MoneyInput
  expectedReduction: MoneyInput
  // Resolved from relations via include({ risk: true, asset: true }).
  risk?: { id: string; risk: string } | null
  asset?: { name: string } | null
}

export interface MappedRemediation {
  id: string
  action: string
  relatedRisk: string | null
  riskId: string
  asset: string | null
  assetId: string
  category: string
  priority: string
  owner: string
  dueDate: string
  status: string
  estimatedCost: number
  expectedReduction: number
}

export function mapRemediation(
  remediation: RemediationRecord & { riskId: string; assetId: string },
): MappedRemediation {
  return {
    id: remediation.id,
    action: remediation.action,
    relatedRisk: remediation.risk?.risk ?? null,
    riskId: remediation.riskId,
    asset: remediation.asset?.name ?? null,
    assetId: remediation.assetId,
    category: remediation.category,
    priority: remediation.priority,
    owner: remediation.owner,
    dueDate: dateToIso(remediation.dueDate),
    status: remediation.status,
    estimatedCost: decimalToNumber(remediation.estimatedCost),
    expectedReduction: decimalToNumber(remediation.expectedReduction),
  }
}

export interface ScenarioRecord {
  id: string
  name: string
  category: string
  description: string
  severity: string
  probability: string
  estimatedImpact: MoneyInput
  businessImpact: string
  status: string
  owner: string
}

export interface MappedScenario extends Omit<ScenarioRecord, 'estimatedImpact'> {
  estimatedImpact: number
}

export function mapScenario(scenario: ScenarioRecord & { riskId: string; assetId: string }) {
  return {
    ...mapScenarioFields(scenario),
    riskId: scenario.riskId,
    assetId: scenario.assetId,
  }
}

function mapScenarioFields(scenario: ScenarioRecord): MappedScenario {
  return {
    id: scenario.id,
    name: scenario.name,
    category: scenario.category,
    description: scenario.description,
    severity: scenario.severity,
    probability: scenario.probability,
    estimatedImpact: decimalToNumber(scenario.estimatedImpact),
    businessImpact: scenario.businessImpact,
    status: scenario.status,
    owner: scenario.owner,
  }
}

export interface InsurancePolicyRecord {
  id: string
  policyNumber: string
  provider: string
  coverageType: string
  coverageLimit: MoneyInput
  deductible: MoneyInput
  premium: MoneyInput
  expirationDate: DateInput
  status: string
  notes: string | null
  // Flattened from InsurancePolicyAsset join rows via include().
  assetLinks?: Array<{ assetId: string }> | null
}

export interface MappedInsurancePolicy {
  id: string
  policyNumber: string
  provider: string
  coverageType: string
  coverageLimit: number
  deductible: number
  premium: number
  expirationDate: string
  status: string
  notes: string | null
  assetIds: string[]
  coveredAssets: number
}

export function mapInsurancePolicy(policy: InsurancePolicyRecord): MappedInsurancePolicy {
  const assetIds = (policy.assetLinks ?? []).map((link) => link.assetId)

  return {
    id: policy.id,
    policyNumber: policy.policyNumber,
    provider: policy.provider,
    coverageType: policy.coverageType,
    coverageLimit: decimalToNumber(policy.coverageLimit),
    deductible: decimalToNumber(policy.deductible),
    premium: decimalToNumber(policy.premium),
    expirationDate: dateToIso(policy.expirationDate),
    status: policy.status,
    notes: policy.notes,
    assetIds,
    coveredAssets: assetIds.length,
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

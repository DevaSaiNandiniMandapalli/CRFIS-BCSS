import { z } from 'zod'

// Shared categorical values for the CRFIS API.
//
// Every union below mirrors the existing frontend types in src/types/*
// value-for-value. The Prisma schema stores these as free-form strings,
// so these schemas are the single validation boundary that keeps the
// database and the UI vocabulary aligned.
//
// Do not invent new values here; extend the frontend type first and then
// mirror it in the corresponding tuple.

export const ASSET_CRITICALITY_VALUES = ['Critical', 'High', 'Medium', 'Low'] as const
export const ASSET_STATUS_VALUES = ['At Risk', 'Monitored', 'Healthy', 'Under Review'] as const
export const ASSET_TYPE_VALUES = [
  'Infrastructure',
  'Application',
  'Data',
  'Cloud',
  'Endpoint',
  'Third Party',
] as const

export const RISK_SEVERITY_VALUES = ['Critical', 'High', 'Medium', 'Low'] as const
export const RISK_LIKELIHOOD_VALUES = ['Very High', 'High', 'Medium', 'Low'] as const
export const RISK_STATUS_VALUES = ['Open', 'Under Review', 'Mitigated', 'Accepted'] as const
export const RISK_CATEGORY_VALUES = [
  'Ransomware',
  'Identity',
  'Data Security',
  'Cloud Security',
  'Third Party',
  'Insider Risk',
] as const

export const REMEDIATION_PRIORITY_VALUES = ['Critical', 'High', 'Medium', 'Low'] as const
export const REMEDIATION_STATUS_VALUES = ['Open', 'In Progress', 'Blocked', 'Completed'] as const
export const REMEDIATION_CATEGORY_VALUES = [
  'Access Control',
  'Infrastructure',
  'Data Protection',
  'Cloud Security',
  'Backup & Recovery',
  'Third Party',
] as const

export const SCENARIO_SEVERITY_VALUES = ['Critical', 'High', 'Medium', 'Low'] as const
export const SCENARIO_STATUS_VALUES = ['Draft', 'Under Review', 'Approved', 'Archived'] as const
export const SCENARIO_CATEGORY_VALUES = [
  'Ransomware',
  'Data Breach',
  'Business Interruption',
  'Cloud Outage',
  'Third Party',
  'Insider Threat',
] as const

export const INSURANCE_STATUS_VALUES = ['Active', 'Expiring Soon', 'Under Review', 'Pending'] as const
export const INSURANCE_COVERAGE_TYPE_VALUES = [
  'Cyber Liability',
  'Business Interruption',
  'Data Breach',
  'Ransomware',
  'Technology Errors & Omissions',
] as const

export const AUDIT_STATUS_VALUES = ['Completed', 'Under Review', 'In Progress', 'Planned', 'Overdue'] as const

export const REPORT_STATUS_VALUES = ['Ready', 'Draft', 'Under Review'] as const
export const REPORT_TYPE_VALUES = [
  'Executive Risk Report',
  'Financial Exposure Report',
  'Asset Exposure Report',
  'Remediation Report',
  'Insurance Coverage Report',
] as const

export const assetCriticalitySchema = z.enum(ASSET_CRITICALITY_VALUES)
export const assetStatusSchema = z.enum(ASSET_STATUS_VALUES)
export const assetTypeSchema = z.enum(ASSET_TYPE_VALUES)

export const riskSeveritySchema = z.enum(RISK_SEVERITY_VALUES)
export const riskLikelihoodSchema = z.enum(RISK_LIKELIHOOD_VALUES)
export const riskStatusSchema = z.enum(RISK_STATUS_VALUES)
export const riskCategorySchema = z.enum(RISK_CATEGORY_VALUES)

export const remediationPrioritySchema = z.enum(REMEDIATION_PRIORITY_VALUES)
export const remediationStatusSchema = z.enum(REMEDIATION_STATUS_VALUES)
export const remediationCategorySchema = z.enum(REMEDIATION_CATEGORY_VALUES)

export const scenarioSeveritySchema = z.enum(SCENARIO_SEVERITY_VALUES)
export const scenarioStatusSchema = z.enum(SCENARIO_STATUS_VALUES)
export const scenarioCategorySchema = z.enum(SCENARIO_CATEGORY_VALUES)

export const insuranceStatusSchema = z.enum(INSURANCE_STATUS_VALUES)
export const insuranceCoverageTypeSchema = z.enum(INSURANCE_COVERAGE_TYPE_VALUES)

export const auditStatusSchema = z.enum(AUDIT_STATUS_VALUES)

export const reportStatusSchema = z.enum(REPORT_STATUS_VALUES)
export const reportTypeSchema = z.enum(REPORT_TYPE_VALUES)

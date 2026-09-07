/**
 * Idempotent demo seed for CRFIS.
 *
 * Creates a controlled demonstration dataset with deterministic DEMO-* IDs.
 * Safe to run repeatedly: preserves non-DEMO records, upserts existing DEMO
 * records, and creates dependencies in the correct order.
 *
 * Usage:  npx tsx --env-file=.env server/seed-demo.ts
 *     or: npm run seed:demo
 */

import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../src/generated/prisma/client.js'

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
})

function d(value: number): string {
  return value.toFixed(2)
}

function pastDate(daysAgo: number): Date {
  const dt = new Date()
  dt.setDate(dt.getDate() - daysAgo)
  return dt
}

function futureDate(daysAhead: number): Date {
  const dt = new Date()
  dt.setDate(dt.getDate() + daysAhead)
  return dt
}

const now = new Date()

const ASSETS = [
  {
    id: 'DEMO-AST-001',
    name: 'Global Payment Gateway',
    type: 'Application',
    businessUnit: 'Payments',
    criticality: 'Critical',
    currency: 'USD',
    annualValue: d(48_500_000),
    status: 'Production',
    owner: 'Priya Nair',
  },
  {
    id: 'DEMO-AST-002',
    name: 'EU Customer Data Warehouse',
    type: 'Database',
    businessUnit: 'Data Engineering',
    criticality: 'Critical',
    currency: 'EUR',
    annualValue: d(32_750_000),
    status: 'Production',
    owner: 'Lukas Muller',
  },
  {
    id: 'DEMO-AST-003',
    name: 'Internal HR Portal',
    type: 'Application',
    businessUnit: 'Human Resources',
    criticality: 'Medium',
    currency: 'INR',
    annualValue: d(12_000_000),
    status: 'Production',
    owner: 'Aarav Sharma',
  },
  {
    id: 'DEMO-AST-004',
    name: 'Manufacturing IoT Fleet',
    type: 'Infrastructure',
    businessUnit: 'Operations',
    criticality: 'High',
    currency: 'USD',
    annualValue: d(27_300_000),
    status: 'Production',
    owner: 'Maria Costa',
  },
  {
    id: 'DEMO-AST-005',
    name: 'Corporate Email System',
    type: 'Application',
    businessUnit: 'IT Operations',
    criticality: 'High',
    currency: 'USD',
    annualValue: d(15_600_000),
    status: 'Production',
    owner: 'James OBrien',
  },
  {
    id: 'DEMO-AST-006',
    name: 'Regulatory Reporting Engine',
    type: 'Application',
    businessUnit: 'Compliance',
    criticality: 'Critical',
    currency: 'EUR',
    annualValue: d(21_900_000),
    status: 'Production',
    owner: 'Sofia Rossi',
  },
]

const RISKS = [
  {
    id: 'DEMO-RSK-001',
    risk: 'Ransomware encrypts payment gateway databases',
    assetId: 'DEMO-AST-001',
    category: 'Cyber',
    severity: 'Critical',
    likelihood: 'Likely',
    currency: 'USD',
    exposure: d(42_000_000),
    status: 'Open',
    owner: 'Priya Nair',
  },
  {
    id: 'DEMO-RSK-002',
    risk: 'GDPR breach from unauthorized data warehouse access',
    assetId: 'DEMO-AST-002',
    category: 'Compliance',
    severity: 'Critical',
    likelihood: 'Possible',
    currency: 'EUR',
    exposure: d(28_500_000),
    status: 'Open',
    owner: 'Lukas Muller',
  },
  {
    id: 'DEMO-RSK-003',
    risk: 'Privilege escalation in HR portal exposes PII',
    assetId: 'DEMO-AST-003',
    category: 'Cyber',
    severity: 'High',
    likelihood: 'Likely',
    currency: 'INR',
    exposure: d(9_800_000),
    status: 'Open',
    owner: 'Aarav Sharma',
  },
  {
    id: 'DEMO-RSK-004',
    risk: 'IoT firmware supply-chain compromise',
    assetId: 'DEMO-AST-004',
    category: 'Operational',
    severity: 'High',
    likelihood: 'Unlikely',
    currency: 'USD',
    exposure: d(18_200_000),
    status: 'Monitoring',
    owner: 'Maria Costa',
  },
  {
    id: 'DEMO-RSK-005',
    risk: 'Business email compromise via phishing',
    assetId: 'DEMO-AST-005',
    category: 'Cyber',
    severity: 'Medium',
    likelihood: 'Likely',
    currency: 'USD',
    exposure: d(6_400_000),
    status: 'Open',
    owner: 'James OBrien',
  },
  {
    id: 'DEMO-RSK-006',
    risk: 'Regulatory fine for late reporting submission',
    assetId: 'DEMO-AST-006',
    category: 'Compliance',
    severity: 'Critical',
    likelihood: 'Possible',
    currency: 'EUR',
    exposure: d(15_000_000),
    status: 'Open',
    owner: 'Sofia Rossi',
  },
]

const REMEDIATIONS = [
  {
    id: 'DEMO-REM-001',
    action: 'Deploy immutable backups with 4-hour RPO for payment systems',
    riskId: 'DEMO-RSK-001',
    assetId: 'DEMO-AST-001',
    category: 'Cyber',
    priority: 'Critical',
    owner: 'Priya Nair',
    dueDate: pastDate(10),
    status: 'In Progress',
    currency: 'USD',
    estimatedCost: d(1_250_000),
    expectedReduction: d(18_000_000),
  },
  {
    id: 'DEMO-REM-002',
    action: 'Implement row-level access controls on data warehouse',
    riskId: 'DEMO-RSK-002',
    assetId: 'DEMO-AST-002',
    category: 'Compliance',
    priority: 'Critical',
    owner: 'Lukas Muller',
    dueDate: pastDate(5),
    status: 'Blocked',
    currency: 'EUR',
    estimatedCost: d(890_000),
    expectedReduction: d(12_000_000),
  },
  {
    id: 'DEMO-REM-003',
    action: 'Patch HR portal RBAC module and run penetration test',
    riskId: 'DEMO-RSK-003',
    assetId: 'DEMO-AST-003',
    category: 'Cyber',
    priority: 'High',
    owner: 'Aarav Sharma',
    dueDate: futureDate(14),
    status: 'Open',
    currency: 'INR',
    estimatedCost: d(3_200_000),
    expectedReduction: d(7_500_000),
  },
  {
    id: 'DEMO-REM-004',
    action: 'Establish IoT firmware signing and SBOM verification pipeline',
    riskId: 'DEMO-RSK-004',
    assetId: 'DEMO-AST-004',
    category: 'Operational',
    priority: 'High',
    owner: 'Maria Costa',
    dueDate: futureDate(30),
    status: 'In Progress',
    currency: 'USD',
    estimatedCost: d(2_100_000),
    expectedReduction: d(9_500_000),
  },
  {
    id: 'DEMO-REM-005',
    action: 'Roll out mandatory phishing awareness training company-wide',
    riskId: 'DEMO-RSK-005',
    assetId: 'DEMO-AST-005',
    category: 'Cyber',
    priority: 'Medium',
    owner: 'James OBrien',
    dueDate: futureDate(60),
    status: 'Completed',
    currency: 'USD',
    estimatedCost: d(180_000),
    expectedReduction: d(3_200_000),
  },
  {
    id: 'DEMO-REM-006',
    action: 'Automate regulatory report compilation and submission workflows',
    riskId: 'DEMO-RSK-006',
    assetId: 'DEMO-AST-006',
    category: 'Compliance',
    priority: 'High',
    owner: 'Sofia Rossi',
    dueDate: futureDate(21),
    status: 'Open',
    currency: 'EUR',
    estimatedCost: d(740_000),
    expectedReduction: d(8_000_000),
  },
]

const SCENARIOS = [
  {
    id: 'DEMO-SCN-001',
    name: 'Wiper malware destroys payment processing capability',
    category: 'Cyber',
    description: 'A state-sponsored wiper variant targets the payment gateway, rendering transaction processing inoperable for 72 hours.',
    riskId: 'DEMO-RSK-001',
    assetId: 'DEMO-AST-001',
    severity: 'Critical',
    probability: 'Unlikely',
    currency: 'USD',
    estimatedImpact: d(38_000_000),
    businessImpact: 'Complete loss of payment processing across all channels',
    status: 'Active',
    owner: 'Priya Nair',
  },
  {
    id: 'DEMO-SCN-002',
    name: 'Mass PII exfiltration from EU data warehouse',
    category: 'Compliance',
    description: 'An attacker exfiltrates 14 million EU customer records, triggering mandatory GDPR notification and potential supervisory authority fines.',
    riskId: 'DEMO-RSK-002',
    assetId: 'DEMO-AST-002',
    severity: 'Critical',
    probability: 'Possible',
    currency: 'EUR',
    estimatedImpact: d(25_000_000),
    businessImpact: 'Regulatory penalties, customer churn, reputational damage',
    status: 'Active',
    owner: 'Lukas Muller',
  },
  {
    id: 'DEMO-SCN-003',
    name: 'HR portal breach exposes employee salary data',
    category: 'Cyber',
    description: 'An insider or external attacker accesses the HR portal and extracts sensitive employee PII including salary and banking details.',
    riskId: 'DEMO-RSK-003',
    assetId: 'DEMO-AST-003',
    severity: 'High',
    probability: 'Likely',
    currency: 'INR',
    estimatedImpact: d(8_500_000),
    businessImpact: 'Employee trust erosion, potential legal action',
    status: 'Under Review',
    owner: 'Aarav Sharma',
  },
  {
    id: 'DEMO-SCN-004',
    name: 'IoT botnet recruitment of manufacturing fleet',
    category: 'Operational',
    description: 'Compromised IoT devices are recruited into a botnet, causing production line shutdowns and potential safety incidents.',
    riskId: 'DEMO-RSK-004',
    assetId: 'DEMO-AST-004',
    severity: 'High',
    probability: 'Unlikely',
    currency: 'USD',
    estimatedImpact: d(14_500_000),
    businessImpact: 'Production downtime, supply chain disruption',
    status: 'Active',
    owner: 'Maria Costa',
  },
  {
    id: 'DEMO-SCN-005',
    name: 'Email account takeover leads to wire fraud',
    category: 'Cyber',
    description: 'A compromised executive email account is used to authorize fraudulent wire transfers to external accounts.',
    riskId: 'DEMO-RSK-005',
    assetId: 'DEMO-AST-005',
    severity: 'Medium',
    probability: 'Likely',
    currency: 'USD',
    estimatedImpact: d(5_200_000),
    businessImpact: 'Direct financial loss, reputational damage',
    status: 'Mitigated',
    owner: 'James OBrien',
  },
]

const POLICIES = [
  {
    id: 'DEMO-POL-001',
    policyNumber: 'CYB-2026-7841',
    provider: 'Munich Re Cyber Solutions',
    coverageType: 'Cyber Liability',
    currency: 'USD',
    coverageLimit: d(50_000_000),
    deductible: d(5_000_000),
    premium: d(2_250_000),
    expirationDate: futureDate(280),
    status: 'Active',
    notes: 'Annual renewal. Covers ransomware, data breach, and business interruption.',
  },
  {
    id: 'DEMO-POL-002',
    policyNumber: 'CYB-EU-3019',
    provider: 'Allianz Cyber Guard',
    coverageType: 'Data Privacy Liability',
    currency: 'EUR',
    coverageLimit: d(30_000_000),
    deductible: d(3_000_000),
    premium: d(1_440_000),
    expirationDate: futureDate(22),
    status: 'Expiring Soon',
    notes: 'Renewal in progress. GDPR-specific coverage for EU operations.',
  },
  {
    id: 'DEMO-POL-003',
    policyNumber: 'CYB-IN-5527',
    provider: 'ICICI Lombard Cyber Shield',
    coverageType: 'Cyber Liability',
    currency: 'INR',
    coverageLimit: d(500_000_000),
    deductible: d(50_000_000),
    premium: d(28_500_000),
    expirationDate: futureDate(180),
    status: 'Under Review',
    notes: 'Subject to annual risk assessment. Covers India operations.',
  },
]

const AUDITS = [
  {
    id: 'DEMO-AUD-001',
    framework: 'SOC 2 Type II',
    scope: 'Global Payment Gateway and supporting infrastructure',
    status: 'In Progress',
    owner: 'Priya Nair',
    dueDate: futureDate(45),
  },
  {
    id: 'DEMO-AUD-002',
    framework: 'ISO 27001',
    scope: 'EU Customer Data Warehouse and data processing operations',
    status: 'Planned',
    owner: 'Lukas Muller',
    dueDate: futureDate(90),
  },
  {
    id: 'DEMO-AUD-003',
    framework: 'NIST CSF',
    scope: 'Enterprise-wide cyber resilience assessment',
    status: 'Completed',
    owner: 'Maria Costa',
    dueDate: pastDate(15),
  },
]

const FINDINGS = [
  {
    id: 'DEMO-FND-001',
    auditId: 'DEMO-AUD-001',
    riskId: 'DEMO-RSK-001',
    remediationId: 'DEMO-REM-001',
    description: 'Payment gateway backup encryption keys are stored alongside backup data, violating separation of duties requirement.',
    severity: 'Critical',
    status: 'Open',
    owner: 'Priya Nair',
    dueDate: futureDate(30),
  },
  {
    id: 'DEMO-FND-002',
    auditId: 'DEMO-AUD-001',
    riskId: null,
    remediationId: null,
    description: 'SOC 2 access review logs are retained for only 90 days instead of the required 12 months.',
    severity: 'High',
    status: 'In Progress',
    owner: 'James OBrien',
    dueDate: futureDate(45),
  },
  {
    id: 'DEMO-FND-003',
    auditId: 'DEMO-AUD-002',
    riskId: 'DEMO-RSK-002',
    remediationId: 'DEMO-REM-002',
    description: 'Data warehouse lacks automated data retention policy enforcement for GDPR Article 17 right-to-erasure requests.',
    severity: 'Critical',
    status: 'Open',
    owner: 'Lukas Muller',
    dueDate: futureDate(60),
  },
  {
    id: 'DEMO-FND-004',
    auditId: 'DEMO-AUD-003',
    riskId: 'DEMO-RSK-004',
    remediationId: 'DEMO-REM-004',
    description: 'IoT device firmware update process lacks cryptographic signature verification.',
    severity: 'High',
    status: 'Closed',
    owner: 'Maria Costa',
    dueDate: pastDate(30),
  },
]

const POLICY_ASSET_LINKS = [
  { policyId: 'DEMO-POL-001', assetId: 'DEMO-AST-001' },
  { policyId: 'DEMO-POL-001', assetId: 'DEMO-AST-005' },
  { policyId: 'DEMO-POL-002', assetId: 'DEMO-AST-002' },
  { policyId: 'DEMO-POL-002', assetId: 'DEMO-AST-006' },
  { policyId: 'DEMO-POL-003', assetId: 'DEMO-AST-003' },
  { policyId: 'DEMO-POL-003', assetId: 'DEMO-AST-004' },
]

async function seedAssets(): Promise<void> {
  console.log('Seeding assets...')
  for (const a of ASSETS) {
    await prisma.asset.upsert({
      where: { id: a.id },
      create: { ...a, archived: false, lastUpdated: now },
      update: { ...a, archived: false, lastUpdated: now },
    })
  }
  console.log(`  ${ASSETS.length} assets upserted`)
}

async function seedRisks(): Promise<void> {
  console.log('Seeding risks...')
  for (const r of RISKS) {
    await prisma.risk.upsert({
      where: { id: r.id },
      create: { ...r, archived: false, lastUpdated: now },
      update: { ...r, archived: false, lastUpdated: now },
    })
  }
  console.log(`  ${RISKS.length} risks upserted`)
}

async function seedRemediations(): Promise<void> {
  console.log('Seeding remediations...')
  for (const r of REMEDIATIONS) {
    await prisma.remediation.upsert({
      where: { id: r.id },
      create: { ...r, archived: false },
      update: { ...r, archived: false },
    })
  }
  console.log(`  ${REMEDIATIONS.length} remediations upserted`)
}

async function seedScenarios(): Promise<void> {
  console.log('Seeding scenarios...')
  for (const s of SCENARIOS) {
    await prisma.scenario.upsert({
      where: { id: s.id },
      create: { ...s, archived: false },
      update: { ...s, archived: false },
    })
  }
  console.log(`  ${SCENARIOS.length} scenarios upserted`)
}

async function seedPolicies(): Promise<void> {
  console.log('Seeding insurance policies...')
  for (const p of POLICIES) {
    await prisma.insurancePolicy.upsert({
      where: { id: p.id },
      create: { ...p, archived: false },
      update: { ...p, archived: false },
    })
  }

  console.log('Seeding insurance-policy-asset links...')
  for (const link of POLICY_ASSET_LINKS) {
    await prisma.insurancePolicyAsset.upsert({
      where: { policyId_assetId: { policyId: link.policyId, assetId: link.assetId } },
      create: link,
      update: link,
    })
  }
  console.log(`  ${POLICIES.length} policies, ${POLICY_ASSET_LINKS.length} asset links upserted`)
}

async function seedAudits(): Promise<void> {
  console.log('Seeding audits...')
  for (const a of AUDITS) {
    await prisma.audit.upsert({
      where: { id: a.id },
      create: { ...a, archived: false },
      update: { ...a, archived: false },
    })
  }
  console.log(`  ${AUDITS.length} audits upserted`)
}

async function seedFindings(): Promise<void> {
  console.log('Seeding audit findings...')
  for (const f of FINDINGS) {
    const data = {
      auditId: f.auditId,
      riskId: f.riskId,
      remediationId: f.remediationId,
      description: f.description,
      severity: f.severity,
      status: f.status,
      owner: f.owner,
      dueDate: f.dueDate,
    }

    const existing = await prisma.auditFinding.findUnique({ where: { id: f.id } })

    if (existing) {
      await prisma.auditFinding.update({ where: { id: f.id }, data })
    } else {
      await prisma.auditFinding.create({ data: { ...data, id: f.id } })
    }
  }
  console.log(`  ${FINDINGS.length} audit findings upserted`)
}

async function main(): Promise<void> {
  console.log('CRFIS Demo Seed')
  console.log('===============')

  await seedAssets()
  await seedRisks()
  await seedRemediations()
  await seedScenarios()
  await seedPolicies()
  await seedAudits()
  await seedFindings()

  console.log('')
  console.log('Demo seed complete.')

  const counts = await Promise.all([
    prisma.asset.count({ where: { id: { startsWith: 'DEMO-AST' } } }),
    prisma.risk.count({ where: { id: { startsWith: 'DEMO-RSK' } } }),
    prisma.remediation.count({ where: { id: { startsWith: 'DEMO-REM' } } }),
    prisma.scenario.count({ where: { id: { startsWith: 'DEMO-SCN' } } }),
    prisma.insurancePolicy.count({ where: { id: { startsWith: 'DEMO-POL' } } }),
    prisma.audit.count({ where: { id: { startsWith: 'DEMO-AUD' } } }),
    prisma.auditFinding.count({ where: { id: { startsWith: 'DEMO-FND' } } }),
  ])

  console.log(`  Assets: ${counts[0]}`)
  console.log(`  Risks: ${counts[1]}`)
  console.log(`  Remediations: ${counts[2]}`)
  console.log(`  Scenarios: ${counts[3]}`)
  console.log(`  Insurance Policies: ${counts[4]}`)
  console.log(`  Audits: ${counts[5]}`)
  console.log(`  Audit Findings: ${counts[6]}`)
}

main()
  .catch((err) => {
    console.error('Seed failed:', err)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
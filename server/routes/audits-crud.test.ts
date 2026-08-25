import assert from 'node:assert/strict'
import { after, describe, it } from 'node:test'
import { buildApp } from '../app.js'
import { prisma } from '../repositories/prisma.js'

/*
 * Integration tests for audit and audit-finding writes. Temporary records
 * use the reserved TCRUD- prefix and are hard-purged inside every test
 * BEFORE the app closes, plus a self-healing purge at suite start and a
 * final purge + zero-row assertion in after(). Children are purged before
 * parents.
 */

const ADMIN = 'Bearer t-alice'
const AUDITOR = 'Bearer t-audit'
const READ_ONLY = 'Bearer t-riley'
const INVALID = 'Bearer not-a-configured-token'

process.env.CRFIS_AUTH_TOKENS = [
  't-alice:alice:ADMIN',
  't-audit:audit:AUDITOR',
  't-riley:riley:READ_ONLY',
].join(',')

const ASSET = {
  name: 'QA Test Asset',
  type: 'Infrastructure',
  businessUnit: 'QA',
  criticality: 'High',
  currency: 'INR',
  annualValue: '1250000.50',
  status: 'Monitored',
  owner: 'QA Owner',
}

const RISK = {
  risk: 'QA Test Risk',
  category: 'Identity',
  severity: 'High',
  likelihood: 'Medium',
  currency: 'INR',
  exposure: '900000.00',
  status: 'Open',
  owner: 'QA Owner',
}

const REMEDIATION = {
  action: 'Rotate credentials fleet-wide',
  category: 'Access Control',
  priority: 'High',
  owner: 'QA Owner',
  dueDate: '2027-06-30',
  status: 'Open',
  currency: 'INR',
  estimatedCost: '120000.00',
  expectedReduction: '300000.00',
}

const AUDIT_BASE = {
  framework: 'ISO 27001',
  scope: 'QA scope',
  status: 'In Progress',
  owner: 'QA Auditor',
  dueDate: '2027-09-30',
}

async function purge(): Promise<void> {
  await prisma.auditFinding.deleteMany({ where: { id: { startsWith: 'TCRUD-' } } })
  await prisma.audit.deleteMany({ where: { id: { startsWith: 'TCRUD-' } } })
  await prisma.remediation.deleteMany({ where: { id: { startsWith: 'TCRUD-' } } })
  await prisma.risk.deleteMany({ where: { id: { startsWith: 'TCRUD-' } } })
  await prisma.asset.deleteMany({ where: { id: { startsWith: 'TCRUD-' } } })
}

describe('audit + finding CRUD', () => {
  it('creates an audit with a computed zero findings count', async () => {
    await purge()

    const app = await buildApp()
    try {
      const response = await app.inject({
        method: 'POST', url: '/api/audits',
        headers: { authorization: ADMIN },
        payload: { id: 'TCRUD-AU', ...AUDIT_BASE },
      })
      const body = response.json()

      assert.equal(response.statusCode, 201)
      assert.equal(body.data.id, 'TCRUD-AU')
      // findings is ALWAYS the relation count - never a stored scalar.
      assert.equal(body.data.findings, 0)
      assert.equal(Number.isNaN(Date.parse(body.data.dueDate)), false)

      await purge()
    } finally {
      await app.close()
    }
  })

  it('creates findings with required and optional relationships; count recomputes', async () => {
    await purge()

    const app = await buildApp()
    try {
      // Seed full chain: asset -> risk -> remediation -> audit.
      await app.inject({ method: 'POST', url: '/api/assets', headers: { authorization: ADMIN }, payload: { id: 'TCRUD-PA', ...ASSET } })
      await app.inject({ method: 'POST', url: '/api/risks', headers: { authorization: ADMIN }, payload: { id: 'TCRUD-PR', assetId: 'TCRUD-PA', ...RISK } })
      await app.inject({ method: 'POST', url: '/api/remediations', headers: { authorization: ADMIN }, payload: { id: 'TCRUD-MX', riskId: 'TCRUD-PR', assetId: 'TCRUD-PA', ...REMEDIATION } })
      await app.inject({ method: 'POST', url: '/api/audits', headers: { authorization: ADMIN }, payload: { id: 'TCRUD-AU', ...AUDIT_BASE } })

      // Finding with BOTH optional relations.
      const full = await app.inject({
        method: 'POST', url: '/api/audit-findings', headers: { authorization: ADMIN },
        payload: {
          id: 'TCRUD-F1',
          auditId: 'TCRUD-AU',
          riskId: 'TCRUD-PR',
          remediationId: 'TCRUD-MX',
          description: 'Shared admin credential found',
          severity: 'Critical',
          status: 'Open',
          owner: 'QA Auditor',
          dueDate: '2027-04-15',
        },
      })
      assert.equal(full.statusCode, 201)
      assert.deepEqual(full.json().data.risk, { id: 'TCRUD-PR', risk: 'QA Test Risk' })
      assert.deepEqual(full.json().data.remediation, { id: 'TCRUD-MX' })

      // Finding with NO optional relations.
      const bare = await app.inject({
        method: 'POST', url: '/api/audit-findings', headers: { authorization: ADMIN },
        payload: {
          id: 'TCRUD-F2',
          auditId: 'TCRUD-AU',
          description: 'Documentation gap',
          severity: 'Low',
          status: 'Open',
          owner: 'QA Auditor',
          dueDate: '2027-05-01',
        },
      })
      assert.equal(bare.statusCode, 201)
      assert.equal(bare.json().data.risk, null)
      assert.equal(bare.json().data.remediation, null)

      // The audit's computed count reflects both findings.
      const audit = await app.inject({ method: 'GET', url: '/api/audits/TCRUD-AU' })
      assert.equal(audit.json().data.findings, 2)

      await purge()
    } finally {
      await app.close()
    }
  })

  it('validates relationship targets with canonical 404 envelopes', async () => {
    await purge()

    const app = await buildApp()
    try {
      await app.inject({ method: 'POST', url: '/api/assets', headers: { authorization: ADMIN }, payload: { id: 'TCRUD-PA', ...ASSET } })
      await app.inject({ method: 'POST', url: '/api/risks', headers: { authorization: ADMIN }, payload: { id: 'TCRUD-PR', assetId: 'TCRUD-PA', ...RISK } })
      await app.inject({ method: 'POST', url: '/api/audits', headers: { authorization: ADMIN }, payload: { id: 'TCRUD-AU', ...AUDIT_BASE } })

      const missingAudit = await app.inject({
        method: 'POST', url: '/api/audit-findings', headers: { authorization: ADMIN },
        payload: {
          id: 'TCRUD-F3', auditId: 'TCRUD-GHOST', description: 'x', severity: 'Low',
          status: 'Open', owner: 'o', dueDate: '2027-01-01',
        },
      })
      assert.equal(missingAudit.statusCode, 404)
      assert.equal(missingAudit.json().error.code, 'AUDIT_NOT_FOUND')

      const missingRisk = await app.inject({
        method: 'POST', url: '/api/audit-findings', headers: { authorization: ADMIN },
        payload: {
          id: 'TCRUD-F3', auditId: 'TCRUD-AU', riskId: 'TCRUD-GHOST', description: 'x',
          severity: 'Low', status: 'Open', owner: 'o', dueDate: '2027-01-01',
        },
      })
      assert.equal(missingRisk.statusCode, 404)
      assert.equal(missingRisk.json().error.code, 'RISK_NOT_FOUND')

      const missingRemediation = await app.inject({
        method: 'POST', url: '/api/audit-findings', headers: { authorization: ADMIN },
        payload: {
          id: 'TCRUD-F3', auditId: 'TCRUD-AU', remediationId: 'TCRUD-GHOST', description: 'x',
          severity: 'Low', status: 'Open', owner: 'o', dueDate: '2027-01-01',
        },
      })
      assert.equal(missingRemediation.statusCode, 404)
      assert.equal(missingRemediation.json().error.code, 'REMEDIATION_NOT_FOUND')

      await purge()
    } finally {
      await app.close()
    }
  })

  it('rejects duplicate ids with 409 for audits and findings', async () => {
    await purge()

    const app = await buildApp()
    try {
      await app.inject({ method: 'POST', url: '/api/audits', headers: { authorization: ADMIN }, payload: { id: 'TCRUD-AU', ...AUDIT_BASE } })
      await app.inject({
        method: 'POST', url: '/api/audit-findings', headers: { authorization: ADMIN },
        payload: {
          id: 'TCRUD-F4', auditId: 'TCRUD-AU', description: 'x', severity: 'Low',
          status: 'Open', owner: 'o', dueDate: '2027-01-01',
        },
      })

      const dupAudit = await app.inject({
        method: 'POST', url: '/api/audits', headers: { authorization: ADMIN },
        payload: { id: 'TCRUD-AU', ...AUDIT_BASE },
      })
      assert.equal(dupAudit.statusCode, 409)

      const dupFinding = await app.inject({
        method: 'POST', url: '/api/audit-findings', headers: { authorization: ADMIN },
        payload: {
          id: 'TCRUD-F4', auditId: 'TCRUD-AU', description: 'y', severity: 'High',
          status: 'Open', owner: 'o', dueDate: '2027-01-01',
        },
      })
      assert.equal(dupFinding.statusCode, 409)
      assert.equal(dupFinding.json().error.code, 'ID_ALREADY_EXISTS')

      await purge()
    } finally {
      await app.close()
    }
  })

  it('enforces the audits:write permission boundary', async () => {
    await purge()

    const app = await buildApp()
    try {
      const unauth = await app.inject({
        method: 'POST', url: '/api/audits',
        payload: { id: 'TCRUD-AU2', ...AUDIT_BASE },
      })
      assert.equal(unauth.statusCode, 401)
      assert.equal(unauth.json().error.code, 'AUTH_REQUIRED')

      const invalidToken = await app.inject({
        method: 'POST', url: '/api/audits',
        headers: { authorization: INVALID }, payload: { id: 'TCRUD-AU2', ...AUDIT_BASE },
      })
      assert.equal(invalidToken.statusCode, 401)
      assert.equal(invalidToken.json().error.code, 'AUTH_INVALID_TOKEN')

      // READ_ONLY cannot write audits OR findings.
      const forbiddenAudit = await app.inject({
        method: 'POST', url: '/api/audits',
        headers: { authorization: READ_ONLY }, payload: { id: 'TCRUD-AU2', ...AUDIT_BASE },
      })
      assert.equal(forbiddenAudit.statusCode, 403)

      await seedMinimal(app)
      const forbiddenFinding = await app.inject({
        method: 'POST', url: '/api/audit-findings',
        headers: { authorization: READ_ONLY },
        payload: {
          id: 'TCRUD-F5', auditId: 'TCRUD-AU2', description: 'x', severity: 'Low',
          status: 'Open', owner: 'o', dueDate: '2027-01-01',
        },
      })
      assert.equal(forbiddenFinding.statusCode, 403)
      assert.equal(forbiddenFinding.json().error.code, 'FORBIDDEN')

      await purge()
    } finally {
      await app.close()
    }
  })

  it('updates audits and findings', async () => {
    await purge()

    const app = await buildApp()
    try {
      await seedMinimal(app)

      const patchedAudit = await app.inject({
        method: 'PATCH', url: '/api/audits/TCRUD-AU2',
        headers: { authorization: ADMIN }, payload: { status: 'Completed' },
      })
      assert.equal(patchedAudit.statusCode, 200)
      assert.equal(patchedAudit.json().data.status, 'Completed')

      const patchedFinding = await app.inject({
        method: 'PATCH', url: '/api/audit-findings/TCRUD-F6',
        headers: { authorization: AUDITOR },
        payload: { severity: 'High', status: 'Closed' },
      })
      assert.equal(patchedFinding.statusCode, 200)
      assert.equal(patchedFinding.json().data.severity, 'High')
      assert.equal(patchedFinding.json().data.status, 'Closed')

      await purge()
    } finally {
      await app.close()
    }
  })

  it('removes findings physically - the only semantics the schema supports', async () => {
    await purge()

    const app = await buildApp()
    try {
      await seedMinimal(app)

      const deleted = await app.inject({
        method: 'DELETE', url: '/api/audit-findings/TCRUD-F6',
        headers: { authorization: ADMIN },
      })

      assert.equal(deleted.statusCode, 200)
      assert.deepEqual(deleted.json().data, { id: 'TCRUD-F6', deleted: true })

      // Count drops to zero through the computed aggregate.
      const audit = await app.inject({ method: 'GET', url: '/api/audits/TCRUD-AU2' })
      assert.equal(audit.json().data.findings, 0)

      const repeat = await app.inject({
        method: 'DELETE', url: '/api/audit-findings/TCRUD-F6',
        headers: { authorization: ADMIN },
      })
      assert.equal(repeat.statusCode, 404)

      await purge()
    } finally {
      await app.close()
    }
  })

  it('archives an audit and its findings leave every read path', async () => {
    await purge()

    const app = await buildApp()
    try {
      await seedMinimal(app)

      const deleted = await app.inject({
        method: 'DELETE', url: '/api/audits/TCRUD-AU2',
        headers: { authorization: ADMIN },
      })

      assert.equal(deleted.statusCode, 200)
      assert.deepEqual(deleted.json().data, { id: 'TCRUD-AU2', archived: true })

      const gone = await app.inject({ method: 'GET', url: '/api/audits/TCRUD-AU2' })
      assert.equal(gone.statusCode, 404)

      // The finding row survives but is hidden behind its archived parent.
      const stillThere = await prisma.auditFinding.findUnique({
        where: { id: 'TCRUD-F6' }, select: { id: true },
      })
      assert.ok(stillThere)

      const visible = await app.inject({ method: 'GET', url: '/api/audit-findings?search=Credential' })
      assert.equal(visible.json().meta.total, 0)

      await purge()
    } finally {
      await app.close()
    }
  })

  /** Seeds one audit + one finding (TCRUD-AU2 / TCRUD-F6). */
  async function seedMinimal(app: Awaited<ReturnType<typeof buildApp>>): Promise<void> {
    const created = await app.inject({
      method: 'POST', url: '/api/audits', headers: { authorization: ADMIN },
      payload: { id: 'TCRUD-AU2', ...AUDIT_BASE },
    })
    assert.equal(created.statusCode, 201)

    const finding = await app.inject({
      method: 'POST', url: '/api/audit-findings', headers: { authorization: ADMIN },
      payload: {
        id: 'TCRUD-F6', auditId: 'TCRUD-AU2', description: 'Shared credential detected',
        severity: 'Critical', status: 'Open', owner: 'QA Auditor', dueDate: '2027-04-15',
      },
    })
    assert.equal(finding.statusCode, 201)
  }

  after(async () => {
    await purge()
    const [findings, audits] = await Promise.all([
      prisma.auditFinding.count(),
      prisma.audit.count(),
    ])
    assert.equal(findings, 0, 'AuditFinding table must be empty after the suite')
    assert.equal(audits, 0, 'Audit table must be empty after the suite')
  })
})

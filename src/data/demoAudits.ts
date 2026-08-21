import type { Audit } from '../types/audit'

export const demoAudits: Audit[] = [
  {
    id: 'AUD-001',
    framework: 'ISO 27001',
    scope: 'Enterprise Security',
    status: 'Completed',
    findings: 2,
    owner: 'Security Governance',
    dueDate: '2026-06-30',
  },
  {
    id: 'AUD-002',
    framework: 'NIST CSF',
    scope: 'Enterprise Risk',
    status: 'Under Review',
    findings: 3,
    owner: 'Risk Management',
    dueDate: '2026-08-28',
  },
  {
    id: 'AUD-003',
    framework: 'COBIT',
    scope: 'Data Governance',
    status: 'In Progress',
    findings: 1,
    owner: 'Data Governance',
    dueDate: '2026-09-15',
  },
  {
    id: 'AUD-004',
    framework: 'SOC 2',
    scope: 'Cloud Services',
    status: 'Planned',
    findings: 0,
    owner: 'Cloud Security',
    dueDate: '2026-10-20',
  },
  {
    id: 'AUD-005',
    framework: 'CIS Controls',
    scope: 'Identity Management',
    status: 'Overdue',
    findings: 1,
    owner: 'IAM Team',
    dueDate: '2026-07-31',
  },
]
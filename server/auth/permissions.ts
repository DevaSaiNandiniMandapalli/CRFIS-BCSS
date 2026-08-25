import type { CrfisRequestUser } from '../plugins/auth-seam.js'

/*
 * CRFIS access control (Phase 4).
 *
 * Identity model: operator-configured bearer tokens.
 *
 *   CRFIS_AUTH_TOKENS="token1:alice:ADMIN,token2:bob:RISK_MANAGER,..."
 *
 * Tokens are resolved dynamically on every request so operators can rotate
 * them without a restart and tests can configure them per-process. This is
 * deliberately NOT enterprise identity federation - it is the smallest
 * production-sensible boundary that makes unauthenticated writes fail while
 * keeping authorization centralized. Swapping in OIDC later only replaces
 * the token-resolution step; permission checks stay identical.
 */

export const CRFIS_ROLES = [
  'ADMIN',
  'RISK_MANAGER',
  'SECURITY_ANALYST',
  'EXECUTIVE',
  'AUDITOR',
  'READ_ONLY',
] as const

export type CrfisRole = (typeof CRFIS_ROLES)[number]

/** Write capabilities. Read endpoints remain development-public (Phase 3). */
export const ROLE_PERMISSIONS: Record<CrfisRole, string[]> = {
  ADMIN: ['*'],
  RISK_MANAGER: [
    'assets:write',
    'risks:write',
    'remediations:write',
    'scenarios:write',
    'insurance:write',
  ],
  SECURITY_ANALYST: ['risks:write', 'remediations:write', 'scenarios:write'],
  AUDITOR: ['audits:write'],
  EXECUTIVE: [],
  READ_ONLY: [],
}

export function permissionsForRole(role: string): string[] {
  return ROLE_PERMISSIONS[role as CrfisRole] ?? []
}

/**
 * Parses CRFIS_AUTH_TOKENS. Malformed entries are skipped silently so one
 * bad entry cannot lock operators out; the token itself is never logged.
 */
export function resolveToken(token: string | undefined): CrfisRequestUser | null {
  if (!token) {
    return null
  }

  const raw = process.env.CRFIS_AUTH_TOKENS

  if (!raw) {
    return null
  }

  for (const entry of raw.split(',')) {
    const parts = entry.split(':')

    if (parts.length !== 3) {
      continue
    }

    const [configuredToken, userId, role] = parts.map((part) => part.trim())

    if (
      configuredToken &&
      userId &&
      role &&
      configuredToken === token &&
      CRFIS_ROLES.includes(role as CrfisRole)
    ) {
      return {
        id: userId,
        role,
        permissions: permissionsForRole(role),
        authTokenId: `${userId}:${role}`,
      }
    }
  }

  return null
}

import type { Asset } from '../types/asset'
import type { Audit } from '../types/audit'
import type { InsurancePolicy } from '../types/insurance'
import type { Money, CurrencyCode } from '../types/money'
import type { Remediation } from '../types/remediation'
import type { Risk } from '../types/risk'
import type { Scenario } from '../types/scenario'

/*
 * Currency-aware financial metrics.
 *
 * Rules:
 * - Every aggregate returns structured Money (or null for an empty
 *   collection). Callers format through utils/format.ts.
 * - Aggregating across currencies is mathematically invalid. Any function
 *   that sums values first asserts that all inputs share ONE currency and
 *   throws CurrencyMismatchError otherwise. No FX conversion happens here;
 *   cross-currency totals require an explicit conversion service that does
 *   not exist yet.
 * - Arithmetic is performed on parsed decimals for presentation-level
 *   aggregation only. Exactness at rest remains the database's DECIMAL(18,2)
 *   job; server-side Decimal aggregation replaces this for API responses.
 */

export class CurrencyMismatchError extends Error {
  constructor(operation: string, currencies: readonly string[]) {
    super(
      `Cannot ${operation} across mixed currencies (${currencies.join(', ')}). ` +
        'Convert to a common currency explicitly before aggregating.',
    )
    this.name = 'CurrencyMismatchError'
  }
}

interface CurrencyBearer {
  currency: CurrencyCode
}

function requireUniformCurrency(
  operation: string,
  items: readonly CurrencyBearer[],
): CurrencyCode | null {
  if (items.length === 0) {
    return null
  }

  const currencies = new Set(items.map((item) => item.currency))

  if (currencies.size > 1) {
    throw new CurrencyMismatchError(operation, [...currencies])
  }

  return items[0].currency
}

function amountOf(money: Money): number {
  const parsed = Number.parseFloat(money.amount)

  if (!Number.isFinite(parsed)) {
    throw new TypeError(`Invalid money amount: ${money.amount}`)
  }

  return parsed
}

function makeMoney(amount: number, currency: CurrencyCode): Money {
  return { amount: String(amount), currency }
}

function sumMoney<T extends CurrencyBearer>(
  operation: string,
  items: readonly T[],
  pick: (item: T) => number,
): Money | null {
  const currency = requireUniformCurrency(operation, items)

  if (currency === null) {
    return null
  }

  return makeMoney(
    items.reduce((total, item) => total + pick(item), 0),
    currency,
  )
}

/** Scales a Money value by a factor (e.g. the demo ALE factor). */
export function scaleMoney(money: Money, factor: number): Money {
  return makeMoney(amountOf(money) * factor, money.currency)
}

/** Subtracts two Money values; both must share one currency. */
export function subtractMoney(a: Money, b: Money): Money {
  requireUniformCurrency('subtract', [a, b])

  return makeMoney(amountOf(a) - amountOf(b), a.currency)
}

/** Floors a Money value at zero. */
export function maxMoneyZero(money: Money): Money {
  return makeMoney(Math.max(amountOf(money), 0), money.currency)
}

export function calculateTotalExposure(risks: Risk[]): Money | null {
  return sumMoney('aggregate risk exposure', risks, (risk) => risk.exposure)
}

export function calculateCriticalRiskCount(risks: Risk[]): number {
  return risks.filter((risk) => risk.severity === 'Critical').length
}

export function calculateRemediationOpportunity(
  remediations: Remediation[],
): Money | null {
  return sumMoney(
    'aggregate expected reduction',
    remediations,
    (remediation) => remediation.expectedReduction,
  )
}

export function calculateRemediationCost(
  remediations: Remediation[],
): Money | null {
  return sumMoney(
    'aggregate estimated cost',
    remediations,
    (remediation) => remediation.estimatedCost,
  )
}

export function calculateNetRemediationBenefit(
  remediations: Remediation[],
): Money | null {
  const reduction = calculateRemediationOpportunity(remediations)
  const cost = calculateRemediationCost(remediations)

  if (reduction === null || cost === null) {
    return null
  }

  return subtractMoney(reduction, cost)
}

export function calculateReductionToCostRatio(
  remediations: Remediation[],
): number {
  const reduction = calculateRemediationOpportunity(remediations)
  const cost = calculateRemediationCost(remediations)

  if (
    reduction === null ||
    cost === null ||
    amountOf(cost) === 0
  ) {
    return 0
  }

  return amountOf(reduction) / amountOf(cost)
}

export function calculateRemainingExposure(
  risks: Risk[],
  remediations: Remediation[],
): Money | null {
  const exposure = calculateTotalExposure(risks)
  const reduction = calculateRemediationOpportunity(remediations)

  if (exposure === null || reduction === null) {
    return null
  }

  // Cross-domain subtraction requires one shared currency.
  return maxMoneyZero(subtractMoney(exposure, reduction))
}

export function calculateTotalAssetValue(assets: Asset[]): Money | null {
  return sumMoney('aggregate asset value', assets, (asset) => asset.annualValue)
}

export function calculateTotalInsuranceCoverage(
  policies: InsurancePolicy[],
): Money | null {
  return sumMoney(
    'aggregate insurance coverage',
    policies,
    (policy) => policy.coverageLimit,
  )
}

export function calculateTotalInsurancePremium(
  policies: InsurancePolicy[],
): Money | null {
  return sumMoney(
    'aggregate insurance premium',
    policies,
    (policy) => policy.premium,
  )
}

export function calculateTotalInsuranceDeductible(
  policies: InsurancePolicy[],
): Money | null {
  return sumMoney(
    'aggregate insurance deductible',
    policies,
    (policy) => policy.deductible,
  )
}

export function calculateInsuranceCoverageGap(
  risks: Risk[],
  policies: InsurancePolicy[],
): Money | null {
  const exposure = calculateTotalExposure(risks)
  const coverage = calculateTotalInsuranceCoverage(policies)

  if (exposure === null || coverage === null) {
    return null
  }

  // Risk exposure vs policy coverage: invalid to compare across currencies.
  return maxMoneyZero(subtractMoney(exposure, coverage))
}

/*
 * CRFIS demonstration assumption: 25% of total exposure.
 *
 * This is NOT a production financial, actuarial, or risk calculation.
 */
export function calculateAnnualizedLossExpectancy(
  risks: Risk[],
): Money | null {
  const exposure = calculateTotalExposure(risks)

  return exposure === null ? null : scaleMoney(exposure, 0.25)
}

export function calculateTotalScenarioImpact(
  scenarios: Scenario[],
): Money | null {
  return sumMoney(
    'aggregate scenario impact',
    scenarios,
    (scenario) => scenario.estimatedImpact,
  )
}

export function calculateTotalAuditFindings(audits: Audit[]): number {
  return audits.reduce((total, audit) => total + audit.findings, 0)
}

import { useState } from 'react'
import { demoReports } from '../data/demoReports'
import { demoRisks } from '../data/demoRisks'
import { demoRemediations } from '../data/demoRemediations'
import { demoInsurance } from '../data/demoInsurance'
import {
  calculateTotalExposure,
  calculateCriticalRiskCount,
  calculateRemediationOpportunity,
  calculateTotalInsuranceCoverage,
} from '../utils/financialMetrics'
import type { ReportStatus, ReportType } from '../types/report'


const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

function Reports() {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<ReportStatus | 'All'>('All')
  const [type, setType] = useState<ReportType | 'All'>('All')

  /*
   * These values now come from the CRFIS demo datasets
   * instead of being hard-coded.
   */

  const totalExposure = calculateTotalExposure(demoRisks)

const criticalRiskCount = calculateCriticalRiskCount(demoRisks)

const remediationOpportunity =
  calculateRemediationOpportunity(demoRemediations)

const totalInsuranceCoverage =
  calculateTotalInsuranceCoverage(demoInsurance)

const query = search.trim().toLowerCase()

const filteredReports = demoReports.filter((report) => {
  const matchesSearch =
    !query ||
    report.name.toLowerCase().includes(query) ||
    report.type.toLowerCase().includes(query) ||
    report.owner.toLowerCase().includes(query)

  const matchesStatus =
    status === 'All' || report.status === status

  const matchesType =
    type === 'All' || report.type === type

  return matchesSearch && matchesStatus && matchesType
})

  const readyCount = demoReports.filter(
    (report) => report.status === 'Ready',
  ).length

  const draftCount = demoReports.filter(
    (report) => report.status === 'Draft',
  ).length

  const reviewCount = demoReports.filter(
    (report) => report.status === 'Under Review',
  ).length

  const clearFilters = () => {
    setSearch('')
    setStatus('All')
    setType('All')
  }

  const hasFilters =
    search !== '' ||
    status !== 'All' ||
    type !== 'All'

  return (
    <section className="reports-page">
      <div className="module-heading">
        <div>
          <div className="module-title-row">
            <h2>Reports & Analytics</h2>
            <span className="demo-badge">DEMO DATA</span>
          </div>

          <p>
            Generate executive-ready views of cyber risk,
            financial exposure, assets, remediation, and insurance.
          </p>
        </div>

        <button className="primary-button" type="button">
          + Create Report
        </button>
      </div>

      <div className="risk-kpis">
        <article className="risk-kpi">
          <span>TOTAL REPORTS</span>
          <strong>{demoReports.length}</strong>
          <small>DEMO / PLACEHOLDER</small>
        </article>

        <article className="risk-kpi">
          <span>READY</span>
          <strong>{readyCount}</strong>
          <small>Available for review</small>
        </article>

        <article className="risk-kpi high-kpi">
          <span>UNDER REVIEW</span>
          <strong>{reviewCount}</strong>
          <small>Awaiting approval</small>
        </article>

        <article className="risk-kpi critical-kpi">
          <span>DRAFTS</span>
          <strong>{draftCount}</strong>
          <small>Work in progress</small>
        </article>
      </div>

      <div className="demo-notice">
        <span className="demo-notice-icon">i</span>

        <div>
          <strong>Demonstration environment</strong>

          <p>
            Reports and analytics on this screen are fictional
            placeholders for CRFIS interface development. Report
            generation and financial calculations are not connected
            to production data.
          </p>
        </div>
      </div>

      <section className="report-overview">
        <div className="report-overview-heading">
          <div>
            <span className="eyebrow">EXECUTIVE REPORTING</span>
            <h2>Decision Intelligence</h2>
          </div>

          <span className="report-period">
            Q3 2026 • DEMO
          </span>
        </div>

        <div className="report-summary-grid">
          <article>
            <span>Financial Exposure</span>

            <strong>
              {currencyFormatter.format(totalExposure)}
            </strong>

            <small>DEMO / PLACEHOLDER</small>
          </article>

          <article>
            <span>Critical Risks</span>

            <strong>
              {String(criticalRiskCount).padStart(2, '0')}
            </strong>

            <small>DEMO / PLACEHOLDER</small>
          </article>

          <article>
            <span>Remediation Opportunity</span>

            <strong>
              {currencyFormatter.format(
                remediationOpportunity,
              )}
            </strong>

            <small>DEMO / PLACEHOLDER</small>
          </article>

          <article>
            <span>Insurance Coverage</span>

            <strong>
              {currencyFormatter.format(
                totalInsuranceCoverage,
              )}
            </strong>

            <small>DEMO / PLACEHOLDER</small>
          </article>
        </div>
      </section>

      <div className="risk-toolbar">
        <label className="risk-search">
          <span>⌕</span>

          <input
            type="search"
            placeholder="Search reports..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            aria-label="Search reports"
          />
        </label>

        <select
          value={status}
          onChange={(event) =>
            setStatus(
              event.target.value as ReportStatus | 'All',
            )
          }
          aria-label="Filter reports by status"
        >
          <option value="All">All Statuses</option>
          <option value="Ready">Ready</option>
          <option value="Draft">Draft</option>
          <option value="Under Review">Under Review</option>
        </select>

        <select
          value={type}
          onChange={(event) =>
            setType(
              event.target.value as ReportType | 'All',
            )
          }
          aria-label="Filter reports by type"
        >
          <option value="All">All Report Types</option>
          <option value="Executive Risk Report">
            Executive Risk Report
          </option>
          <option value="Financial Exposure Report">
            Financial Exposure Report
          </option>
          <option value="Asset Exposure Report">
            Asset Exposure Report
          </option>
          <option value="Remediation Report">
            Remediation Report
          </option>
          <option value="Insurance Coverage Report">
            Insurance Coverage Report
          </option>
        </select>

        {hasFilters && (
          <button
            className="clear-filters"
            type="button"
            onClick={clearFilters}
          >
            Clear
          </button>
        )}
      </div>

      <div className="risk-register-table">
        <div className="table-header">
          <div>
            <strong>Report Library</strong>

            <span>
              Showing {filteredReports.length} of{' '}
              {demoReports.length} demo reports
            </span>
          </div>

          <span className="table-demo-label">
            PLACEHOLDER DATA
          </span>
        </div>

        <div className="risk-table-scroll">
          <table>
            <thead>
              <tr>
                <th>Report</th>
                <th>Type</th>
                <th>Period</th>
                <th>Status</th>
                <th>Generated</th>
                <th>Owner</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {filteredReports.map((report) => (
                <tr key={report.id}>
                  <td>
                    <div className="risk-name">
                      <strong>{report.name}</strong>
                      <span>{report.id}</span>
                    </div>
                  </td>

                  <td>{report.type}</td>

                  <td>{report.period}</td>

                  <td>
                    <span
                      className={`risk-status ${report.status
                        .toLowerCase()
                        .replaceAll(' ', '-')}`}
                    >
                      {report.status}
                    </span>
                  </td>

                  <td>{report.generatedAt}</td>

                  <td>{report.owner}</td>

                  <td>
                    <button
                      className="table-action"
                      type="button"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}

              {filteredReports.length === 0 && (
                <tr>
                  <td colSpan={7}>
                    <div className="risk-empty-state">
                      <strong>
                        No reports match the current filters.
                      </strong>

                      <span>
                        Try changing the search or filter
                        selections.
                      </span>

                      <button
                        className="secondary-button"
                        type="button"
                        onClick={clearFilters}
                      >
                        Clear filters
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <section className="intelligence-panel">
        <div className="intelligence-icon">↗</div>

        <div>
          <span className="eyebrow">
            REPORTING INTELLIGENCE
          </span>

          <h2>
            Turn risk data into executive decisions.
          </h2>

          <p>
            CRFIS combines risk, asset, remediation, scenario,
            and insurance information into decision-ready
            reports for leadership.
          </p>
        </div>

        <button className="secondary-button" type="button">
          Report Center
        </button>
      </section>
    </section>
  )
}

export default Reports
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
import { formatDate, formatMoneyOrDash, slugify } from '../utils/format'
import { EmptyState } from '../components/States'
import type { ReportStatus, ReportType } from '../types/report'

function Reports() {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<ReportStatus | 'All'>('All')
  const [type, setType] = useState<ReportType | 'All'>('All')

  /*
   * These values come from the CRFIS demo datasets
   * through the shared currency-aware metrics module.
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
    <section className="page">
      <header className="page-intro">
        <div className="page-intro-text">
          <div className="page-title-row">
            <h2>Reports &amp; Analytics</h2>
            <span className="chip">DEMO DATA</span>
          </div>

          <p>
            Generate executive-ready views of cyber risk,
            financial exposure, assets, remediation, and insurance.
          </p>
        </div>

        <button className="primary-button" type="button">
          + Create Report
        </button>
      </header>

      <div className="kpi-grid">
        <article className="kpi-card">
          <span className="kpi-label">Total Reports</span>
          <strong className="kpi-value">{demoReports.length}</strong>
          <small className="kpi-note">Demo / placeholder</small>
        </article>

        <article className="kpi-card">
          <span className="kpi-label">Ready</span>
          <strong className="kpi-value">{readyCount}</strong>
          <small className="kpi-note">Available for review</small>
        </article>

        <article className="kpi-card">
          <span className="kpi-label">Under Review</span>
          <strong className="kpi-value">{reviewCount}</strong>
          <small className="kpi-note">Awaiting approval</small>
        </article>

        <article className="kpi-card accent">
          <span className="kpi-label">Drafts</span>
          <strong className="kpi-value">{draftCount}</strong>
          <small className="kpi-note">Work in progress</small>
        </article>
      </div>

      <div className="notice">
        <span className="notice-icon" aria-hidden="true">i</span>

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

          <span className="chip chip--muted">
            Q3 2026 • DEMO
          </span>
        </div>

        <div className="report-summary-grid">
          <article className="kpi-card">
            <span className="kpi-label">Financial Exposure</span>

            <strong className="kpi-value">
              {formatMoneyOrDash(totalExposure)}
            </strong>

            <small className="kpi-note">Demo / placeholder</small>
          </article>

          <article className="kpi-card accent">
            <span className="kpi-label">Critical Risks</span>

            <strong className="kpi-value">
              {criticalRiskCount}
            </strong>

            <small className="kpi-note">Demo / placeholder</small>
          </article>

          <article className="kpi-card">
            <span className="kpi-label">Remediation Opportunity</span>

            <strong className="kpi-value">
              {formatMoneyOrDash(remediationOpportunity)}
            </strong>

            <small className="kpi-note">Demo / placeholder</small>
          </article>

          <article className="kpi-card">
            <span className="kpi-label">Insurance Coverage</span>

            <strong className="kpi-value">
              {formatMoneyOrDash(totalInsuranceCoverage)}
            </strong>

            <small className="kpi-note">Demo / placeholder</small>
          </article>
        </div>
      </section>

      <div className="toolbar" role="group" aria-label="Report filters">
        <label className="search-field">
          <span aria-hidden="true">⌕</span>

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
            className="secondary-button"
            type="button"
            onClick={clearFilters}
          >
            Clear
          </button>
        )}
      </div>

      <div className="data-panel">
        <div className="data-table-header">
          <div>
            <strong>Report Library</strong>

            <span>
              Showing {filteredReports.length} of{' '}
              {demoReports.length} demo reports
            </span>
          </div>

          <span className="chip chip--muted">
            PLACEHOLDER DATA
          </span>
        </div>

        <div className="data-table-scroll">
          <table>
            <thead>
              <tr>
                <th scope="col">Report</th>
                <th scope="col">Type</th>
                <th scope="col">Period</th>
                <th scope="col">Status</th>
                <th scope="col">Generated</th>
                <th scope="col">Owner</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>

            <tbody>
              {filteredReports.map((report) => (
                <tr key={report.id}>
                  <td>
                    <div className="cell-stack">
                      <strong>{report.name}</strong>
                      <span>{report.id}</span>
                    </div>
                  </td>

                  <td>{report.type}</td>

                  <td>{report.period}</td>

                  <td>
                    <span
                      className={`badge badge--${slugify(report.status)}`}
                    >
                      {report.status}
                    </span>
                  </td>

                  <td>{formatDate(report.generatedAt)}</td>

                  <td>{report.owner}</td>

                  <td>
                    <button
                      className="secondary-button"
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
                    <EmptyState
                      title="No reports match the current filters."
                      message="Try changing the search or filter selections."
                      action={
                        <button
                          className="secondary-button"
                          type="button"
                          onClick={clearFilters}
                        >
                          Clear filters
                        </button>
                      }
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <section className="intelligence-panel">
        <div className="intelligence-icon" aria-hidden="true">↗</div>

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

import { useState } from 'react'
import { demoAnalystMessages } from '../data/demoAnalyst'
import type { AnalystMessage } from '../types/aiAnalyst'
import { useApiResource } from '../hooks/useApiResource'
import type { AiAnalysisResponse } from '../types/api'
import { toMoney, type CurrencyCode } from '../types/money'
import { formatMoneyOrDash } from '../utils/format'

const suggestedQuestions = [
  'Which risks have the highest financial exposure?',
  'What should leadership prioritize first?',
  'Where are the biggest remediation opportunities?',
  'How does insurance coverage compare with exposure?',
]

function AIAnalyst() {
  const [messages, setMessages] =
    useState<AnalystMessage[]>(demoAnalystMessages)

  const [input, setInput] = useState('')

  // Deterministic, clearly-labelled analysis from live CRFIS statistics.
  const {
    data: analysisData,
    loading: analysisLoading,
    error: analysisError,
    reload: reloadAnalysis,
  } = useApiResource<AiAnalysisResponse>('/api/ai/analysis')

  const insights = analysisData?.data.insights ?? []

  function insightById(id: string) {
    return insights.find((insight) => insight.id === id)
  }

  function firstItemValue(id: string): string {
    const insight = insightById(id)
    const item = insight?.items?.[0]

    if (!item || item.amount === undefined || item.currency === undefined) {
      return '—'
    }

    return formatMoneyOrDash(toMoney(item.amount, item.currency as CurrencyCode))
  }

  const highestExposureCard = {
    value: analysisLoading ? '…' : firstItemValue('highest-exposure-risks'),
    small:
      insightById('highest-exposure-risks')?.items?.[0]?.label ??
      'No risks on record',
  }

  const criticalCount = insightById('critical-risk-count')?.count ?? 0

  const reductionCard = {
    value: analysisLoading ? '…' : firstItemValue('greatest-expected-reduction'),
    small:
      insightById('greatest-expected-reduction')?.items?.[0]?.label ??
      'No remediation actions on record',
  }

  const coverageBuckets = insightById('insurance-coverage')?.buckets
  const coverageValue =
    analysisLoading
      ? '…'
      : Object.entries(coverageBuckets ?? {}).length === 0
        ? '—'
        : Object.entries(coverageBuckets ?? {})
            .map(([currency, amount]) =>
              formatMoneyOrDash(toMoney(amount, currency as CurrencyCode)),
            )
            .join('  +  ')

  const handleSuggestedQuestion = (question: string) => {
    setInput(question)
  }

  const handleSend = () => {
    const trimmed = input.trim()

    if (!trimmed) {
      return
    }

    const now = new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    })

    const userMessage: AnalystMessage = {
      id: `MSG-${Date.now()}`,
      role: 'user',
      content: trimmed,
      timestamp: now,
      isDemo: true,
    }

    const assistantMessage: AnalystMessage = {
      id: `MSG-${Date.now()}-AI`,
      role: 'assistant',
      content:
        'This is a demonstration response. The production CRFIS AI Analyst will eventually analyze connected risk, asset, remediation, scenario, financial, and insurance data to provide decision support.',
      timestamp: now,
      isDemo: true,
    }

    setMessages((current) => [
      ...current,
      userMessage,
      assistantMessage,
    ])

    setInput('')
  }

  const handleKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (event.key === 'Enter') {
      handleSend()
    }
  }

  return (
    <section className="page">
      <header className="page-intro">
        <div className="page-intro-text">
          <div className="page-title-row">
            <h2>AI Analyst</h2>
            <span className="chip">DEMO AI</span>
          </div>

          <p>
            Decision-support interface for interpreting cyber risk,
            financial exposure, remediation, scenarios, and insurance.
          </p>
        </div>

        <div className="ai-status">
          <span className="status-dot" />
          Analyst interface ready
        </div>
      </header>

      <div className="notice">
        <span className="notice-icon" aria-hidden="true">i</span>

        <div>
          <strong>Demonstration environment</strong>

          <p>
            AI responses on this screen are fictional demonstration
            responses. No external AI provider, production data,
            database, or API is connected at this stage.
          </p>
        </div>
      </div>

      <section className="ai-insights">
        <div className="section-header">
          <div>
            <span className="eyebrow">RISK INTELLIGENCE</span>
            <h2>Executive Signals</h2>
          </div>

          <span className="chip chip--muted">DETERMINISTIC ANALYSIS</span>
        </div>

        {analysisError && (
          <div className="notice">
            <span className="notice-icon" aria-hidden="true">!</span>

            <div>
              <strong>Analysis could not be loaded.</strong>

              <p>{analysisError}</p>

              <button
                className="secondary-button"
                type="button"
                onClick={reloadAnalysis}
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {!analysisError && (
          <div className="ai-insight-grid">
            <article className="ai-insight-card critical">
              <span>Highest Exposure</span>

              <strong>{highestExposureCard.value}</strong>

              <small>{highestExposureCard.small}</small>

              <em>LIVE DATA</em>
            </article>

            <article className="ai-insight-card high">
              <span>Critical Risks</span>

              <strong>{criticalCount}</strong>

              <small>Live severity counts</small>

              <em>LIVE DATA</em>
            </article>

            <article className="ai-insight-card high">
              <span>Top Reduction Action</span>

              <strong>{reductionCard.value}</strong>

              <small>{reductionCard.small}</small>

              <em>LIVE DATA</em>
            </article>

            <article className="ai-insight-card informational">
              <span>Insurance Coverage</span>

              <strong>{coverageValue}</strong>

              <small>Policy limits, per currency</small>

              <em>LIVE DATA</em>
            </article>
          </div>
        )}
      </section>

      <div className="ai-workspace">
        <section className="ai-chat-panel">
          <div className="ai-chat-header">
            <div>
              <span className="eyebrow">
                CRFIS INTELLIGENCE ENGINE
              </span>

              <h2>Ask the Analyst</h2>
            </div>

            <span className="chip chip--muted">DEMO MODE</span>
          </div>

          <div
            className="ai-messages"
            aria-live="polite"
            aria-label="AI Analyst conversation"
          >
            {messages.map((message) => (
              <article
                className={`ai-message ${message.role}`}
                key={message.id}
              >
                <div className="ai-message-avatar">
                  {message.role === 'assistant' ? 'AI' : 'CS'}
                </div>

                <div className="ai-message-body">
                  <div className="ai-message-meta">
                    <strong>
                      {message.role === 'assistant'
                        ? 'CRFIS Analyst'
                        : 'CISO Office'}
                    </strong>

                    <span>{message.timestamp}</span>
                  </div>

                  <p>{message.content}</p>
                </div>
              </article>
            ))}
          </div>

          <div className="ai-composer">
            <label htmlFor="ai-question">
              Ask a question about your cyber risk
            </label>

            <div className="ai-input-row">
              <input
                id="ai-question"
                type="text"
                placeholder="e.g. Which risks should leadership prioritize?"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={handleKeyDown}
              />

              <button
                className="primary-button"
                type="button"
                onClick={handleSend}
              >
                Ask Analyst
              </button>
            </div>

            <small>
              Press Enter to submit. Responses are demonstration
              placeholders.
            </small>
          </div>
        </section>

        <aside className="ai-side-panel">
          <div>
            <span className="eyebrow">SUGGESTED ANALYSIS</span>

            <h2>Start with a question</h2>

            <p>
              Explore the types of executive questions the future
              CRFIS intelligence layer will support.
            </p>
          </div>

          <div className="ai-suggestions">
            {suggestedQuestions.map((question) => (
              <button
                type="button"
                key={question}
                onClick={() => handleSuggestedQuestion(question)}
              >
                <span>↗</span>
                {question}
              </button>
            ))}
          </div>

          <div className="ai-context-card">
            <span className="eyebrow">ANALYSIS CONTEXT</span>

            <ul>
              <li>Risk Register</li>
              <li>Asset Register</li>
              <li>Remediation</li>
              <li>Scenarios</li>
              <li>Insurance</li>
              <li>Reports</li>
            </ul>

            <small>
              Production data connections will be implemented in a
              later phase.
            </small>
          </div>
        </aside>
      </div>

      <section className="intelligence-panel">
        <div className="intelligence-icon">↗</div>

        <div>
          <span className="eyebrow">AI GOVERNANCE</span>

          <h2>Human decisions remain at the center.</h2>

          <p>
            The future CRFIS AI layer will support analysts and
            executives by explaining risk information, surfacing
            relationships, and presenting financial context while
            keeping human review and approval in the decision loop.
          </p>
        </div>

        <span className="chip chip--muted">
          HUMAN-IN-THE-LOOP
        </span>
      </section>
    </section>
  )
}

export default AIAnalyst
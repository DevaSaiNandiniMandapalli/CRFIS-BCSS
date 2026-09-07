import type { FastifyInstance } from 'fastify'
import { buildAnalysis } from '../services/analyst.js'
import { sendSuccess } from '../utils/api-response.js'

function formatMoney(amount: string | undefined, currency: string | undefined): string {
  if (!amount || !currency) return 'unavailable'

  const value = Number(amount)

  if (!Number.isFinite(value)) return 'unavailable'

  return `${currency} ${value.toLocaleString('en-US')}`
}

export async function aiRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/ai/analysis', async (_request, reply) => {
    const data = await buildAnalysis()

    return sendSuccess(reply, data)
  })

  app.post('/api/ai/chat', async (request, reply) => {
    const body = request.body as { question?: unknown }

    if (
      typeof body?.question !== 'string' ||
      body.question.trim() === ''
    ) {
      return reply.status(400).send({
        error: 'The question field must be a non-empty string.',
      })
    }

    try {
      const analysis = await buildAnalysis()
      const question = body.question.trim().toLowerCase()

      const highestExposureInsight = analysis.insights.find(
        (insight) => insight.id === 'highest-exposure-risks',
      )

      const highestExposureItem = highestExposureInsight?.items?.[0]

      if (
        highestExposureItem &&
        (question.includes('highest financial exposure') ||
          question.includes('highest exposure') ||
          question.includes('greatest financial exposure'))
      ) {
        return sendSuccess(reply, {
          mode: 'deterministic',
          provider: 'crfis-intelligence-engine',
          model: 'none',
          humanInTheLoop: true,
          answer: `The risk with the highest financial exposure is ${highestExposureItem.label}, with an exposure of ${formatMoney(
            highestExposureItem.amount,
            highestExposureItem.currency,
          )}.`,
          generatedAt: new Date().toISOString(),
          disclaimer:
            'Deterministic CRFIS decision support from live database analysis. Validate conclusions before taking action.',
        })
      }
      if (
        question.includes('insurance coverage') &&
        question.includes('exposure')
      ) {
        const riskStats = await import('../repositories/risks.js').then(
          ({ getRiskStats }) => getRiskStats({}),
        )

        const insuranceStats = await import('../repositories/insurance.js').then(
          ({ getInsuranceStats }) => getInsuranceStats({}),
        )

        const currencies = Array.from(
          new Set([
            ...Object.keys(riskStats.exposureByCurrency),
            ...Object.keys(insuranceStats.coverageLimitByCurrency),
          ]),
        ).sort()

        const formatAmount = (value: string | undefined): string => {
          const amount = Number(value ?? '0')

          return amount.toLocaleString('en-US')
        }

        const comparisonLines = currencies.map((currency) => {
          const exposure = Number(
            riskStats.exposureByCurrency[currency] ?? '0',
          )
          const coverage = Number(
            insuranceStats.coverageLimitByCurrency[currency] ?? '0',
          )
          const difference = coverage - exposure

          if (difference >= 0) {
            return `${currency}: Exposure ${currency} ${formatAmount(
              exposure.toString(),
            )}; Insurance coverage ${currency} ${formatAmount(
              coverage.toString(),
            )}; Coverage surplus ${currency} ${formatAmount(
              difference.toString(),
            )}.`
          }

          return `${currency}: Exposure ${currency} ${formatAmount(
            exposure.toString(),
          )}; Insurance coverage ${currency} ${formatAmount(
            coverage.toString(),
          )}; Coverage gap ${currency} ${formatAmount(
            Math.abs(difference).toString(),
          )}.`
        })

        return sendSuccess(reply, {
          mode: 'deterministic',
          provider: 'crfis-intelligence-engine',
          model: 'none',
          humanInTheLoop: true,
          answer: [
            'Insurance coverage compared with recorded financial exposure, by currency:',
            '',
            ...comparisonLines,
            '',
            'CRFIS does not combine or convert EUR, USD, or INR. Insurance limits are portfolio-level policy coverage and are not automatically assigned to individual risks.',
          ].join('\n'),
          generatedAt: new Date().toISOString(),
          disclaimer:
            'Deterministic CRFIS decision support from live database analysis. Validate conclusions before taking action.',
        })
      }


      const reductionInsight = analysis.insights.find(
        (insight) => insight.id === 'greatest-expected-reduction',
      )

      const reductionItems = reductionInsight?.items ?? []

      if (
        question.includes('remediation opportunities') ||
        question.includes('remediation opportunity') ||
        question.includes('biggest remediation') ||
        question.includes('greatest remediation')
      ) {
        const answer =
          reductionItems.length > 0
            ? [
                'The biggest remediation opportunities identified by CRFIS are:',
                '',
                ...reductionItems.map(
                  (item, index) =>
                    `${index + 1}. ${item.label} — ${formatMoney(
                      item.amount,
                      item.currency,
                    )}`,
                ),
                '',
                'These amounts are expected exposure reductions and must be interpreted within their recorded currencies. CRFIS does not combine or convert EUR, USD, or INR.',
              ].join('\n')
            : 'No remediation opportunities are currently available in the CRFIS analysis.'

        return sendSuccess(reply, {
          mode: 'deterministic',
          provider: 'crfis-intelligence-engine',
          model: 'none',
          humanInTheLoop: true,
          answer,
          generatedAt: new Date().toISOString(),
          disclaimer:
            'Deterministic CRFIS decision support from live database analysis. Validate conclusions before taking action.',
        })
      }

      const financialContext = analysis.insights
        .map((insight) => {
          if (insight.kind === 'items') {
            const items = (insight.items ?? [])
              .map(
                (item) =>
                  `- ${item.label} | EXACT AMOUNT: ${item.amount ?? 'N/A'} | CURRENCY: ${item.currency ?? 'N/A'}`,
              )
              .join('\n')

            return `${insight.title}:\n${items}\nNOTE: ${insight.note}`
          }

          if (insight.kind === 'buckets') {
            const buckets = Object.entries(insight.buckets ?? {})
              .map(([currency, amount]) => `- EXACT ${currency}: ${amount}`)
              .join('\n')

            return `${insight.title}:\n${buckets}\nNOTE: ${insight.note}`
          }

          return `${insight.title}: ${insight.count ?? 0}\nNOTE: ${insight.note}`
        })
        .join('\n\n')

      const response = await fetch('http://127.0.0.1:11434/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'qwen2.5-coder:3b',
          stream: false,
          messages: [
            {
              role: 'system',
              content:
                'You are the CRFIS Analyst. Use only the supplied CRFIS context. ' +
                'Every financial amount marked EXACT AMOUNT is an exact database value. ' +
                'Copy those digits exactly. Never change, round, scale, truncate, divide, ' +
                'multiply, estimate, or drop digits. Never convert currencies. Never combine ' +
                'EUR, USD, or INR. Always state the currency beside every monetary amount. ' +
                'If comparing values in different currencies, describe them separately rather ' +
                'than claiming which currency has the larger monetary value. Never invent facts. ' +
                'Provide concise executive decision support. Do not execute actions. Human review is required.',
            },
            {
              role: 'user',
              content: `CRFIS FINANCIAL CONTEXT:

${financialContext}

QUESTION:
${body.question.trim()}`,
            },
          ],
        }),
      })

      if (!response.ok) {
        return reply.status(503).send({
          error: 'Ollama service is unavailable.',
        })
      }

      const data = (await response.json()) as {
        message?: {
          content?: unknown
        }
      }

      if (typeof data.message?.content !== 'string') {
        return reply.status(502).send({
          error: 'Invalid response from Ollama.',
        })
      }

      return sendSuccess(reply, {
        mode: 'local-ollama',
        provider: 'ollama',
        model: 'qwen2.5-coder:3b',
        humanInTheLoop: true,
        answer: data.message.content,
        generatedAt: new Date().toISOString(),
        disclaimer:
          'Local Ollama decision support. Validate conclusions before taking action.',
      })
    } catch {
      return reply.status(503).send({
        error: 'CRFIS Analyst service is unavailable.',
      })
    }
  })
}
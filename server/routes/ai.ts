import type { FastifyInstance } from 'fastify'
import { buildAnalysis } from '../services/analyst.js'
import { sendSuccess } from '../utils/api-response.js'

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
        const amount =
          highestExposureItem.amount !== undefined
            ? Number(highestExposureItem.amount).toLocaleString('en-US')
            : 'unavailable'

        const currency = highestExposureItem.currency ?? ''

        return sendSuccess(reply, {
          mode: 'deterministic',
          provider: 'crfis-intelligence-engine',
          model: 'none',
          humanInTheLoop: true,
          answer: `The risk with the highest financial exposure is ${highestExposureItem.label}, with an exposure of ${amount} ${currency}.`,
          generatedAt: new Date().toISOString(),
          disclaimer:
            'Deterministic CRFIS decision support from live database analysis. Validate conclusions before taking action.',
        })
      }

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
                'You are the CRFIS Analyst. Use only the supplied CRFIS context. Never invent facts or financial values. Never combine EUR, USD, or INR. Identify currency for every monetary value. Give concise executive decision-support reasoning. Do not execute actions. Human review is required.',
            },
            {
              role: 'user',
              content: `CRFIS context:
${JSON.stringify(analysis)}

Question:
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
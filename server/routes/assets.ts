import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { assetCriticalitySchema, assetStatusSchema, assetTypeSchema } from '../schemas/domain.js'
import { listQuerySchema } from '../schemas/query.js'
import { getAssetById, listAssets } from '../services/assets.js'
import { sendSuccess } from '../utils/api-response.js'

/*
 * GET /api/assets       - filtered/paginated/sorted asset collection
 * GET /api/assets/:id   - single mapped asset
 *
 * Read-only. Validation errors surface as ZodError and are rendered by the
 * central error handler; unknown ids surface as HttpError 404.
 */

export const assetListQuerySchema = listQuerySchema(
  'name',
  'criticality',
  'annualValue',
  'status',
  'lastUpdated',
).extend({
  search: z.string().trim().min(1).max(200).optional(),
  criticality: assetCriticalitySchema.optional(),
  status: assetStatusSchema.optional(),
  type: assetTypeSchema.optional(),
})

export async function assetRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/assets', async (request, reply) => {
    const query = assetListQuerySchema.parse(request.query)
    const result = await listAssets(query)

    return sendSuccess(reply, result.data, result.meta)
  })

  app.get('/api/assets/:id', async (request, reply) => {
    const { id } = z.object({ id: z.string().min(1) }).parse(request.params)
    const asset = await getAssetById(id)

    return sendSuccess(reply, asset)
  })
}

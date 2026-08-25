import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { assetCriticalitySchema, assetStatusSchema, assetTypeSchema } from '../schemas/domain.js'
import { listQuerySchema } from '../schemas/query.js'
import {
  currencySchema,
  entityIdSchema,
  moneyStringSchema,
  shortTextSchema,
} from '../schemas/write.js'
import { requireAuth } from '../auth/guards.js'
import { requirePermission } from '../auth/guards.js'
import { getAssetById, createAsset, updateAsset, archiveAsset, listAssets } from '../services/assets.js'
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

export const assetCreateSchema = z.object({
  id: entityIdSchema,
  name: shortTextSchema('Name'),
  type: assetTypeSchema,
  businessUnit: shortTextSchema('Business unit'),
  criticality: assetCriticalitySchema,
  currency: currencySchema,
  annualValue: moneyStringSchema,
  status: assetStatusSchema,
  owner: shortTextSchema('Owner'),
})

export const assetUpdateSchema = assetCreateSchema
  .omit({ id: true })
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Provide at least one field to update.',
  })

const idParamsSchema = z.object({ id: entityIdSchema })

export async function assetRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/assets', async (request, reply) => {
    const query = assetListQuerySchema.parse(request.query)
    const result = await listAssets(query)

    return sendSuccess(reply, result.data, result.meta)
  })

  app.get('/api/assets/:id', async (request, reply) => {
    const { id } = idParamsSchema.parse(request.params)
    const asset = await getAssetById(id)

    return sendSuccess(reply, asset)
  })

  // Write endpoints require an authenticated user with assets:write.
  app.post(
    '/api/assets',
    { preHandler: [requireAuth, requirePermission('assets:write')] },
    async (request, reply) => {
      const input = assetCreateSchema.parse(request.body)
      const asset = await createAsset(input, request.crfisUser!.id)

      return sendSuccess(reply, asset, undefined, 201)
    },
  )

  app.patch(
    '/api/assets/:id',
    { preHandler: [requireAuth, requirePermission('assets:write')] },
    async (request, reply) => {
      const { id } = idParamsSchema.parse(request.params)
      const input = assetUpdateSchema.parse(request.body)
      const asset = await updateAsset(id, input)

      return sendSuccess(reply, asset)
    },
  )

  app.delete(
    '/api/assets/:id',
    { preHandler: [requireAuth, requirePermission('assets:write')] },
    async (request, reply) => {
      const { id } = idParamsSchema.parse(request.params)
      // Soft-delete: related risks/remediations/scenarios/policies keep
      // their referential integrity; the record leaves all read paths.
      const result = await archiveAsset(id)

      return sendSuccess(reply, result)
    },
  )
}

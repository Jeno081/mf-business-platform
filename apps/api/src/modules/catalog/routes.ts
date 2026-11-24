import { Router } from 'express';
import { asyncHandler } from '../../lib/async-handler';
import {
  attachProductImage,
  deleteProductImageFromProduct,
  setPrimaryProductImage,
  updateProductImage,
} from '../images/service';
import { attachImageSchema, imageParamsSchema, updateImageSchema } from '../images/schemas';
import { requireAdmin, requireAuth } from '../../middlewares/auth';
import {
  adminProductListQuerySchema,
  createProductSchema,
  productIdSchema,
  productListQuerySchema,
  productSlugSchema,
  stockAdjustmentSchema,
  updateProductSchema,
} from './schemas';
import {
  adjustStock,
  adminGetProduct,
  adminListProducts,
  archiveProduct,
  createProduct,
  getProductBySlug,
  getRelatedProducts,
  listBrands,
  listCategories,
  listProducts,
  updateProduct,
} from './service';

export const catalogRouter = Router();

catalogRouter.get(
  '/products',
  asyncHandler(async (req, res) => {
    const query = productListQuerySchema.parse(req.query);
    res.json(await listProducts(query));
  }),
);

catalogRouter.get(
  '/products/:slug/related',
  asyncHandler(async (req, res) => {
    const { slug } = productSlugSchema.parse(req.params);
    res.json({ data: await getRelatedProducts(slug) });
  }),
);

catalogRouter.get(
  '/products/:slug',
  asyncHandler(async (req, res) => {
    const { slug } = productSlugSchema.parse(req.params);
    res.json({ data: await getProductBySlug(slug) });
  }),
);

catalogRouter.get(
  '/brands',
  asyncHandler(async (_req, res) => {
    res.json({ data: await listBrands() });
  }),
);

catalogRouter.get(
  '/categories',
  asyncHandler(async (_req, res) => {
    res.json({ data: await listCategories() });
  }),
);

export const adminCatalogRouter = Router();

adminCatalogRouter.use(requireAuth, requireAdmin);

adminCatalogRouter.get(
  '/products',
  asyncHandler(async (req, res) => {
    const query = adminProductListQuerySchema.parse(req.query);
    res.json(await adminListProducts(query));
  }),
);

adminCatalogRouter.post(
  '/products',
  asyncHandler(async (req, res) => {
    const input = createProductSchema.parse(req.body);
    const product = await createProduct(input, req.auth!.userId);
    res.status(201).json({ data: product });
  }),
);

adminCatalogRouter.get(
  '/products/:id',
  asyncHandler(async (req, res) => {
    const { id } = productIdSchema.parse(req.params);
    res.json({ data: await adminGetProduct(id) });
  }),
);

adminCatalogRouter.patch(
  '/products/:id',
  asyncHandler(async (req, res) => {
    const { id } = productIdSchema.parse(req.params);
    const input = updateProductSchema.parse(req.body);
    res.json({ data: await updateProduct(id, input, req.auth!.userId) });
  }),
);

adminCatalogRouter.delete(
  '/products/:id',
  asyncHandler(async (req, res) => {
    const { id } = productIdSchema.parse(req.params);
    await archiveProduct(id, req.auth!.userId);
    res.status(204).send();
  }),
);

adminCatalogRouter.patch(
  '/variants/:id/stock',
  asyncHandler(async (req, res) => {
    const { id } = productIdSchema.parse(req.params);
    const input = stockAdjustmentSchema.parse(req.body);
    res.json({ data: await adjustStock(id, input, req.auth!.userId) });
  }),
);

adminCatalogRouter.post(
  '/products/:id/images',
  asyncHandler(async (req, res) => {
    const { id } = productIdSchema.parse(req.params);
    const input = attachImageSchema.parse(req.body);
    res.status(201).json({ data: await attachProductImage(id, input) });
  }),
);

adminCatalogRouter.patch(
  '/products/:id/images/:imageId',
  asyncHandler(async (req, res) => {
    const { id, imageId } = imageParamsSchema.parse(req.params);
    const input = updateImageSchema.parse(req.body);
    res.json({ data: await updateProductImage(id, imageId, input) });
  }),
);

adminCatalogRouter.post(
  '/products/:id/images/:imageId/primary',
  asyncHandler(async (req, res) => {
    const { id, imageId } = imageParamsSchema.parse(req.params);
    res.json({ data: await setPrimaryProductImage(id, imageId) });
  }),
);

adminCatalogRouter.delete(
  '/products/:id/images/:imageId',
  asyncHandler(async (req, res) => {
    const { id, imageId } = imageParamsSchema.parse(req.params);
    res.json({ data: await deleteProductImageFromProduct(id, imageId) });
  }),
);

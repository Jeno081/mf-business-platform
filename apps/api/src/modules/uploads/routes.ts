import { Router } from 'express';
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import { asyncHandler } from '../../lib/async-handler';
import { uploadProductImage } from '../../lib/cloudinary';
import { requireAdmin, requireAuth } from '../../middlewares/auth';
import { AppError } from '../../middlewares/error-handler';

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 6 * 1024 * 1024, files: 1 },
  fileFilter(_req, file, callback) {
    if (!ALLOWED_TYPES.has(file.mimetype)) {
      callback(
        new AppError(
          'Format non accepté. Utilisez une image JPG, PNG ou WebP.',
          400,
          'INVALID_IMAGE_TYPE',
        ),
      );
      return;
    }
    callback(null, true);
  },
});

const uploadLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

export const uploadsRouter = Router();

uploadsRouter.use(requireAuth, requireAdmin);

uploadsRouter.post(
  '/product-image',
  uploadLimiter,
  upload.single('file'),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      throw new AppError('Aucun fichier reçu.', 400, 'NO_FILE');
    }
    const uploaded = await uploadProductImage(req.file.buffer, req.file.originalname);
    res.status(201).json({ data: uploaded });
  }),
);

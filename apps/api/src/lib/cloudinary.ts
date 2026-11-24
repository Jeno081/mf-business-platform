import { v2 as cloudinary, type UploadApiResponse } from 'cloudinary';
import { env } from '../config/env';
import { AppError } from '../middlewares/error-handler';

let configured = false;

function configure(): void {
  if (configured) return;
  if (!env.CLOUDINARY_CLOUD_NAME || !env.CLOUDINARY_API_KEY || !env.CLOUDINARY_API_SECRET) {
    throw new AppError(
      'Le stockage d’images Cloudinary n’est pas configuré.',
      503,
      'CLOUDINARY_NOT_CONFIGURED',
    );
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(env.CLOUDINARY_CLOUD_NAME)) {
    throw new AppError(
      'Le Cloud name Cloudinary est invalide. Utilisez la valeur courte affichée dans le dashboard Cloudinary, pas le nom du compte.',
      503,
      'CLOUDINARY_INVALID_CONFIG',
    );
  }
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
    secure: true,
  });
  configured = true;
}

export interface UploadedImage {
  url: string;
  publicId: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
}

export async function uploadProductImage(
  buffer: Buffer,
  originalName: string,
): Promise<UploadedImage> {
  configure();

  try {
    const result = await new Promise<UploadApiResponse>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
      {
        folder: env.CLOUDINARY_FOLDER,
        resource_type: 'image',
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
        transformation: [{ quality: 'auto', fetch_format: 'auto' }],
        context: { original_name: originalName },
        use_filename: false,
        unique_filename: true,
        overwrite: false,
      },
      (error, response) => {
        if (error || !response) {
          reject(error ?? new Error('Réponse Cloudinary vide.'));
          return;
        }
        resolve(response);
      },
    );
      stream.end(buffer);
    });

    return {
      url: result.secure_url,
      publicId: result.public_id,
      width: result.width,
      height: result.height,
      format: result.format,
      bytes: result.bytes,
    };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(
      'Cloudinary a refusé l’image. Vérifiez le Cloud name, l’API Key et l’API Secret.',
      502,
      'CLOUDINARY_UPLOAD_FAILED',
    );
  }
}

export async function deleteProductImage(publicId: string): Promise<void> {
  configure();
  await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
}

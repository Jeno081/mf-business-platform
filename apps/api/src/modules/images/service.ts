import { prisma } from '@mf/database';
import { deleteProductImage } from '../../lib/cloudinary';
import { AppError } from '../../middlewares/error-handler';

export async function attachProductImage(
  productId: string,
  input: { url: string; publicId?: string; alt?: string },
) {
  const product = await prisma.product.findFirst({ where: { id: productId, deletedAt: null } });
  if (!product) throw new AppError('Produit introuvable.', 404, 'PRODUCT_NOT_FOUND');

  const count = await prisma.productImage.count({ where: { productId } });
  return prisma.productImage.create({
    data: {
      productId,
      url: input.url,
      publicId: input.publicId ?? null,
      alt: input.alt ?? product.name,
      position: count,
    },
  });
}

export async function updateProductImage(
  productId: string,
  imageId: string,
  input: { alt?: string | null; position?: number },
) {
  const image = await prisma.productImage.findFirst({ where: { id: imageId, productId } });
  if (!image) throw new AppError('Image introuvable.', 404, 'IMAGE_NOT_FOUND');

  return prisma.productImage.update({
    where: { id: image.id },
    data: {
      ...(input.alt !== undefined ? { alt: input.alt } : {}),
      ...(input.position !== undefined ? { position: input.position } : {}),
    },
  });
}

export async function deleteProductImageFromProduct(productId: string, imageId: string) {
  const image = await prisma.productImage.findFirst({ where: { id: imageId, productId } });
  if (!image) throw new AppError('Image introuvable.', 404, 'IMAGE_NOT_FOUND');

  await prisma.productImage.delete({ where: { id: image.id } });

  if (image.publicId) {
    await deleteProductImage(image.publicId).catch(() => {
      // L’image DB est supprimée ; un asset Cloudinary orphelin ne bloque pas l’admin.
    });
  }

  return { deleted: true };
}

export async function setPrimaryProductImage(productId: string, imageId: string) {
  const image = await prisma.productImage.findFirst({ where: { id: imageId, productId } });
  if (!image) throw new AppError('Image introuvable.', 404, 'IMAGE_NOT_FOUND');

  await prisma.$transaction([
    prisma.productImage.updateMany({
      where: { productId, id: { not: imageId } },
      data: { position: { increment: 1 } },
    }),
    prisma.productImage.update({
      where: { id: imageId },
      data: { position: 0 },
    }),
  ]);

  return prisma.productImage.findMany({
    where: { productId },
    orderBy: { position: 'asc' },
  });
}

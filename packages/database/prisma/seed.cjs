/* Seed catalogue MF Business — 188 produits, variantes et images. */
const fs = require('node:fs');
const path = require('node:path');

require('dotenv').config({
  path: path.resolve(__dirname, '../../../apps/api/.env'),
});

const { PrismaClient, Prisma } = require('../generated/prisma');

const prisma = new PrismaClient();

const CATEGORY_META = {
  smartphones: {
    name: 'Smartphones',
    slug: 'smartphones',
    description: 'Téléphones neufs, scellés et garantis 12 mois.',
    position: 1,
  },
  tablettes: {
    name: 'Tablettes',
    slug: 'tablettes',
    description: 'Tablettes pour le travail, les études et le divertissement.',
    position: 2,
  },
  audio: {
    name: 'Audio',
    slug: 'audio',
    description: 'Écouteurs, casques et enceintes portables.',
    position: 3,
  },
  accessoires: {
    name: 'Accessoires',
    slug: 'accessoires',
    description: 'Chargeurs, coques, montres connectées et protections.',
    position: 4,
  },
};

function slugify(value) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const { createHash } = require('node:crypto');

function skuFor(id, suffix = '') {
  const base = id
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 56);
  const hash = createHash('sha1').update(id).digest('hex').slice(0, 6).toUpperCase();
  return `${base}-${hash}${suffix}`.slice(0, 80);
}

function parseStorage(subtitle) {
  const match = /(\d+)\s?(Go|To|GB|TB)\b/i.exec(subtitle || '');
  return match ? `${match[1]} ${match[2]}` : null;
}

function imageUrl(imagePath) {
  const file = path.basename(imagePath || '');
  return `/images/products/${file}`;
}

async function main() {
  const catalogPath = path.join(__dirname, 'seed-data', 'catalog.json');
  const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));

  if (!Array.isArray(catalog) || catalog.length !== 188) {
    throw new Error(`Catalogue invalide : ${catalog?.length ?? 0} produits au lieu de 188.`);
  }

  const categoryBySlug = new Map();

  for (const meta of Object.values(CATEGORY_META)) {
    const category = await prisma.category.upsert({
      where: { slug: meta.slug },
      update: { name: meta.name, description: meta.description, position: meta.position, isActive: true },
      create: { ...meta, isActive: true },
    });
    categoryBySlug.set(meta.slug, category);
  }

  const brandNames = [...new Set(catalog.map((product) => product.brand))].sort();
  const brandByName = new Map();

  for (const name of brandNames) {
    const slug = slugify(name);
    const brand = await prisma.brand.upsert({
      where: { slug },
      update: { name },
      create: { name, slug },
    });
    brandByName.set(name, brand);
  }

  let processed = 0;

  for (const item of catalog) {
    const category = categoryBySlug.get(item.category);
    const brand = brandByName.get(item.brand);
    if (!category || !brand) {
      throw new Error(`Catégorie ou marque manquante pour ${item.id}`);
    }

    const image = imageUrl(item.image);
    const imageFile = path.join(
      __dirname,
      '..',
      '..',
      '..',
      'apps',
      'api',
      'public',
      'images',
      'products',
      path.basename(item.image || ''),
    );

    if (!fs.existsSync(imageFile)) {
      throw new Error(`Image manquante pour ${item.id} : ${imageFile}`);
    }

    const colors = Array.isArray(item.colors) && item.colors.length > 0
      ? item.colors
      : [{ name: 'Standard', hex: '#D8D2C4' }];

    const storage = parseStorage(item.subtitle);
    const totalStock = Number.isFinite(item.stock) ? Math.max(0, Number(item.stock)) : 0;
    const baseStock = Math.floor(totalStock / colors.length);
    const remainder = totalStock % colors.length;

    const baseSku = skuFor(item.id);
    const description = String(item.description || '').trim();
    const metaDescription = description.slice(0, 300);

    let seeded = false;
    for (let attempt = 1; attempt <= 4 && !seeded; attempt += 1) {
      try {
        await prisma.$transaction(async (tx) => {
      const product = await tx.product.upsert({
        where: { slug: item.id },
        update: {
          name: item.name,
          sku: baseSku,
          subtitle: item.subtitle || null,
          series: item.series || null,
          badge: item.badge || null,
          badgeTone: item.badgeTone || null,
          shortDescription: item.subtitle || null,
          description,
          keywords: item.keywords || null,
          price: new Prisma.Decimal(item.price),
          compareAtPrice: item.oldPrice ? new Prisma.Decimal(item.oldPrice) : null,
          status: 'ACTIVE',
          isFeatured: Boolean(item.featured),
          ratingAverage: new Prisma.Decimal(item.rating ?? 0),
          ratingCount: Number(item.reviews ?? 0),
          metaTitle: `${item.name} — ${item.brand}`,
          metaDescription,
          brandId: brand.id,
          categoryId: category.id,
          deletedAt: null,
        },
        create: {
          name: item.name,
          slug: item.id,
          sku: baseSku,
          subtitle: item.subtitle || null,
          series: item.series || null,
          badge: item.badge || null,
          badgeTone: item.badgeTone || null,
          shortDescription: item.subtitle || null,
          description,
          keywords: item.keywords || null,
          price: new Prisma.Decimal(item.price),
          compareAtPrice: item.oldPrice ? new Prisma.Decimal(item.oldPrice) : null,
          status: 'ACTIVE',
          isFeatured: Boolean(item.featured),
          ratingAverage: new Prisma.Decimal(item.rating ?? 0),
          ratingCount: Number(item.reviews ?? 0),
          metaTitle: `${item.name} — ${item.brand}`,
          metaDescription,
          brandId: brand.id,
          categoryId: category.id,
        },
      });

      await tx.productVariant.deleteMany({ where: { productId: product.id } });
      await tx.productImage.deleteMany({ where: { productId: product.id } });
      await tx.productSpec.deleteMany({ where: { productId: product.id } });
      await tx.productFeature.deleteMany({ where: { productId: product.id } });

      await tx.productVariant.createMany({
        data: colors.map((color, index) => ({
          productId: product.id,
          sku: skuFor(item.id, `-${index + 1}`),
          name: storage ? `${color.name} · ${storage}` : color.name,
          storage,
          color: color.name,
          stockQuantity: baseStock + (index < remainder ? 1 : 0),
          isActive: true,
        })),
      });

      await tx.productImage.create({
        data: {
          productId: product.id,
          url: image,
          alt: `${item.name} — ${item.brand}`,
          position: 0,
        },
      });

      const specs = Array.isArray(item.specs) ? item.specs : [];
      if (specs.length > 0) {
        await tx.productSpec.createMany({
          data: specs.map(([label, value], position) => ({
            productId: product.id,
            label: String(label),
            value: String(value),
            position,
          })),
        });
      }

      const features = Array.isArray(item.features) ? item.features : [];
      if (features.length > 0) {
        await tx.productFeature.createMany({
          data: features.map((text, position) => ({
            productId: product.id,
            text: String(text),
            position,
          })),
        });
      }
        }, { timeout: 60_000, maxWait: 10_000 });
        seeded = true;
      } catch (error) {
        if (attempt === 4) {
          throw error;
        }
        console.warn(
          `Nouvelle tentative ${attempt + 1}/4 pour ${item.id} : ${error instanceof Error ? error.message : error}`,
        );
        await new Promise((resolve) => setTimeout(resolve, 2_000));
      }
    }

    processed += 1;
    if (processed % 25 === 0 || processed === catalog.length) {
      console.log(`Seed : ${processed}/${catalog.length}`);
    }
  }

  const [products, variants, images, brands, categories] = await Promise.all([
    prisma.product.count({ where: { deletedAt: null } }),
    prisma.productVariant.count(),
    prisma.productImage.count(),
    prisma.brand.count(),
    prisma.category.count(),
  ]);

  console.log('---');
  console.log({ products, variants, images, brands, categories });
}

main()
  .catch((error) => {
    console.error('Seed échoué :', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

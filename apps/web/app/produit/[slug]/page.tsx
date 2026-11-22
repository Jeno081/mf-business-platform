import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ProductCard } from '@/components/ProductCard';
import { ProductPurchase } from '@/components/ProductPurchase';
import { ProductTabs } from '@/components/ProductTabs';
import {
  ArrowIcon,
  ShieldIcon,
  StarIcon,
  TruckIcon,
  WhatsappIcon,
} from '@/components/Icons';
import { formatPrice, getProductDetail, getRelatedProducts, imageUrl } from '@/lib/api';

export const revalidate = 120;

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  try {
    const { slug } = await params;
    const product = await getProductDetail(slug);
    return {
      title: `${product.name} — MF Business`,
      description:
        product.metaDescription ??
        product.description ??
        `Achetez ${product.name} chez MF Business, à Kinshasa.`,
      openGraph: {
        title: `${product.name} — MF Business`,
        description: product.description ?? undefined,
        images: product.image ? [imageUrl(product.image) ?? ''] : undefined,
      },
    };
  } catch {
    return { title: 'Produit — MF Business' };
  }
}

export default async function ProductPage({ params }: { params: Params }) {
  const { slug } = await params;
  let product;

  try {
    product = await getProductDetail(slug);
  } catch {
    notFound();
  }

  const related = await getRelatedProducts(slug);
  const image = imageUrl(product.image);
  const categoryHref = `/catalogue?category=${product.category.slug}`;
  const colorLabel = product.colors.slice(0, 3).join(' · ');

  return (
    <main className="product-page">
      <div className="container">
        <nav className="breadcrumb" aria-label="Fil d’Ariane">
          <Link href="/">Accueil</Link>
          <span aria-hidden="true">/</span>
          <Link href="/catalogue">Catalogue</Link>
          <span aria-hidden="true">/</span>
          <Link href={categoryHref}>{product.category.name}</Link>
          <span aria-hidden="true">/</span>
          <span>{product.name}</span>
        </nav>

        <div className="product-detail">
          <div className="product-detail__media">
            {product.badge && <span className="badge">{product.badge}</span>}
            {image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={image} alt={product.imageAlt ?? product.name} width={900} height={900} />
            ) : (
              <span className="product-detail__placeholder" />
            )}
            {product.compareAtPrice && (
              <span className="product-detail__deal">
                Économisez {formatPrice(product.compareAtPrice - product.price)}
              </span>
            )}
          </div>

          <div className="product-detail__info">
            <div className="product-detail__top">
              <span className="product-card__brand">{product.brand.name}</span>
              <span className="product-detail__stock">
                {product.inStock ? 'En stock · prêt à livrer' : 'Sur commande'}
              </span>
            </div>

            <h1 className="display">{product.name}</h1>
            <p className="product-detail__subtitle">{product.subtitle}</p>

            <div className="product-detail__rating">
              <span className="stars">
                {Array.from({ length: 5 }).map((_, index) => (
                  <StarIcon key={index} />
                ))}
              </span>
              <strong>{product.rating.toFixed(1)}</strong>
              <span>({product.reviews} avis)</span>
            </div>

            <div className="product-detail__price">
              <strong>{formatPrice(product.price)}</strong>
              {product.compareAtPrice && <span>{formatPrice(product.compareAtPrice)}</span>}
            </div>

            <p className="product-detail__description">
              {product.description ??
                'Un appareil sélectionné par MF Business, neuf, scellé et garanti 12 mois.'}
            </p>

            <ProductPurchase product={product} />

            <div className="product-benefits">
              <span>
                <ShieldIcon /> Garantie 12 mois
              </span>
              <span>
                <TruckIcon /> Livraison 24–48 h
              </span>
              <span>
                <WhatsappIcon /> Conseil WhatsApp
              </span>
            </div>

            {colorLabel && (
              <p className="product-detail__colors">
                Coloris disponibles : <strong>{colorLabel}</strong>
              </p>
            )}
          </div>
        </div>

        <ProductTabs product={product} />

        {related.length > 0 && (
          <section className="related">
            <div className="section-head">
              <div>
                <p className="eyebrow">À découvrir aussi</p>
                <h2 className="display">
                  Dans le <em>même esprit.</em>
                </h2>
              </div>
              <Link className="link-arrow" href="/catalogue">
                Tout le catalogue <ArrowIcon />
              </Link>
            </div>
            <div className="product-grid">
              {related.map((item) => (
                <ProductCard key={item.id} product={item} />
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

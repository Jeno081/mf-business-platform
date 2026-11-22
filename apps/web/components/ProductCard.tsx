import { formatPrice, imageUrl, type Product } from '@/lib/api';
import { StarIcon, WhatsappIcon } from './Icons';

interface ProductCardProps {
  product: Product;
  priority?: boolean;
}

export function ProductCard({ product, priority = false }: ProductCardProps) {
  const image = imageUrl(product.image);
  const orderMessage = encodeURIComponent(
    `Bonjour MF Business, je souhaite commander : ${product.name} (${formatPrice(product.price)}).`,
  );

  return (
    <article className="product-card">
      <div className="product-card__media">
        {product.badge && <span className="badge">{product.badge}</span>}
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt={product.imageAlt ?? product.name}
            width={900}
            height={900}
            loading={priority ? 'eager' : 'lazy'}
          />
        ) : (
          <span className="product-card__placeholder" aria-hidden="true" />
        )}
        <a
          className="product-card__quick"
          href={`https://wa.me/243811860632?text=${orderMessage}`}
          target="_blank"
          rel="noopener"
          aria-label={`Commander ${product.name} sur WhatsApp`}
        >
          <WhatsappIcon />
        </a>
      </div>
      <div className="product-card__body">
        <span className="product-card__brand">{product.brand.name}</span>
        <h3 className="product-card__name">{product.name}</h3>
        <p className="product-card__meta">{product.subtitle}</p>
        <div className="product-card__rating">
          <StarIcon />
          <span>{product.rating.toFixed(1)}</span>
          <span className="product-card__reviews">({product.reviews})</span>
          {product.stock > 0 && product.stock <= 5 && (
            <span className="product-card__stock">Derniers exemplaires</span>
          )}
        </div>
        <div className="product-card__price">
          <span className="price">{formatPrice(product.price)}</span>
          {product.compareAtPrice && (
            <span className="price__old">{formatPrice(product.compareAtPrice)}</span>
          )}
        </div>
      </div>
    </article>
  );
}

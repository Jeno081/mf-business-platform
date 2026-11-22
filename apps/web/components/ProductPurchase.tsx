'use client';

import { useMemo, useState } from 'react';
import { formatPrice, type ProductDetail } from '@/lib/api';
import { useCart } from './CartProvider';
import { CartIcon, WhatsappIcon } from './Icons';

export function ProductPurchase({ product }: { product: ProductDetail }) {
  const availableVariants = product.variants.filter((variant) => variant.stockQuantity > 0);
  const initialVariant = availableVariants[0] ?? product.variants[0] ?? null;
  const [variantId, setVariantId] = useState(initialVariant?.id ?? '');
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const { addItem } = useCart();

  const variant = useMemo(
    () => product.variants.find((item) => item.id === variantId) ?? initialVariant,
    [product.variants, variantId, initialVariant],
  );

  const label = [variant?.color, variant?.storage].filter(Boolean).join(' · ');
  const total = product.price * quantity;
  const stock = variant?.stockQuantity ?? product.stock;

  function handleAddToCart() {
    addItem({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      brand: product.brand.name,
      price: product.price,
      image: product.image,
      variantId: variant?.id ?? null,
      variantLabel: label || null,
      quantity,
      stock,
    });
    setAdded(true);
    window.setTimeout(() => setAdded(false), 2200);
  }

  const message = encodeURIComponent(
    `Bonjour MF Business, je souhaite commander :\n\n${product.name}${
      label ? ` — ${label}` : ''
    }\nQuantité : ${quantity}\nPrix : ${formatPrice(total)}\n\nMerci de me confirmer la disponibilité.`,
  );

  return (
    <div className="purchase">
      <div className="purchase__variants">
        <div className="purchase__label">
          <span>Coloris / variante</span>
          <strong>{label || 'Standard'}</strong>
        </div>
        <div className="purchase__options">
          {product.variants.map((option) => {
            const optionLabel = [option.color, option.storage].filter(Boolean).join(' · ');
            const disabled = option.stockQuantity <= 0;
            return (
              <button
                key={option.id}
                type="button"
                className={`variant-chip ${option.id === variant?.id ? 'is-active' : ''}`}
                onClick={() => setVariantId(option.id)}
                disabled={disabled}
                aria-pressed={option.id === variant?.id}
                title={disabled ? 'Rupture de stock' : optionLabel}
              >
                {optionLabel}
                {disabled && <span>Épuisé</span>}
              </button>
            );
          })}
        </div>
      </div>

      <div className="purchase__row">
        <div className="quantity" aria-label="Quantité">
          <button
            type="button"
            onClick={() => setQuantity((value) => Math.max(1, value - 1))}
            aria-label="Diminuer la quantité"
            disabled={quantity <= 1}
          >
            −
          </button>
          <span>{quantity}</span>
          <button
            type="button"
            onClick={() => setQuantity((value) => Math.min(10, value + 1))}
            aria-label="Augmenter la quantité"
            disabled={quantity >= 10}
          >
            +
          </button>
        </div>
        <div className="purchase__total">
          <span>Total</span>
          <strong>{formatPrice(total)}</strong>
        </div>
      </div>

      <div className="purchase__actions">
        <button className="btn btn--dark purchase__cta" type="button" onClick={handleAddToCart}>
          <CartIcon /> {added ? 'Ajouté au panier' : 'Ajouter au panier'}
        </button>
        <a
          className="btn btn--outline purchase__cta"
          href={`https://wa.me/243811860632?text=${message}`}
          target="_blank"
          rel="noopener"
        >
          <WhatsappIcon /> Commander sur WhatsApp
        </a>
      </div>
      {added && (
        <p className="purchase__added">
          Produit ajouté. <a href="/panier">Voir le panier →</a>
        </p>
      )}
      <p className="purchase__note">
        Paiement à la livraison ou en boutique. Un conseiller confirme la disponibilité et le
        créneau avec vous.
      </p>
    </div>
  );
}

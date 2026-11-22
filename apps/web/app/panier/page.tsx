'use client';

import Link from 'next/link';
import { imageUrl, formatPrice } from '@/lib/api';
import { useCart } from '@/components/CartProvider';
import { CartIcon, CloseIcon } from '@/components/Icons';
import { deliveryFee } from '@/lib/cart';

export default function CartPage() {
  const { items, count, subtotal, setQuantity, removeItem } = useCart();
  const delivery = deliveryFee(subtotal);
  const total = subtotal + delivery;

  return (
    <main className="cart-page">
      <div className="container">
        <nav className="breadcrumb" aria-label="Fil d’Ariane">
          <Link href="/">Accueil</Link>
          <span aria-hidden="true">/</span>
          <span>Panier</span>
        </nav>

        <div className="cart-head">
          <div>
            <p className="eyebrow">Votre sélection</p>
            <h1 className="display">
              Le panier, <em>sans détour.</em>
            </h1>
          </div>
          <p>
            {count} {count > 1 ? 'articles' : 'article'}
          </p>
        </div>

        {items.length === 0 ? (
          <div className="cart-empty">
            <span className="cart-drawer__icon">
              <CartIcon />
            </span>
            <h2 className="display">Votre panier est vide.</h2>
            <p>Parcourez le catalogue et ajoutez les produits qui vous intéressent.</p>
            <Link className="btn btn--dark" href="/catalogue">
              Explorer le catalogue
            </Link>
          </div>
        ) : (
          <div className="cart-layout">
            <div className="cart-lines">
              {items.map((item) => {
                const image = imageUrl(item.image);
                return (
                  <article className="cart-line" key={`${item.productId}-${item.variantId}`}>
                    <Link className="cart-line__media" href={`/produit/${item.slug}`}>
                      {image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={image} alt={item.name} width={160} height={160} />
                      ) : null}
                    </Link>
                    <div className="cart-line__body">
                      <span className="product-card__brand">{item.brand}</span>
                      <Link className="cart-line__name" href={`/produit/${item.slug}`}>
                        {item.name}
                      </Link>
                      <p>{item.variantLabel}</p>
                      <div className="cart-line__actions">
                        <div className="quantity">
                          <button
                            type="button"
                            onClick={() =>
                              setQuantity(item.productId, item.variantId, item.quantity - 1)
                            }
                            aria-label="Diminuer la quantité"
                          >
                            −
                          </button>
                          <span>{item.quantity}</span>
                          <button
                            type="button"
                            onClick={() =>
                              setQuantity(item.productId, item.variantId, item.quantity + 1)
                            }
                            aria-label="Augmenter la quantité"
                          >
                            +
                          </button>
                        </div>
                        <button
                          className="cart-line__remove"
                          type="button"
                          onClick={() => removeItem(item.productId, item.variantId)}
                        >
                          <CloseIcon /> Retirer
                        </button>
                      </div>
                    </div>
                    <strong className="cart-line__price">
                      {formatPrice(item.price * item.quantity)}
                    </strong>
                  </article>
                );
              })}
              <Link className="cart-continue" href="/catalogue">
                ← Continuer mes achats
              </Link>
            </div>

            <aside className="cart-summary">
              <h2>Récapitulatif</h2>
              <div className="cart-summary__row">
                <span>Sous-total</span>
                <strong>{formatPrice(subtotal)}</strong>
              </div>
              <div className="cart-summary__row">
                <span>Livraison</span>
                <strong>{delivery === 0 ? 'Offerte' : formatPrice(delivery)}</strong>
              </div>
              {subtotal < 150 && (
                <p className="cart-summary__note">
                  Plus que {formatPrice(150 - subtotal)} pour la livraison offerte.
                </p>
              )}
              <div className="cart-summary__total">
                <span>Total</span>
                <strong>{formatPrice(total)}</strong>
              </div>
              <Link className="btn btn--dark" href="/checkout">
                Passer commande
              </Link>
              <p className="cart-summary__secure">Paiement à la livraison ou en boutique.</p>
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}

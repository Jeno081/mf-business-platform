'use client';

import { useState } from 'react';
import type { ProductDetail } from '@/lib/api';

const TABS = [
  ['description', 'Description'],
  ['specs', 'Caractéristiques'],
  ['livraison', 'Livraison & garantie'],
] as const;

type Tab = (typeof TABS)[number][0];

export function ProductTabs({ product }: { product: ProductDetail }) {
  const [tab, setTab] = useState<Tab>('description');

  return (
    <section className="product-tabs">
      <div className="product-tabs__nav" role="tablist" aria-label="Informations produit">
        {TABS.map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={tab === value}
            className={tab === value ? 'is-active' : undefined}
            onClick={() => setTab(value)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="product-tabs__panel">
        {tab === 'description' && (
          <div>
            <p className="product-tabs__lead">{product.description}</p>
            {product.features.length > 0 && (
              <ul className="product-features">
                {product.features.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        {tab === 'specs' && (
          <div className="spec-table">
            {product.specs.map((spec) => (
              <div className="spec-table__row" key={spec.label}>
                <span>{spec.label}</span>
                <strong>{spec.value}</strong>
              </div>
            ))}
          </div>
        )}

        {tab === 'livraison' && (
          <div className="shipping-copy">
            <h3>Livraison à Kinshasa</h3>
            <p>
              Livraison offerte dès 150 $ d’achat. En dessous, les frais sont confirmés sur
              WhatsApp selon votre commune. Délai habituel : 24 à 48 h.
            </p>
            <h3>Garantie 12 mois</h3>
            <p>
              Chaque appareil est neuf, scellé et couvert par une garantie de 12 mois. La facture
              est remise avec le produit. Le service après-vente reste joignable sur WhatsApp.
            </p>
            <h3>Paiement</h3>
            <p>
              Paiement à la livraison, en boutique, ou par Mobile Money. Aucun paiement en ligne
              n’est demandé avant confirmation de votre commande.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

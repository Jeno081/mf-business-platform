'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  fetchTrackedOrder,
  formatPrice,
  trackingInvoiceUrl,
  type OrderResponse,
} from '@/lib/api';

const STEPS = [
  ['PENDING', 'Reçue'],
  ['CONFIRMED', 'Validée'],
  ['PREPARING', 'En préparation'],
  ['SHIPPED', 'Expédiée'],
  ['DELIVERED', 'Livrée'],
] as const;

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'En attente de validation',
  CONFIRMED: 'Commande validée',
  PREPARING: 'En préparation',
  SHIPPED: 'Expédiée',
  DELIVERED: 'Livrée',
  CANCELLED: 'Annulée',
  REFUNDED: 'Remboursée',
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

export default function OrderTrackingPage() {
  const params = useParams<{ token: string }>();
  const [order, setOrder] = useState<OrderResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  function load() {
    if (!params.token) return;
    setLoading(true);
    setError('');
    fetchTrackedOrder(params.token)
      .then(setOrder)
      .catch((err) => setError(err instanceof Error ? err.message : 'Commande introuvable.'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.token]);

  if (loading) {
    return (
      <main className="tracking-page">
        <div className="container tracking-state">Chargement de votre commande…</div>
      </main>
    );
  }

  if (!order) {
    return (
      <main className="tracking-page">
        <div className="container tracking-state">
          <p className="eyebrow">Suivi de commande</p>
          <h1 className="display">Lien introuvable.</h1>
          <p>{error || 'Vérifiez que le lien de suivi est complet.'}</p>
          <Link className="btn btn--dark" href="/contact">Contacter la maison</Link>
        </div>
      </main>
    );
  }

  const cancelled = order.status === 'CANCELLED' || order.status === 'REFUNDED';
  const stepIndex = STEPS.findIndex(([status]) => status === order.status);
  const invoiceAvailable = !cancelled && order.status !== 'PENDING';

  return (
    <main className="tracking-page">
      <div className="container">
        <nav className="breadcrumb" aria-label="Fil d’Ariane">
          <Link href="/">Accueil</Link>
          <span aria-hidden="true">/</span>
          <span>Suivi de commande</span>
        </nav>

        <header className="tracking-head">
          <div>
            <p className="eyebrow">Votre commande</p>
            <h1 className="display">{order.orderNumber}</h1>
            <p>Passée le {formatDate(order.createdAt)}</p>
          </div>
          <span className={`tracking-status tracking-status--${order.status.toLowerCase()}`}>
            {STATUS_LABELS[order.status] ?? order.status}
          </span>
        </header>

        {cancelled ? (
          <section className="tracking-cancelled">
            <h2 className="display">Cette commande est {order.status === 'CANCELLED' ? 'annulée' : 'remboursée'}.</h2>
            <p>Notre équipe reste disponible pour toute question.</p>
            <Link className="btn btn--dark" href="/contact">Nous contacter</Link>
          </section>
        ) : (
          <section className="tracking-timeline">
            {STEPS.map(([status, label], index) => (
              <div
                key={status}
                className={
                  index <= stepIndex
                    ? 'tracking-step is-done'
                    : 'tracking-step'
                }
              >
                <span className="tracking-step__dot">{index < stepIndex ? '✓' : index + 1}</span>
                <span>{label}</span>
              </div>
            ))}
          </section>
        )}

        <div className="tracking-layout">
          <section className="tracking-card">
            <h2>Votre commande</h2>
            <div className="tracking-lines">
              {order.items.map((item) => (
                <div className="tracking-line" key={item.id}>
                  <span>
                    <strong>{item.productName}</strong>
                    <em>{item.variantLabel} · Qté {item.quantity}</em>
                  </span>
                  <b>{formatPrice(item.lineTotal)}</b>
                </div>
              ))}
            </div>
            <div className="tracking-totals">
              <div><span>Sous-total</span><strong>{formatPrice(order.subtotal)}</strong></div>
              <div><span>Livraison</span><strong>{order.deliveryFee === 0 ? 'Offerte' : formatPrice(order.deliveryFee)}</strong></div>
              <div className="tracking-totals__total"><span>Total</span><strong>{formatPrice(order.total)}</strong></div>
            </div>
          </section>

          <aside className="tracking-side">
            <section className="tracking-card">
              <h2>Livraison</h2>
              <p><strong>{order.customer.name}</strong></p>
              <p>{order.shippingAddress.address}</p>
              <p>{order.shippingAddress.commune}, {order.shippingAddress.city}</p>
              <p>{order.customer.phone}</p>
            </section>

            <section className="tracking-card tracking-invoice">
              <h2>Votre facture</h2>
              {invoiceAvailable ? (
                <>
                  <p>Votre facture officielle est disponible au format PDF.</p>
                  <a
                    className="btn btn--dark"
                    href={trackingInvoiceUrl(params.token)}
                    target="_blank"
                    rel="noopener"
                  >
                    Voir la facture PDF
                  </a>
                  <a
                    className="tracking-download"
                    href={trackingInvoiceUrl(params.token, true)}
                    target="_blank"
                    rel="noopener"
                  >
                    Télécharger
                  </a>
                </>
              ) : (
                <p>La facture sera disponible dès que la commande sera validée par la maison.</p>
              )}
            </section>

            <button className="btn btn--outline" type="button" onClick={load}>
              Actualiser le statut
            </button>
          </aside>
        </div>
      </div>
    </main>
  );
}

'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { AdminLoading, PageState, StatusBadge } from '@/components/Ui';
import {
  ALLOWED_TRANSITIONS,
  STATUS_LABELS,
  fetchOrder,
  formatDate,
  formatPrice,
  markOrderPaid,
  updateOrderStatus,
  type OrderDetail,
} from '@/lib/api';
import { ArrowLeftIcon } from '@/components/Icons';

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>();
  const { token } = useAuth();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token || !params.id) return;
    let cancelled = false;

    async function load() {
      try {
        const result = await fetchOrder(token as string, params.id);
        if (cancelled) return;
        setOrder(result.data);
        setStatus(result.data.status);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Commande introuvable.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [token, params.id]);

  async function changeStatus() {
    if (!order || !token) return;
    setBusy(true);
    setMessage('');
    setError('');
    try {
      const result = await updateOrderStatus(token, order.id, status, note || undefined);
      setOrder(result.data);
      setStatus(result.data.status);
      setNote('');
      setMessage('Statut mis à jour.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Mise à jour impossible.');
    } finally {
      setBusy(false);
    }
  }

  async function togglePaid() {
    if (!order || !token) return;
    setBusy(true);
    setMessage('');
    setError('');
    try {
      const result = await markOrderPaid(token, order.id, order.paymentStatus !== 'PAID');
      setOrder(result.data);
      setMessage(result.data.paymentStatus === 'PAID' ? 'Paiement encaissé.' : 'Paiement remis en attente.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Mise à jour du paiement impossible.');
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <AdminLoading rows={6} />;
  if (!order) return <PageState title="Commande introuvable" tone="danger">{error}</PageState>;

  const transitions = ALLOWED_TRANSITIONS[order.status] ?? [];
  const canChange = transitions.length > 0;

  return (
    <div className="admin-page">
      <Link className="admin-back" href="/commandes">
        <ArrowLeftIcon /> Toutes les commandes
      </Link>

      <section className="admin-detail-head">
        <div>
          <p className="admin-eyebrow">Commande</p>
          <h2>{order.orderNumber}</h2>
          <p>{formatDate(order.createdAt)} · {order.itemsCount} article{order.itemsCount > 1 ? 's' : ''}</p>
        </div>
        <div className="admin-detail-head__status">
          <StatusBadge status={order.status} />
          <StatusBadge status={order.paymentStatus} kind="payment" />
          <strong>{formatPrice(order.total)}</strong>
        </div>
      </section>

      {message && <div className="admin-alert admin-alert--success">{message}</div>}
      {error && <div className="admin-alert admin-alert--danger">{error}</div>}

      <div className="admin-detail-grid">
        <div className="admin-detail-main">
          <section className="admin-panel">
            <div className="admin-panel__head">
              <div>
                <p className="admin-eyebrow">Client</p>
                <h3>Coordonnées & livraison</h3>
              </div>
            </div>
            <div className="admin-info-grid">
              <div>
                <span>Client</span>
                <strong>{order.customer.name}</strong>
              </div>
              <div>
                <span>Téléphone</span>
                <a href={`tel:${order.customer.phone}`}>{order.customer.phone}</a>
              </div>
              <div>
                <span>E-mail</span>
                {order.customer.email ? <a href={`mailto:${order.customer.email}`}>{order.customer.email}</a> : <em>—</em>}
              </div>
              <div>
                <span>Ville / commune</span>
                <strong>{order.shippingAddress.city} · {order.shippingAddress.commune}</strong>
              </div>
              <div className="admin-info-grid__wide">
                <span>Adresse</span>
                <strong>{order.shippingAddress.address}</strong>
              </div>
              {order.shippingAddress.note && (
                <div className="admin-info-grid__wide">
                  <span>Note de livraison</span>
                  <strong>{order.shippingAddress.note}</strong>
                </div>
              )}
            </div>
          </section>

          <section className="admin-panel">
            <div className="admin-panel__head">
              <div>
                <p className="admin-eyebrow">Panier</p>
                <h3>Articles commandés</h3>
              </div>
            </div>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr><th>Produit</th><th>Référence</th><th className="admin-table__num">Qté</th><th className="admin-table__num">Prix</th><th className="admin-table__num">Total</th></tr>
                </thead>
                <tbody>
                  {order.items.map((item) => (
                    <tr key={item.id}>
                      <td><strong>{item.productName}</strong><small>{item.variantLabel}</small></td>
                      <td><code>{item.sku}</code></td>
                      <td className="admin-table__num">{item.quantity}</td>
                      <td className="admin-table__num">{formatPrice(item.unitPrice)}</td>
                      <td className="admin-table__num">{formatPrice(item.lineTotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="admin-totals">
              <div><span>Sous-total</span><strong>{formatPrice(order.subtotal)}</strong></div>
              <div><span>Livraison</span><strong>{order.deliveryFee === 0 ? 'Offerte' : formatPrice(order.deliveryFee)}</strong></div>
              <div className="admin-totals__grand"><span>Total</span><strong>{formatPrice(order.total)}</strong></div>
            </div>
          </section>

          <section className="admin-panel">
            <div className="admin-panel__head">
              <div>
                <p className="admin-eyebrow">Historique</p>
                <h3>Suivi de la commande</h3>
              </div>
            </div>
            <ol className="admin-timeline">
              {order.statusHistory.map((entry) => (
                <li key={entry.id}>
                  <span className="admin-timeline__dot" />
                  <div>
                    <strong>{STATUS_LABELS[entry.status] ?? entry.status}</strong>
                    <small>{formatDate(entry.createdAt)}</small>
                    {entry.note && <p>{entry.note}</p>}
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <aside className="admin-detail-aside">
          <section className="admin-panel admin-panel--sticky">
            <div className="admin-panel__head">
              <div>
                <p className="admin-eyebrow">Workflow</p>
                <h3>Statut</h3>
              </div>
            </div>
            {canChange ? (
              <>
                <label className="admin-field">
                  <span>Nouveau statut</span>
                  <select value={status} onChange={(event) => setStatus(event.target.value)}>
                    <option value={order.status}>{STATUS_LABELS[order.status]}</option>
                    {transitions.map((item) => (
                      <option key={item} value={item}>{STATUS_LABELS[item]}</option>
                    ))}
                  </select>
                </label>
                <label className="admin-field">
                  <span>Note (facultatif)</span>
                  <textarea value={note} onChange={(event) => setNote(event.target.value)} rows={3} placeholder="Ex. appelé, livraison demain" />
                </label>
                <button className="admin-btn admin-btn--primary" type="button" onClick={changeStatus} disabled={busy || status === order.status}>
                  {busy ? 'Mise à jour…' : 'Mettre à jour'}
                </button>
              </>
            ) : (
              <p className="admin-muted">Cette commande est à un état final.</p>
            )}

            <hr className="admin-hr" />

            <div className="admin-payment">
              <span>Paiement</span>
              <StatusBadge status={order.paymentStatus} kind="payment" />
            </div>
            <button className="admin-btn admin-btn--ghost" type="button" onClick={togglePaid} disabled={busy || order.status === 'CANCELLED'}>
              {order.paymentStatus === 'PAID' ? 'Remettre en attente' : 'Marquer comme payée'}
            </button>
          </section>
        </aside>
      </div>
    </div>
  );
}

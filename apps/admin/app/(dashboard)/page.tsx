'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { AdminLoading, PageState, StatusBadge } from '@/components/Ui';
import {
  formatDate,
  formatPrice,
  imageUrl,
  type AdminProduct,
  type OrderSummary,
  type Paginated,
} from '@/lib/api';

export default function DashboardPage() {
  const { api, user } = useAuth();
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [ordersTotal, setOrdersTotal] = useState(0);
  const [productsTotal, setProductsTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [ordersResult, productsResult] = await Promise.all([
          api<Paginated<OrderSummary>>('/api/v1/admin/orders?perPage=60'),
          api<Paginated<AdminProduct>>('/api/v1/admin/products?perPage=60'),
        ]);
        if (cancelled) return;
        setOrders(ordersResult.data);
        setOrdersTotal(ordersResult.meta.total);
        setProducts(productsResult.data);
        setProductsTotal(productsResult.meta.total);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Chargement impossible.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [api]);

  const stats = useMemo(() => {
    const pending = orders.filter((order) => order.status === 'PENDING').length;
    const delivered = orders.filter((order) => order.status === 'DELIVERED').length;
    const revenue = orders
      .filter((order) => !['CANCELLED', 'REFUNDED'].includes(order.status))
      .reduce((total, order) => total + order.total, 0);
    const lowStock = products
      .flatMap((product) =>
        product.variants
          .filter((variant) => variant.stockQuantity <= 5)
          .map((variant) => ({
            product,
            variant,
          })),
      )
      .sort((a, b) => a.variant.stockQuantity - b.variant.stockQuantity)
      .slice(0, 6);
    return { pending, delivered, revenue, lowStock };
  }, [orders, products]);

  if (loading) return <AdminLoading rows={6} />;
  if (error) return <PageState title="Impossible de charger le dashboard" tone="danger">{error}</PageState>;

  return (
    <div className="admin-page">
      <section className="admin-welcome">
        <div>
          <p className="admin-eyebrow">Bonjour {user?.firstName ?? 'Maison Forlife'}</p>
          <h2>
            La boutique en un <em>regard.</em>
          </h2>
          <p>Suivez les commandes du jour, les paiements et les stocks qui demandent votre attention.</p>
        </div>
        <Link className="admin-btn admin-btn--primary" href="/produits/nouveau">
          + Nouveau produit
        </Link>
      </section>

      <section className="admin-metrics">
        <article className="admin-metric">
          <span className="admin-metric__label">Commandes</span>
          <strong>{ordersTotal}</strong>
          <span className="admin-metric__hint">{stats.pending} en attente de confirmation</span>
        </article>
        <article className="admin-metric admin-metric--dark">
          <span className="admin-metric__label">Chiffre d’affaires</span>
          <strong>{formatPrice(stats.revenue)}</strong>
          <span className="admin-metric__hint">Hors annulées · 100 dernières commandes</span>
        </article>
        <article className="admin-metric">
          <span className="admin-metric__label">Produits</span>
          <strong>{productsTotal}</strong>
          <span className="admin-metric__hint">{stats.lowStock.length} alertes stock</span>
        </article>
        <article className="admin-metric">
          <span className="admin-metric__label">Livrées</span>
          <strong>{stats.delivered}</strong>
          <span className="admin-metric__hint">Sur les 100 dernières commandes</span>
        </article>
      </section>

      <div className="admin-dashboard-grid">
        <section className="admin-panel">
          <div className="admin-panel__head">
            <div>
              <p className="admin-eyebrow">Ventes</p>
              <h3>Dernières commandes</h3>
            </div>
            <Link href="/commandes">Tout voir →</Link>
          </div>
          {orders.length === 0 ? (
            <div className="admin-empty">
              <strong>Aucune commande pour le moment.</strong>
              <p>Les commandes apparaîtront ici dès le premier checkout.</p>
            </div>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Commande</th>
                    <th>Client</th>
                    <th>Statut</th>
                    <th className="admin-table__num">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.slice(0, 7).map((order) => (
                    <tr key={order.id}>
                      <td>
                        <Link className="admin-order-link" href={`/commandes/${order.id}`}>
                          {order.orderNumber}
                        </Link>
                        <small>{formatDate(order.createdAt)}</small>
                      </td>
                      <td>
                        <strong>{order.customerName}</strong>
                        <small>{order.customerPhone}</small>
                      </td>
                      <td><StatusBadge status={order.status} /></td>
                      <td className="admin-table__num">{formatPrice(order.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="admin-panel">
          <div className="admin-panel__head">
            <div>
              <p className="admin-eyebrow">Inventaire</p>
              <h3>Stocks à surveiller</h3>
            </div>
            <Link href="/stocks">Gérer →</Link>
          </div>
          {stats.lowStock.length === 0 ? (
            <div className="admin-empty">
              <strong>Tous les stocks sont confortables.</strong>
            </div>
          ) : (
            <ul className="admin-low-stock">
              {stats.lowStock.map(({ product, variant }) => {
                const image = imageUrl(product.image);
                return (
                  <li key={variant.id}>
                    <Link href={`/produits/${product.id}`}>
                      {image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={image} alt="" width={44} height={44} />
                      ) : (
                        <span className="admin-thumb-placeholder">MF</span>
                      )}
                      <span>
                        <strong>{product.name}</strong>
                        <em>{[variant.color, variant.storage].filter(Boolean).join(' · ') || variant.id}</em>
                      </span>
                      <b className={variant.stockQuantity === 0 ? 'is-out' : undefined}>
                        {variant.stockQuantity}
                      </b>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

'use client';

import Link from 'next/link';
import { useEffect, useState, type FormEvent } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { AdminLoading, EmptyState, PageState, Pagination, StatusBadge } from '@/components/Ui';
import {
  STATUS_LABELS,
  fetchOrders,
  formatDate,
  formatPrice,
  type OrderSummary,
  type Paginated,
} from '@/lib/api';

export default function OrdersPage() {
  const { token } = useAuth();
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [meta, setMeta] = useState({ page: 1, perPage: 20, total: 0, totalPages: 1 });
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [term, setTerm] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError('');
      try {
        const result = await fetchOrders(token as string, {
          page,
          perPage: 20,
          status: status || undefined,
          search: term || undefined,
        });
        if (cancelled) return;
        setOrders(result.data);
        setMeta(result.meta);
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
  }, [token, page, status, term]);

  function submitSearch(event: FormEvent) {
    event.preventDefault();
    setPage(1);
    setTerm(search.trim());
  }

  return (
    <div className="admin-page">
      <section className="admin-page-head">
        <div>
          <p className="admin-eyebrow">Ventes</p>
          <h2>
            Toutes les <em>commandes.</em>
          </h2>
          <p>{meta.total} commande{meta.total > 1 ? 's' : ''} enregistrée{meta.total > 1 ? 's' : ''}.</p>
        </div>
      </section>

      <section className="admin-toolbar">
        <form className="admin-search" onSubmit={submitSearch}>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="N° commande, client ou téléphone…"
            aria-label="Rechercher une commande"
          />
          <button className="admin-btn admin-btn--dark" type="submit">Rechercher</button>
        </form>
        <select
          className="admin-select"
          value={status}
          onChange={(event) => {
            setStatus(event.target.value);
            setPage(1);
          }}
          aria-label="Filtrer par statut"
        >
          <option value="">Tous les statuts</option>
          {Object.entries(STATUS_LABELS)
            .filter(([key]) => !['PAID'].includes(key))
            .map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
        </select>
      </section>

      {error && <PageState title="Impossible de charger les commandes" tone="danger">{error}</PageState>}
      {loading ? (
        <AdminLoading rows={5} />
      ) : orders.length === 0 ? (
        <EmptyState title="Aucune commande ne correspond.">
          Modifiez la recherche ou le filtre de statut.
        </EmptyState>
      ) : (
        <section className="admin-panel">
          <div className="admin-table-wrap">
            <table className="admin-table admin-table--orders">
              <thead>
                <tr>
                  <th>Commande</th>
                  <th>Client</th>
                  <th>Articles</th>
                  <th>Paiement</th>
                  <th>Statut</th>
                  <th className="admin-table__num">Total</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
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
                    <td>
                      <span className="admin-count">{order.itemsCount}</span>
                      <small>{order.itemsPreview.slice(0, 2).join(' · ')}</small>
                    </td>
                    <td><StatusBadge status={order.paymentStatus} kind="payment" /></td>
                    <td><StatusBadge status={order.status} /></td>
                    <td className="admin-table__num">{formatPrice(order.total)}</td>
                    <td className="admin-table__action">
                      <Link className="admin-link-arrow" href={`/commandes/${order.id}`}>Ouvrir →</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={meta.page} totalPages={meta.totalPages} onChange={setPage} />
        </section>
      )}
    </div>
  );
}

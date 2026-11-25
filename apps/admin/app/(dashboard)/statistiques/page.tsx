'use client';

import { useEffect, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useAuth } from '@/components/AuthProvider';
import { AdminLoading, PageState } from '@/components/Ui';
import { fetchAnalytics, formatPrice, type AnalyticsData, STATUS_LABELS } from '@/lib/api';

const STATUS_COLORS: Record<string, string> = {
  PENDING: '#b98a2e',
  CONFIRMED: '#4f739b',
  PREPARING: '#7a5f8c',
  SHIPPED: '#3f7ca0',
  DELIVERED: '#4f8466',
  CANCELLED: '#a34d4d',
  REFUNDED: '#8e877b',
};

export default function StatisticsPage() {
  const { token } = useAuth();
  const [days, setDays] = useState(30);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setLoading(true);
    fetchAnalytics(token, days)
      .then((result) => {
        if (!cancelled) setData(result.data);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Chargement impossible.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token, days]);

  if (loading) return <AdminLoading rows={5} />;
  if (!data) return <PageState title="Statistiques indisponibles" tone="danger">{error}</PageState>;

  const chartData = data.revenueByDay.map((item) => ({
    ...item,
    label: new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short' }).format(
      new Date(`${item.date}T12:00:00Z`),
    ),
  }));
  const statusData = data.ordersByStatus
    .filter((item) => item.count > 0)
    .map((item) => ({ ...item, label: STATUS_LABELS[item.status] ?? item.status }));
  const topMax = Math.max(...data.topProducts.map((item) => item.quantity), 1);

  return (
    <div className="admin-page">
      <section className="admin-page-head admin-page-head--row">
        <div>
          <p className="admin-eyebrow">Pilotage</p>
          <h2>
            La maison en <em>chiffres.</em>
          </h2>
          <p>Ventes, commandes et produits sur les {days} derniers jours.</p>
        </div>
        <select
          className="admin-select"
          value={days}
          onChange={(event) => setDays(Number(event.target.value))}
          aria-label="Période des statistiques"
        >
          <option value={7}>7 derniers jours</option>
          <option value={30}>30 derniers jours</option>
          <option value={90}>90 derniers jours</option>
        </select>
      </section>

      <section className="admin-metrics">
        <article className="admin-metric admin-metric--dark">
          <span className="admin-metric__label">Chiffre d’affaires</span>
          <strong>{formatPrice(data.summary.revenue)}</strong>
          <span className="admin-metric__hint">Hors commandes annulées / remboursées</span>
        </article>
        <article className="admin-metric">
          <span className="admin-metric__label">Commandes</span>
          <strong>{data.summary.orders}</strong>
          <span className="admin-metric__hint">{data.summary.pending} en attente</span>
        </article>
        <article className="admin-metric">
          <span className="admin-metric__label">Panier moyen</span>
          <strong>{formatPrice(data.summary.averageOrderValue)}</strong>
          <span className="admin-metric__hint">Sur les commandes valides</span>
        </article>
        <article className="admin-metric">
          <span className="admin-metric__label">Livrées</span>
          <strong>{data.summary.delivered}</strong>
          <span className="admin-metric__hint">{data.summary.cancelled} annulée(s)</span>
        </article>
      </section>

      <div className="admin-analytics-grid">
        <section className="admin-panel admin-chart-panel admin-chart-panel--wide">
          <div className="admin-panel__head">
            <div><p className="admin-eyebrow">Tendance</p><h3>Chiffre d’affaires par jour</h3></div>
            <span className="admin-chart-legend"><i /> USD</span>
          </div>
          <div className="admin-chart">
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="mf-revenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#111111" stopOpacity={0.22} />
                    <stop offset="100%" stopColor="#111111" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(17,17,17,0.08)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#8c867b' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 10, fill: '#8c867b' }} axisLine={false} tickLine={false} />
                <Tooltip
                  formatter={(value) => [formatPrice(Number(value)), 'CA']}
                  contentStyle={{ border: '1px solid rgba(17,17,17,0.12)', borderRadius: 8, fontSize: 12 }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#111111" strokeWidth={1.8} fill="url(#mf-revenue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="admin-panel admin-chart-panel">
          <div className="admin-panel__head">
            <div><p className="admin-eyebrow">Pipeline</p><h3>Commandes par statut</h3></div>
          </div>
          <div className="admin-chart">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={statusData} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
                <CartesianGrid stroke="rgba(17,17,17,0.08)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 9, fill: '#8c867b' }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#8c867b' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ border: '1px solid rgba(17,17,17,0.12)', borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {statusData.map((item) => (
                    <Cell key={item.status} fill={STATUS_COLORS[item.status] ?? '#111111'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="admin-panel admin-chart-panel">
          <div className="admin-panel__head">
            <div><p className="admin-eyebrow">Best-sellers</p><h3>Produits les plus vendus</h3></div>
          </div>
          {data.topProducts.length === 0 ? (
            <div className="admin-empty"><strong>Aucune vente sur la période.</strong></div>
          ) : (
            <ul className="admin-top-products">
              {data.topProducts.map((item, index) => (
                <li key={item.name}>
                  <span className="admin-top-products__rank">{String(index + 1).padStart(2, '0')}</span>
                  <span className="admin-top-products__body">
                    <span><strong>{item.name}</strong><em>{formatPrice(item.revenue)}</em></span>
                    <span className="admin-top-products__bar">
                      <i style={{ width: `${Math.max(6, (item.quantity / topMax) * 100)}%` }} />
                    </span>
                  </span>
                  <b>{item.quantity}</b>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

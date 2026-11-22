'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { AdminLoading, PageState } from '@/components/Ui';
import { fetchProducts, imageUrl, type AdminProduct } from '@/lib/api';

interface StockLine {
  product: AdminProduct;
  variantId: string;
  label: string;
  stock: number;
}

export default function StocksPage() {
  const { token } = useAuth();
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'low' | 'all'>('low');

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    async function load() {
      try {
        const result = await fetchProducts(token as string, { perPage: 60 });
        if (!cancelled) setProducts(result.data);
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
  }, [token]);

  const lines = useMemo<StockLine[]>(
    () =>
      products
        .flatMap((product) =>
          product.variants.map((variant) => ({
            product,
            variantId: variant.id,
            label: [variant.color, variant.storage].filter(Boolean).join(' · ') || 'Standard',
            stock: variant.stockQuantity,
          })),
        )
        .sort((a, b) => a.stock - b.stock),
    [products],
  );

  const visible = filter === 'low' ? lines.filter((line) => line.stock <= 10) : lines;
  const outOfStock = lines.filter((line) => line.stock === 0).length;
  const lowStock = lines.filter((line) => line.stock > 0 && line.stock <= 5).length;

  if (loading) return <AdminLoading rows={6} />;
  if (error) return <PageState title="Impossible de charger les stocks" tone="danger">{error}</PageState>;

  return (
    <div className="admin-page">
      <section className="admin-page-head">
        <div>
          <p className="admin-eyebrow">Inventaire</p>
          <h2>
            Ce qui reste <em>en rayon.</em>
          </h2>
          <p>Les variantes sont ajustées depuis la fiche produit.</p>
        </div>
      </section>

      <section className="admin-metrics admin-metrics--compact">
        <article className="admin-metric"><span className="admin-metric__label">Références</span><strong>{lines.length}</strong></article>
        <article className="admin-metric"><span className="admin-metric__label">Ruptures</span><strong>{outOfStock}</strong></article>
        <article className="admin-metric"><span className="admin-metric__label">Stock faible</span><strong>{lowStock}</strong></article>
      </section>

      <section className="admin-toolbar admin-toolbar--right">
        <div className="admin-tabs">
          <button type="button" className={filter === 'low' ? 'is-active' : undefined} onClick={() => setFilter('low')}>À surveiller</button>
          <button type="button" className={filter === 'all' ? 'is-active' : undefined} onClick={() => setFilter('all')}>Toutes les variantes</button>
        </div>
      </section>

      <section className="admin-panel">
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr><th>Produit</th><th>Variante</th><th className="admin-table__num">Stock</th><th>État</th><th /></tr>
            </thead>
            <tbody>
              {visible.map((line) => {
                const image = imageUrl(line.product.image);
                return (
                  <tr key={line.variantId}>
                    <td>
                      <div className="admin-product-cell">
                        {image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={image} alt="" width={44} height={44} />
                        ) : (
                          <span className="admin-thumb-placeholder">MF</span>
                        )}
                        <span><strong>{line.product.name}</strong><small>{line.product.brand.name}</small></span>
                      </div>
                    </td>
                    <td>{line.label}</td>
                    <td className="admin-table__num"><strong>{line.stock}</strong></td>
                    <td>
                      <span className={line.stock === 0 ? 'admin-stock admin-stock--out' : line.stock <= 5 ? 'admin-stock admin-stock--low' : 'admin-stock'}>
                        {line.stock === 0 ? 'Rupture' : line.stock <= 5 ? 'Stock faible' : 'Disponible'}
                      </span>
                    </td>
                    <td className="admin-table__action">
                      <Link className="admin-link-arrow" href={`/produits/${line.product.id}`}>Ajuster →</Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {visible.length === 0 && <div className="admin-empty"><strong>Aucun stock à surveiller.</strong></div>}
      </section>
    </div>
  );
}

'use client';

import Link from 'next/link';
import { useEffect, useState, type FormEvent } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { AdminLoading, EmptyState, PageState, Pagination } from '@/components/Ui';
import {
  fetchProducts,
  formatPrice,
  imageUrl,
  type AdminProduct,
  type Paginated,
} from '@/lib/api';

const PRODUCT_STATUS: Record<string, string> = {
  ACTIVE: 'En ligne',
  DRAFT: 'Brouillon',
  ARCHIVED: 'Archivé',
};

export default function ProductsPage() {
  const { token } = useAuth();
  const [products, setProducts] = useState<AdminProduct[]>([]);
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
        const result = await fetchProducts(token as string, {
          page,
          perPage: 20,
          status: status || undefined,
          search: term || undefined,
        });
        if (cancelled) return;
        setProducts(result.data);
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
      <section className="admin-page-head admin-page-head--row">
        <div>
          <p className="admin-eyebrow">Catalogue</p>
          <h2>
            Les produits de <em>la maison.</em>
          </h2>
          <p>{meta.total} produit{meta.total > 1 ? 's' : ''} au catalogue.</p>
        </div>
        <Link className="admin-btn admin-btn--primary" href="/produits/nouveau">+ Nouveau produit</Link>
      </section>

      <section className="admin-toolbar">
        <form className="admin-search" onSubmit={submitSearch}>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Nom, marque, série…"
            aria-label="Rechercher un produit"
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
          <option value="ACTIVE">En ligne</option>
          <option value="DRAFT">Brouillon</option>
          <option value="ARCHIVED">Archivé</option>
        </select>
      </section>

      {error && <PageState title="Impossible de charger les produits" tone="danger">{error}</PageState>}
      {loading ? (
        <AdminLoading rows={5} />
      ) : products.length === 0 ? (
        <EmptyState title="Aucun produit ne correspond.">Modifiez la recherche ou le filtre.</EmptyState>
      ) : (
        <section className="admin-panel">
          <div className="admin-table-wrap">
            <table className="admin-table admin-table--products">
              <thead>
                <tr>
                  <th>Produit</th>
                  <th>Catégorie</th>
                  <th className="admin-table__num">Prix</th>
                  <th className="admin-table__num">Stock</th>
                  <th>Statut</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {products.map((product) => {
                  const image = imageUrl(product.image);
                  return (
                    <tr key={product.id}>
                      <td>
                        <div className="admin-product-cell">
                          {image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={image} alt="" width={52} height={52} />
                          ) : (
                            <span className="admin-thumb-placeholder">MF</span>
                          )}
                          <span>
                            <strong>{product.name}</strong>
                            <small>{product.brand.name} · {product.subtitle ?? product.series}</small>
                          </span>
                        </div>
                      </td>
                      <td>{product.category.name}</td>
                      <td className="admin-table__num">{formatPrice(product.price)}</td>
                      <td className="admin-table__num">
                        <span className={product.stock === 0 ? 'admin-stock admin-stock--out' : product.stock <= 5 ? 'admin-stock admin-stock--low' : 'admin-stock'}>
                          {product.stock}
                        </span>
                      </td>
                      <td>
                        <span className={`product-status product-status--${product.status.toLowerCase()}`}>
                          {PRODUCT_STATUS[product.status] ?? product.status}
                        </span>
                      </td>
                      <td className="admin-table__action">
                        <Link className="admin-link-arrow" href={`/produits/${product.id}`}>Modifier →</Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pagination page={meta.page} totalPages={meta.totalPages} onChange={setPage} />
        </section>
      )}
    </div>
  );
}

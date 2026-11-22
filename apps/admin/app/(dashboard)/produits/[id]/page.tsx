'use client';

import Link from 'next/link';
import { useEffect, useState, type FormEvent } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { AdminLoading, PageState } from '@/components/Ui';
import {
  adjustStock,
  fetchBrands,
  fetchCategories,
  fetchProduct,
  formatPrice,
  imageUrl,
  updateProduct,
  type BrandOption,
  type CategoryOption,
  type ProductDetailAdmin,
} from '@/lib/api';
import { ArrowLeftIcon } from '@/components/Icons';

interface ProductForm {
  name: string;
  subtitle: string;
  series: string;
  badge: string;
  description: string;
  price: string;
  compareAtPrice: string;
  status: string;
  isFeatured: boolean;
  categoryId: string;
  brandId: string;
}

const emptyForm: ProductForm = {
  name: '',
  subtitle: '',
  series: '',
  badge: '',
  description: '',
  price: '',
  compareAtPrice: '',
  status: 'DRAFT',
  isFeatured: false,
  categoryId: '',
  brandId: '',
};

export default function ProductEditPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { token, api } = useAuth();
  const [product, setProduct] = useState<ProductDetailAdmin | null>(null);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [brands, setBrands] = useState<BrandOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [stockDeltas, setStockDeltas] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!token || !params.id) return;
    let cancelled = false;

    async function load() {
      try {
        const [productResult, categoriesResult, brandsResult] = await Promise.all([
          fetchProduct(token as string, params.id),
          api<{ data: CategoryOption[] }>('/api/v1/categories'),
          fetchBrands(token as string),
        ]);
        if (cancelled) return;
        setProduct(productResult.data);
        const item = productResult.data;
        setForm({
          name: item.name,
          subtitle: item.subtitle ?? '',
          series: item.series ?? '',
          badge: item.badge ?? '',
          description: item.description ?? '',
          price: String(item.price),
          compareAtPrice: item.compareAtPrice ? String(item.compareAtPrice) : '',
          status: item.status,
          isFeatured: item.featured,
          categoryId: item.category.id,
          brandId: item.brand.id,
        });
        setCategories(categoriesResult.data);
        setBrands(brandsResult.data);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Produit introuvable.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [token, params.id, api]);

  function update<K extends keyof ProductForm>(key: K, value: ProductForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!product || !token) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const result = await updateProduct(token, product.id, {
        name: form.name,
        subtitle: form.subtitle || null,
        series: form.series || null,
        badge: form.badge || null,
        description: form.description || null,
        price: Number(form.price),
        compareAtPrice: form.compareAtPrice ? Number(form.compareAtPrice) : null,
        status: form.status,
        isFeatured: form.isFeatured,
        categoryId: form.categoryId,
        brandId: form.brandId,
      });
      setProduct(result.data);
      setMessage('Produit enregistré.');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Enregistrement impossible.');
    } finally {
      setBusy(false);
    }
  }

  async function adjust(variantId: string) {
    if (!token) return;
    const delta = Number(stockDeltas[variantId] ?? '');
    if (!Number.isInteger(delta) || delta === 0) {
      setError('Indiquez une quantité entière non nulle.');
      return;
    }
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const result = await adjustStock(token, variantId, delta, 'ADJUSTMENT', 'Ajustement back-office');
      setProduct((current) =>
        current
          ? {
              ...current,
              variants: current.variants.map((variant) =>
                variant.id === variantId
                  ? { ...variant, stockQuantity: result.data.stockQuantity }
                  : variant,
              ),
            }
          : current,
      );
      setStockDeltas((current) => ({ ...current, [variantId]: '' }));
      setMessage('Stock ajusté.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ajustement impossible.');
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <AdminLoading rows={6} />;
  if (!product) return <PageState title="Produit introuvable" tone="danger">{error}</PageState>;

  const image = imageUrl(product.image);

  return (
    <div className="admin-page">
      <Link className="admin-back" href="/produits"><ArrowLeftIcon /> Tous les produits</Link>

      <section className="admin-detail-head">
        <div className="admin-product-title">
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={image} alt="" width={72} height={72} />
          ) : (
            <span className="admin-thumb-placeholder">MF</span>
          )}
          <div>
            <p className="admin-eyebrow">{product.brand.name} · {product.category.name}</p>
            <h2>{product.name}</h2>
            <p>{product.slug} · {product.stock} en stock</p>
          </div>
        </div>
        <Link className="admin-btn admin-btn--ghost" href={`https://mf-business-platform.vercel.app/produit/${product.slug}`} target="_blank" rel="noopener">
          Voir la fiche ↗
        </Link>
      </section>

      {message && <div className="admin-alert admin-alert--success">{message}</div>}
      {error && <div className="admin-alert admin-alert--danger">{error}</div>}

      <div className="admin-detail-grid">
        <form className="admin-panel admin-form" onSubmit={save}>
          <div className="admin-panel__head">
            <div>
              <p className="admin-eyebrow">Fiche produit</p>
              <h3>Informations générales</h3>
            </div>
          </div>
          <div className="admin-form-grid">
            <label className="admin-field admin-field--wide">
              <span>Nom du produit</span>
              <input value={form.name} onChange={(event) => update('name', event.target.value)} required />
            </label>
            <label className="admin-field">
              <span>Marque</span>
              <select value={form.brandId} onChange={(event) => update('brandId', event.target.value)}>
                {brands.map((brand) => <option key={brand.id} value={brand.id}>{brand.name}</option>)}
              </select>
            </label>
            <label className="admin-field">
              <span>Catégorie</span>
              <select value={form.categoryId} onChange={(event) => update('categoryId', event.target.value)}>
                {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
              </select>
            </label>
            <label className="admin-field">
              <span>Prix (USD)</span>
              <input type="number" min="1" step="0.01" value={form.price} onChange={(event) => update('price', event.target.value)} required />
            </label>
            <label className="admin-field">
              <span>Prix barré (facultatif)</span>
              <input type="number" min="0" step="0.01" value={form.compareAtPrice} onChange={(event) => update('compareAtPrice', event.target.value)} />
            </label>
            <label className="admin-field">
              <span>Statut</span>
              <select value={form.status} onChange={(event) => update('status', event.target.value)}>
                <option value="DRAFT">Brouillon</option>
                <option value="ACTIVE">En ligne</option>
                <option value="ARCHIVED">Archivé</option>
              </select>
            </label>
            <label className="admin-field admin-field--check">
              <input type="checkbox" checked={form.isFeatured} onChange={(event) => update('isFeatured', event.target.checked)} />
              <span>Mettre en avant sur l’accueil</span>
            </label>
            <label className="admin-field admin-field--wide">
              <span>Sous-titre</span>
              <input value={form.subtitle} onChange={(event) => update('subtitle', event.target.value)} placeholder="256 Go · Black" />
            </label>
            <label className="admin-field">
              <span>Série</span>
              <input value={form.series} onChange={(event) => update('series', event.target.value)} />
            </label>
            <label className="admin-field">
              <span>Badge</span>
              <input value={form.badge} onChange={(event) => update('badge', event.target.value)} placeholder="Nouveau, Coup de cœur…" />
            </label>
            <label className="admin-field admin-field--wide">
              <span>Description</span>
              <textarea rows={6} value={form.description} onChange={(event) => update('description', event.target.value)} />
            </label>
          </div>
          <button className="admin-btn admin-btn--primary" type="submit" disabled={busy}>
            {busy ? 'Enregistrement…' : 'Enregistrer les modifications'}
          </button>
        </form>

        <aside className="admin-detail-aside">
          <section className="admin-panel">
            <div className="admin-panel__head">
              <div>
                <p className="admin-eyebrow">Inventaire</p>
                <h3>Variantes & stock</h3>
              </div>
            </div>
            <div className="admin-variants">
              {product.variants.map((variant) => (
                <div className="admin-variant" key={variant.id}>
                  <div>
                    <strong>{[variant.color, variant.storage].filter(Boolean).join(' · ') || variant.id}</strong>
                    <span className={variant.stockQuantity <= 5 ? 'admin-stock admin-stock--low' : 'admin-stock'}>
                      {variant.stockQuantity} en stock
                    </span>
                  </div>
                  <div className="admin-variant__adjust">
                    <input
                      type="number"
                      step="1"
                      placeholder="+/-"
                      value={stockDeltas[variant.id] ?? ''}
                      onChange={(event) => setStockDeltas((current) => ({ ...current, [variant.id]: event.target.value }))}
                      aria-label={`Ajustement de stock pour ${variant.color ?? variant.id}`}
                    />
                    <button className="admin-btn admin-btn--dark admin-btn--sm" type="button" onClick={() => adjust(variant.id)} disabled={busy}>
                      Ajuster
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <p className="admin-muted admin-variant__hint">
              Saisissez +10 pour un réapprovisionnement, -2 pour une correction.
            </p>
          </section>

          <section className="admin-panel admin-meta">
            <h3>Informations</h3>
            <dl>
              <div><dt>Images</dt><dd>{product.images.length}</dd></div>
              <div><dt>Note</dt><dd>{product.rating.toFixed(1)} ({product.reviews})</dd></div>
              <div><dt>Prix actuel</dt><dd>{formatPrice(product.price)}</dd></div>
            </dl>
          </section>
        </aside>
      </div>
    </div>
  );
}

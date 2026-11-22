'use client';

import Link from 'next/link';
import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { PageState } from '@/components/Ui';
import {
  createProduct,
  fetchBrands,
  fetchCategories,
  type BrandOption,
  type CategoryOption,
} from '@/lib/api';
import { ArrowLeftIcon } from '@/components/Icons';

export default function NewProductPage() {
  const router = useRouter();
  const { api, token } = useAuth();
  const [brands, setBrands] = useState<BrandOption[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '',
    slug: '',
    brandId: '',
    categoryId: '',
    price: '',
    compareAtPrice: '',
    subtitle: '',
    series: '',
    description: '',
    stock: '0',
    color: '',
    status: 'DRAFT',
    isFeatured: false,
  });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [categoriesResult, brandsResult] = await Promise.all([
          api<{ data: CategoryOption[] }>('/api/v1/categories'),
          fetchBrands(token as string),
        ]);
        if (cancelled) return;
        setCategories(categoriesResult.data);
        setBrands(brandsResult.data);
        setForm((current) => ({
          ...current,
          categoryId: categoriesResult.data[0]?.id ?? '',
          brandId: brandsResult.data[0]?.id ?? '',
        }));
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Chargement impossible.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    if (token) void load();
    return () => {
      cancelled = true;
    };
  }, [api, token]);

  function update(key: keyof typeof form, value: string | boolean) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!token) return;
    setBusy(true);
    setError('');
    try {
      const result = await createProduct(token, {
        name: form.name,
        slug: form.slug,
        brandId: form.brandId,
        categoryId: form.categoryId,
        price: Number(form.price),
        ...(form.compareAtPrice ? { compareAtPrice: Number(form.compareAtPrice) } : {}),
        ...(form.subtitle ? { subtitle: form.subtitle } : {}),
        ...(form.series ? { series: form.series } : {}),
        ...(form.description ? { description: form.description } : {}),
        stock: Number(form.stock),
        ...(form.color ? { color: form.color } : {}),
        status: form.status,
        isFeatured: form.isFeatured,
      });
      router.replace(`/produits/${result.data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Création impossible.');
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <PageState title="Chargement des références…" />;

  return (
    <div className="admin-page">
      <Link className="admin-back" href="/produits"><ArrowLeftIcon /> Tous les produits</Link>
      <section className="admin-page-head">
        <div>
          <p className="admin-eyebrow">Catalogue</p>
          <h2>Un nouveau produit <em>dans la maison.</em></h2>
          <p>Il sera créé en brouillon si vous ne le publiez pas tout de suite.</p>
        </div>
      </section>

      {error && <div className="admin-alert admin-alert--danger">{error}</div>}

      <form className="admin-panel admin-form" onSubmit={save}>
        <div className="admin-form-grid">
          <label className="admin-field admin-field--wide">
            <span>Nom du produit *</span>
            <input value={form.name} onChange={(event) => update('name', event.target.value)} required />
          </label>
          <label className="admin-field">
            <span>Slug *</span>
            <input value={form.slug} onChange={(event) => update('slug', event.target.value)} placeholder="iphone-15" required />
          </label>
          <label className="admin-field">
            <span>Marque *</span>
            <select value={form.brandId} onChange={(event) => update('brandId', event.target.value)} required>
              {brands.map((brand) => <option key={brand.id} value={brand.id}>{brand.name}</option>)}
            </select>
          </label>
          <label className="admin-field">
            <span>Catégorie *</span>
            <select value={form.categoryId} onChange={(event) => update('categoryId', event.target.value)} required>
              {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </select>
          </label>
          <label className="admin-field">
            <span>Prix (USD) *</span>
            <input type="number" min="1" step="0.01" value={form.price} onChange={(event) => update('price', event.target.value)} required />
          </label>
          <label className="admin-field">
            <span>Prix barré</span>
            <input type="number" min="0" step="0.01" value={form.compareAtPrice} onChange={(event) => update('compareAtPrice', event.target.value)} />
          </label>
          <label className="admin-field">
            <span>Stock initial</span>
            <input type="number" min="0" step="1" value={form.stock} onChange={(event) => update('stock', event.target.value)} />
          </label>
          <label className="admin-field">
            <span>Coloris</span>
            <input value={form.color} onChange={(event) => update('color', event.target.value)} placeholder="Black" />
          </label>
          <label className="admin-field">
            <span>Statut</span>
            <select value={form.status} onChange={(event) => update('status', event.target.value)}>
              <option value="DRAFT">Brouillon</option>
              <option value="ACTIVE">En ligne</option>
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
          <label className="admin-field admin-field--wide">
            <span>Description</span>
            <textarea rows={5} value={form.description} onChange={(event) => update('description', event.target.value)} />
          </label>
        </div>
        <button className="admin-btn admin-btn--primary" type="submit" disabled={busy}>
          {busy ? 'Création…' : 'Créer le produit'}
        </button>
      </form>
    </div>
  );
}

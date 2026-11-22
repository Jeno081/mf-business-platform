import type { Metadata } from 'next';
import Link from 'next/link';
import { Filters } from '@/components/Filters';
import { ProductCard } from '@/components/ProductCard';
import { SearchIcon } from '@/components/Icons';
import {
  getBrands,
  getCategories,
  getProducts,
  type ProductQuery,
} from '@/lib/api';

export const metadata: Metadata = {
  title: 'Catalogue — MF Business',
  description:
    'Tous les smartphones, tablettes, produits audio et accessoires MF Business. Recherche, filtres et prix en USD.',
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const SORT_OPTIONS = [
  ['rating', 'Mieux notés'],
  ['newest', 'Nouveautés'],
  ['price-asc', 'Prix croissant'],
  ['price-desc', 'Prix décroissant'],
  ['name', 'Nom A–Z'],
] as const;

const PRICE_RANGES = [
  { label: 'Moins de 100 $', min: undefined, max: 100 },
  { label: '100 – 300 $', min: 100, max: 300 },
  { label: '300 – 600 $', min: 300, max: 600 },
  { label: '600 – 1 000 $', min: 600, max: 1000 },
  { label: 'Plus de 1 000 $', min: 1000, max: undefined },
];

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function cleanNumber(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

function buildHref(
  current: Record<string, string | number | boolean | undefined>,
  overrides: Record<string, string | number | boolean | undefined> = {},
): string {
  const params = new URLSearchParams();
  const merged = { ...current, ...overrides };
  for (const [key, value] of Object.entries(merged)) {
    if (value === undefined || value === '' || value === false) continue;
    params.set(key, String(value));
  }
  const query = params.toString();
  return query ? `/catalogue?${query}` : '/catalogue';
}

export default async function CataloguePage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const page = Math.max(1, Number(first(params.page)) || 1);
  const perPage = 24;
  const search = first(params.search)?.trim() || undefined;
  const category = first(params.category) || undefined;
  const brand = first(params.brand) || undefined;
  const sort = (first(params.sort) as ProductQuery['sort']) || 'rating';
  const minPrice = cleanNumber(first(params.minPrice));
  const maxPrice = cleanNumber(first(params.maxPrice));
  const inStock = first(params.inStock) === 'true';

  const query: ProductQuery = {
    page,
    perPage,
    search,
    category,
    brand,
    sort,
    minPrice,
    maxPrice,
    inStock,
  };

  const [products, categories, brands] = await Promise.all([
    getProducts(query),
    getCategories(),
    getBrands(),
  ]);

  const current = {
    search,
    category,
    brand,
    minPrice,
    maxPrice,
    sort,
    inStock,
  };

  const activeFilters = [
    search && { label: `« ${search} »`, href: buildHref(current, { search: undefined, page: 1 }) },
    category && {
      label: categories.find((item) => item.slug === category)?.name ?? category,
      href: buildHref(current, { category: undefined, page: 1 }),
    },
    brand && {
      label: brands.find((item) => item.slug === brand)?.name ?? brand,
      href: buildHref(current, { brand: undefined, page: 1 }),
    },
    minPrice !== undefined && {
      label: `À partir de ${minPrice} $`,
      href: buildHref(current, { minPrice: undefined, page: 1 }),
    },
    maxPrice !== undefined && {
      label: `Jusqu’à ${maxPrice} $`,
      href: buildHref(current, { maxPrice: undefined, page: 1 }),
    },
    inStock && { label: 'En stock', href: buildHref(current, { inStock: undefined, page: 1 }) },
  ].filter(Boolean) as { label: string; href: string }[];

  return (
    <main className="catalogue-page">
      <section className="catalogue-hero">
        <div className="container">
          <nav className="breadcrumb" aria-label="Fil d’Ariane">
            <Link href="/">Accueil</Link>
            <span aria-hidden="true">/</span>
            <span>Catalogue</span>
          </nav>
          <p className="eyebrow">Le catalogue</p>
          <h1 className="display">
            Trouvez votre <em>prochain compagnon.</em>
          </h1>
          <p className="catalogue-hero__lead">
            {products.meta.total} références, quatre univers, un seul objectif : le bon appareil, au
            bon prix, avec la garantie et le conseil qui vont avec.
          </p>
        </div>
      </section>

      <section className="container catalogue-layout">
        <Filters activeCount={activeFilters.length}>
          <div className="filters__body">
            <div className="filter-group">
              <div className="filter-group__head">
                <h2>Catégories</h2>
                {category && (
                  <Link href={buildHref(current, { category: undefined, page: 1 })}>Tout</Link>
                )}
              </div>
              <ul className="filter-list">
                <li>
                  <Link
                    className={!category ? 'is-active' : undefined}
                    href={buildHref(current, { category: undefined, page: 1 })}
                  >
                    <span>Toutes les catégories</span>
                    <em>{categories.reduce((total, item) => total + item.productCount, 0)}</em>
                  </Link>
                </li>
                {categories.map((item) => (
                  <li key={item.id}>
                    <Link
                      className={category === item.slug ? 'is-active' : undefined}
                      href={buildHref(current, { category: item.slug, page: 1 })}
                    >
                      <span>{item.name}</span>
                      <em>{item.productCount}</em>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="filter-group">
              <div className="filter-group__head">
                <h2>Marques</h2>
                {brand && (
                  <Link href={buildHref(current, { brand: undefined, page: 1 })}>Tout</Link>
                )}
              </div>
              <ul className="filter-list filter-list--brands">
                {brands.map((item) => (
                  <li key={item.id}>
                    <Link
                      className={brand === item.slug ? 'is-active' : undefined}
                      href={buildHref(current, { brand: item.slug, page: 1 })}
                    >
                      <span>{item.name}</span>
                      <em>{item.productCount}</em>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="filter-group">
              <h2>Budget</h2>
              <ul className="filter-list">
                {PRICE_RANGES.map((range) => {
                  const active = minPrice === range.min && maxPrice === range.max;
                  return (
                    <li key={range.label}>
                      <Link
                        className={active ? 'is-active' : undefined}
                        href={buildHref(current, {
                          minPrice: range.min,
                          maxPrice: range.max,
                          page: 1,
                        })}
                      >
                        <span>{range.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="filter-group">
              <h2>Disponibilité</h2>
              <Link
                className={`filter-toggle ${inStock ? 'is-active' : ''}`}
                href={buildHref(current, { inStock: !inStock, page: 1 })}
              >
                <span className="filter-toggle__dot" />
                En stock uniquement
              </Link>
            </div>

            {activeFilters.length > 0 && (
              <Link className="filters__clear" href="/catalogue">
                Réinitialiser les filtres
              </Link>
            )}
          </div>
        </Filters>

        <div className="catalogue-main">
          <div className="catalogue-toolbar">
            <form className="catalogue-search" action="/catalogue" method="get" role="search">
              {category && <input type="hidden" name="category" value={category} />}
              {brand && <input type="hidden" name="brand" value={brand} />}
              {sort !== 'rating' && <input type="hidden" name="sort" value={sort} />}
              {inStock && <input type="hidden" name="inStock" value="true" />}
              {minPrice !== undefined && <input type="hidden" name="minPrice" value={minPrice} />}
              {maxPrice !== undefined && <input type="hidden" name="maxPrice" value={maxPrice} />}
              <SearchIcon />
              <label className="sr-only" htmlFor="catalogue-search">
                Rechercher dans le catalogue
              </label>
              <input
                id="catalogue-search"
                type="search"
                name="search"
                defaultValue={search}
                placeholder="iPhone, Samsung, écouteurs…"
              />
              <button className="btn btn--dark btn--sm" type="submit">
                Rechercher
              </button>
            </form>

            <form className="catalogue-sort" action="/catalogue" method="get">
              {search && <input type="hidden" name="search" value={search} />}
              {category && <input type="hidden" name="category" value={category} />}
              {brand && <input type="hidden" name="brand" value={brand} />}
              {minPrice !== undefined && <input type="hidden" name="minPrice" value={minPrice} />}
              {maxPrice !== undefined && <input type="hidden" name="maxPrice" value={maxPrice} />}
              {inStock && <input type="hidden" name="inStock" value="true" />}
              <label htmlFor="catalogue-sort">Trier par</label>
              <select id="catalogue-sort" name="sort" defaultValue={sort}>
                {SORT_OPTIONS.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <button className="btn btn--outline btn--sm" type="submit">
                Trier
              </button>
            </form>
          </div>

          {activeFilters.length > 0 && (
            <div className="active-filters" aria-label="Filtres actifs">
              {activeFilters.map((filter) => (
                <Link key={filter.label} href={filter.href}>
                  {filter.label} <span aria-hidden="true">×</span>
                </Link>
              ))}
            </div>
          )}

          <div className="catalogue-count">
            <p>
              <strong>{products.meta.total}</strong>{' '}
              {products.meta.total > 1 ? 'produits' : 'produit'}
              {search ? ` pour « ${search} »` : ''}
            </p>
            <span>
              Page {products.meta.page} / {Math.max(products.meta.totalPages, 1)}
            </span>
          </div>

          {products.data.length === 0 ? (
            <div className="catalogue-empty">
              <p className="eyebrow">Aucun résultat</p>
              <h2 className="display">Cette recherche ne donne rien.</h2>
              <p>Essayez un autre modèle, une autre marque ou retirez quelques filtres.</p>
              <Link className="btn btn--dark" href="/catalogue">
                Revenir à tout le catalogue
              </Link>
            </div>
          ) : (
            <div className="catalogue-grid">
              {products.data.map((product, index) => (
                <ProductCard key={product.id} product={product} priority={index < 3} />
              ))}
            </div>
          )}

          {products.meta.totalPages > 1 && (
            <nav className="pagination" aria-label="Pagination du catalogue">
              {products.meta.page > 1 ? (
                <Link
                  className="pagination__arrow"
                  href={buildHref(current, { page: products.meta.page - 1 })}
                  aria-label="Page précédente"
                >
                  ←
                </Link>
              ) : (
                <span className="pagination__arrow is-disabled">←</span>
              )}

              {Array.from({ length: products.meta.totalPages }, (_, index) => index + 1)
                .filter((number) => {
                  const currentPage = products.meta.page;
                  return (
                    number === 1 ||
                    number === products.meta.totalPages ||
                    Math.abs(number - currentPage) <= 1
                  );
                })
                .map((number, index, list) => {
                  const previous = list[index - 1];
                  return (
                    <span className="pagination__item" key={number}>
                      {previous && number - previous > 1 && (
                        <span className="pagination__ellipsis">…</span>
                      )}
                      {number === products.meta.page ? (
                        <span className="is-current" aria-current="page">
                          {number}
                        </span>
                      ) : (
                        <Link href={buildHref(current, { page: number })}>{number}</Link>
                      )}
                    </span>
                  );
                })}

              {products.meta.page < products.meta.totalPages ? (
                <Link
                  className="pagination__arrow"
                  href={buildHref(current, { page: products.meta.page + 1 })}
                  aria-label="Page suivante"
                >
                  →
                </Link>
              ) : (
                <span className="pagination__arrow is-disabled">→</span>
              )}
            </nav>
          )}
        </div>
      </section>
    </main>
  );
}

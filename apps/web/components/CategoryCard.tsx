import Link from 'next/link';
import type { Category } from '@/lib/api';
import { ArrowIcon } from './Icons';

function CategoryIcon({ slug }: { slug: string }) {
  if (slug === 'tablettes') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden>
        <rect x="4" y="2.5" width="16" height="19" rx="2.4" />
        <path d="M11 18.6h2" />
      </svg>
    );
  }
  if (slug === 'audio') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden>
        <path d="M4 14v-2a8 8 0 0 1 16 0v2" />
        <rect x="2.5" y="13" width="4.5" height="7" rx="2" />
        <rect x="17" y="13" width="4.5" height="7" rx="2" />
      </svg>
    );
  }
  if (slug === 'accessoires') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden>
        <path d="M9 3v5M15 3v5" />
        <path d="M6 8h12v3a6 6 0 0 1-12 0z" />
        <path d="M12 17v4" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden>
      <rect x="7" y="2.5" width="10" height="19" rx="2.4" />
      <path d="M11 18.6h2" />
    </svg>
  );
}

export function CategoryCard({ category }: { category: Category }) {
  return (
    <Link className="category-card" href={`/catalogue?category=${category.slug}`}>
      <span className="category-card__icon">
        <CategoryIcon slug={category.slug} />
      </span>
      <span className="category-card__count">
        {String(category.productCount).padStart(2, '0')}
      </span>
      <h3>{category.name}</h3>
      <p>{category.description}</p>
      <span className="category-card__arrow" aria-hidden="true">
        <ArrowIcon />
      </span>
    </Link>
  );
}

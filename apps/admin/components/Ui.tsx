import type { ReactNode } from 'react';
import { STATUS_LABELS, PAYMENT_LABELS } from '@/lib/api';

export function StatusBadge({ status, kind = 'order' }: { status: string; kind?: 'order' | 'payment' }) {
  const label = kind === 'payment' ? PAYMENT_LABELS[status] ?? status : STATUS_LABELS[status] ?? status;
  return <span className={`status status--${status.toLowerCase()}`}>{label}</span>;
}

export function PageState({
  title,
  children,
  tone = 'neutral',
}: {
  title: string;
  children?: ReactNode;
  tone?: 'neutral' | 'danger';
}) {
  return (
    <div className={`page-state ${tone === 'danger' ? 'page-state--danger' : ''}`}>
      <strong>{title}</strong>
      {children && <p>{children}</p>}
    </div>
  );
}

export function AdminLoading({ rows = 4 }: { rows?: number }) {
  return (
    <div className="admin-loading" aria-busy="true" aria-label="Chargement">
      {Array.from({ length: rows }).map((_, index) => (
        <div className="admin-skeleton" key={index} />
      ))}
    </div>
  );
}

export function Pagination({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <div className="admin-pagination">
      <button type="button" disabled={page <= 1} onClick={() => onChange(page - 1)}>
        ← Précédent
      </button>
      <span>
        Page {page} / {totalPages}
      </span>
      <button type="button" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>
        Suivant →
      </button>
    </div>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="admin-empty">
      <strong>{title}</strong>
      {children && <p>{children}</p>}
    </div>
  );
}

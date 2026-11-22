'use client';

import { useState, type ReactNode } from 'react';

export function Filters({
  children,
  activeCount = 0,
}: {
  children: ReactNode;
  activeCount?: number;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className={`filters ${open ? 'is-open' : ''}`}>
      <button
        className="filters__summary"
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span>Filtres</span>
        {activeCount > 0 && <strong>{activeCount}</strong>}
      </button>
      <div className="filters__body">{children}</div>
    </div>
  );
}

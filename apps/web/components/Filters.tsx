'use client';

import { useEffect, useState, type ReactNode } from 'react';

export function Filters({
  children,
  activeCount = 0,
}: {
  children: ReactNode;
  activeCount?: number;
}) {
  const [open, setOpen] = useState(true);

  useEffect(() => {
    if (window.matchMedia('(max-width: 900px)').matches) {
      setOpen(false);
    }
  }, []);

  return (
    <details
      className="filters"
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary>
        <span>Filtres</span>
        {activeCount > 0 && <strong>{activeCount}</strong>}
      </summary>
      {children}
    </details>
  );
}

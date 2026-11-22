import type { ReactNode } from 'react';

interface SectionHeadProps {
  eyebrow: string;
  title: ReactNode;
  note?: string;
  action?: { href: string; label: string };
}

export function SectionHead({ eyebrow, title, note, action }: SectionHeadProps) {
  return (
    <div className="section-head">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h2 className="display">{title}</h2>
      </div>
      {note && <p className="section-head__note">{note}</p>}
      {action && (
        <a className="link-arrow" href={action.href}>
          {action.label} <span aria-hidden="true">→</span>
        </a>
      )}
    </div>
  );
}

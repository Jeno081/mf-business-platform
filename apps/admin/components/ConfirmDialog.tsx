'use client';

import { useEffect, useRef } from 'react';
import { CloseIcon } from './Icons';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Supprimer',
  cancelLabel = 'Annuler',
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) onCancel();
    };
    document.body.classList.add('admin-modal-open');
    window.addEventListener('keydown', onKeyDown);
    cancelRef.current?.focus();
    return () => {
      document.body.classList.remove('admin-modal-open');
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open, busy, onCancel]);

  if (!open) return null;

  return (
    <div
      className="admin-modal"
      role="presentation"
      onMouseDown={() => {
        if (!busy) onCancel();
      }}
    >
      <div
        className="admin-modal__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-confirm-title"
        aria-describedby={description ? 'admin-confirm-description' : undefined}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button
          className="admin-modal__close"
          type="button"
          onClick={onCancel}
          disabled={busy}
          aria-label="Fermer"
        >
          <CloseIcon />
        </button>

        <span className="admin-modal__icon" aria-hidden="true">
          !
        </span>
        <p className="admin-eyebrow">Confirmation</p>
        <h2 id="admin-confirm-title">{title}</h2>
        {description && <p id="admin-confirm-description">{description}</p>}

        <div className="admin-modal__actions">
          <button
            ref={cancelRef}
            className="admin-btn admin-btn--ghost"
            type="button"
            onClick={onCancel}
            disabled={busy}
          >
            {cancelLabel}
          </button>
          <button
            className="admin-btn admin-btn--danger"
            type="button"
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? 'Suppression…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

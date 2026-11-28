'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { PageState } from '@/components/Ui';
import { AdminPushSubscribe } from '@/components/AdminPushSubscribe';
import { fetchPushStats, sendPushCampaign, type PushStats } from '@/lib/api';

export default function MarketingPage() {
  const { token } = useAuth();
  const [stats, setStats] = useState<PushStats | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [url, setUrl] = useState('/');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) return;
    fetchPushStats(token)
      .then((result) => setStats(result.data))
      .catch((err) => setError(err instanceof Error ? err.message : 'Statistiques indisponibles.'));
  }, [token]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!token) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const result = await sendPushCampaign(token, { title, body, url: url || '/' });
      setMessage(
        `Notification envoyée : ${result.data.success} appareil(s), ${result.data.failed} échec(s).`,
      );
      setStats((current) =>
        current ? { ...current, active: Math.max(0, current.active - result.data.invalid) } : current,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Envoi impossible.');
    } finally {
      setBusy(false);
    }
  }

  if (error && !stats) {
    return <PageState title="Notifications indisponibles" tone="danger">{error}</PageState>;
  }

  return (
    <div className="admin-page">
      <section className="admin-page-head">
        <div>
          <p className="admin-eyebrow">Marketing</p>
          <h2>
            Une annonce, <em>tous les clients.</em>
          </h2>
          <p>Rédigez une notification push Firebase envoyée aux appareils abonnés.</p>
        </div>
      </section>

      {message && <div className="admin-alert admin-alert--success">{message}</div>}
      {error && <div className="admin-alert admin-alert--danger">{error}</div>}

      <div className="admin-marketing-grid">
        <form className="admin-panel admin-form" onSubmit={handleSubmit}>
          <div className="admin-panel__head">
            <div>
              <p className="admin-eyebrow">Composer</p>
              <h3>Nouvelle notification</h3>
            </div>
          </div>

          <label className="admin-field">
            <span>Titre · {title.length}/120</span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={120}
              placeholder="Nouvel arrivage iPhone 18"
              required
            />
          </label>
          <label className="admin-field">
            <span>Message · {body.length}/500</span>
            <textarea
              value={body}
              onChange={(event) => setBody(event.target.value)}
              maxLength={500}
              rows={5}
              placeholder="Découvrez les nouveaux modèles disponibles dès maintenant."
              required
            />
          </label>
          <label className="admin-field">
            <span>Lien à ouvrir au clic</span>
            <input
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="/catalogue"
            />
          </label>

          <button className="admin-btn admin-btn--primary" type="submit" disabled={busy}>
            {busy ? 'Envoi…' : 'Envoyer la notification'}
          </button>
        </form>

        <aside className="admin-marketing-side">
          <section className="admin-panel">
            <div className="admin-panel__head">
              <div><p className="admin-eyebrow">Audience</p><h3>Appareils abonnés</h3></div>
            </div>
            <div className="admin-push-stats">
              <div><strong>{stats?.activeCustomers ?? '—'}</strong><span>clients abonnés</span></div>
              <div><strong>{stats?.activeAdmins ?? '—'}</strong><span>alertes admin</span></div>
            </div>
            <span className={stats?.configured ? 'status status--paid' : 'status status--pending'}>
              {stats?.configured ? 'Firebase configuré' : 'Firebase non configuré'}
            </span>
            {!stats?.configured && (
              <p className="admin-muted admin-marketing-hint">
                Ajoutez le compte de service Firebase sur Render pour activer l’envoi.
              </p>
            )}
          </section>

          <section className="admin-panel">
            <div className="admin-panel__head">
              <div><p className="admin-eyebrow">Admin</p><h3>Alertes téléphone</h3></div>
            </div>
            <AdminPushSubscribe />
          </section>

          <section className="admin-panel">
            <div className="admin-panel__head">
              <div><p className="admin-eyebrow">Aperçu</p><h3>Sur le téléphone</h3></div>
            </div>
            <div className="admin-push-preview">
              <span className="admin-push-preview__icon">MF</span>
              <div>
                <strong>{title || 'Titre de la notification'}</strong>
                <p>{body || 'Le message apparaîtra ici avec le lien de votre boutique.'}</p>
                <em>MF Business · maintenant</em>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

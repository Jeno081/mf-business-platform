'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { LogoutIcon } from '@/components/Icons';

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const router = useRouter();

  async function handleLogout() {
    await logout();
    router.replace('/login');
  }

  return (
    <div className="admin-page">
      <section className="admin-page-head">
        <div>
          <p className="admin-eyebrow">Compte</p>
          <h2>
            Votre accès <em>à la maison.</em>
          </h2>
          <p>Les informations de votre session administrateur.</p>
        </div>
      </section>

      <div className="admin-settings-grid">
        <section className="admin-panel">
          <div className="admin-panel__head">
            <div><p className="admin-eyebrow">Profil</p><h3>Administrateur</h3></div>
          </div>
          <div className="admin-info-grid">
            <div><span>Nom</span><strong>{user?.firstName || user?.lastName ? `${user?.firstName ?? ''} ${user?.lastName ?? ''}` : '—'}</strong></div>
            <div><span>E-mail</span><strong>{user?.email}</strong></div>
            <div><span>Rôle</span><strong>{user?.role?.replace(/_/g, ' ')}</strong></div>
            <div><span>Dernière connexion</span><strong>{user?.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString('fr-FR') : '—'}</strong></div>
          </div>
        </section>

        <section className="admin-panel">
          <div className="admin-panel__head">
            <div><p className="admin-eyebrow">Sécurité</p><h3>Double authentification</h3></div>
          </div>
          <p className="admin-settings-copy">
            La 2FA est obligatoire pour accéder au back-office. Elle a été configurée lors de votre première connexion.
          </p>
          <span className="status status--paid">2FA active</span>
          <hr className="admin-hr" />
          <button className="admin-btn admin-btn--ghost" type="button" onClick={handleLogout}>
            <LogoutIcon /> Se déconnecter
          </button>
        </section>

        <section className="admin-panel">
          <div className="admin-panel__head">
            <div><p className="admin-eyebrow">Boutique</p><h3>Lien public</h3></div>
          </div>
          <p className="admin-settings-copy">Le site visible par vos clients.</p>
          <a className="admin-link-arrow" href="https://mf-business-platform.vercel.app" target="_blank" rel="noopener">
            Ouvrir la boutique ↗
          </a>
        </section>
      </div>
    </div>
  );
}

'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { useAuth } from './AuthProvider';
import {
  BoxIcon,
  CloseIcon,
  DashboardIcon,
  LogoutIcon,
  MenuIcon,
  OrdersIcon,
  SettingsIcon,
  StockIcon,
} from './Icons';

const NAV = [
  { href: '/', label: 'Dashboard', icon: DashboardIcon },
  { href: '/commandes', label: 'Commandes', icon: OrdersIcon },
  { href: '/produits', label: 'Produits', icon: BoxIcon },
  { href: '/stocks', label: 'Stocks', icon: StockIcon },
  { href: '/parametres', label: 'Paramètres', icon: SettingsIcon },
];

function titleFor(pathname: string): { eyebrow: string; title: string } {
  if (pathname === '/') return { eyebrow: 'Vue d’ensemble', title: 'Dashboard' };
  if (pathname.startsWith('/commandes/')) return { eyebrow: 'Commandes', title: 'Détail de la commande' };
  if (pathname === '/commandes') return { eyebrow: 'Ventes', title: 'Commandes' };
  if (pathname === '/produits/nouveau') return { eyebrow: 'Catalogue', title: 'Nouveau produit' };
  if (pathname.startsWith('/produits/')) return { eyebrow: 'Catalogue', title: 'Modifier le produit' };
  if (pathname === '/produits') return { eyebrow: 'Catalogue', title: 'Produits' };
  if (pathname === '/stocks') return { eyebrow: 'Inventaire', title: 'Stocks' };
  if (pathname === '/parametres') return { eyebrow: 'Compte', title: 'Paramètres' };
  return { eyebrow: 'Back-office', title: 'MF Business' };
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const heading = titleFor(pathname);
  const initials = [user?.firstName?.[0], user?.lastName?.[0]].filter(Boolean).join('') || 'MF';

  function isActive(href: string): boolean {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  }

  async function handleLogout() {
    await logout();
    router.replace('/login');
  }

  return (
    <div className="admin-shell">
      <aside className={`admin-sidebar ${menuOpen ? 'is-open' : ''}`}>
        <div className="admin-sidebar__brand">
          <Link href="/" onClick={() => setMenuOpen(false)}>
            <span className="admin-logo">MF</span>
            <span>
              <strong>Maison Forlife</strong>
              <em>Business · Admin</em>
            </span>
          </Link>
          <button
            className="admin-sidebar__close"
            type="button"
            onClick={() => setMenuOpen(false)}
            aria-label="Fermer le menu"
          >
            <CloseIcon />
          </button>
        </div>

        <nav className="admin-nav" aria-label="Navigation administrateur">
          {NAV.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={isActive(item.href) ? 'is-active' : undefined}
                onClick={() => setMenuOpen(false)}
              >
                <Icon />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="admin-sidebar__foot">
          <div className="admin-user">
            <span className="admin-user__avatar">{initials}</span>
            <span>
              <strong>{user?.firstName ? `${user.firstName} ${user.lastName ?? ''}` : user?.email}</strong>
              <em>{user?.role?.replace(/_/g, ' ')}</em>
            </span>
          </div>
          <button className="admin-logout" type="button" onClick={handleLogout}>
            <LogoutIcon /> Déconnexion
          </button>
          <a className="admin-sidebar__site" href="https://mf-business-platform.vercel.app" target="_blank" rel="noopener">
            Voir la boutique ↗
          </a>
        </div>
      </aside>

      {menuOpen && <button className="admin-overlay" type="button" onClick={() => setMenuOpen(false)} aria-label="Fermer" />}

      <div className="admin-main">
        <header className="admin-topbar">
          <button
            className="admin-topbar__menu"
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="Ouvrir le menu"
          >
            <MenuIcon />
          </button>
          <div>
            <p className="admin-eyebrow">{heading.eyebrow}</p>
            <h1>{heading.title}</h1>
          </div>
          <div className="admin-topbar__user">
            <span className="admin-user__avatar">{initials}</span>
            <span>
              <strong>{user?.email}</strong>
              <em>Session sécurisée · 2FA</em>
            </span>
          </div>
        </header>
        <div className="admin-content">{children}</div>
      </div>
    </div>
  );
}

'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { formatPrice, imageUrl } from '@/lib/api';
import { fetchAnnouncements, type Announcement } from '@/lib/announcements';
import { useCart } from './CartProvider';
import { BellIcon, CartIcon, CloseIcon, MenuIcon, SearchIcon } from './Icons';

const ANNOUNCEMENTS_READ_KEY = 'mf_announcements_read';

function formatAnnouncementDate(value: string): string {
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date(value));
}

const NAV_LINKS = [
  { href: '/', label: 'Accueil' },
  { href: '/catalogue', label: 'Boutique' },
  { href: '/catalogue?category=smartphones', label: 'Smartphones' },
  { href: '/catalogue?category=tablettes', label: 'Tablettes' },
  { href: '/catalogue?category=audio', label: 'Audio' },
  { href: '/catalogue?category=accessoires', label: 'Accessoires' },
  { href: '/contact', label: 'Contact' },
];

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [announcementsOpen, setAnnouncementsOpen] = useState(false);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [unreadAnnouncements, setUnreadAnnouncements] = useState(0);
  const announcementsOpenRef = useRef(false);
  const { items, count, subtotal, setQuantity, removeItem } = useCart();

  useEffect(() => {
    const shouldLock = menuOpen || searchOpen || cartOpen || announcementsOpen;
    document.body.classList.toggle('is-locked', shouldLock);
    return () => document.body.classList.remove('is-locked');
  }, [menuOpen, searchOpen, cartOpen, announcementsOpen]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setMenuOpen(false);
        setSearchOpen(false);
        setCartOpen(false);
        setAnnouncementsOpen(false);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  function closeAll() {
    setMenuOpen(false);
    setSearchOpen(false);
    setCartOpen(false);
    setAnnouncementsOpen(false);
  }

  function markAnnouncementsRead(rows: Announcement[]): void {
    const stored = window.localStorage.getItem(ANNOUNCEMENTS_READ_KEY);
    let previous: string[] = [];
    try {
      previous = stored ? (JSON.parse(stored) as string[]) : [];
    } catch {
      previous = [];
    }
    const merged = [...new Set([...rows.map((row) => row.id), ...previous])].slice(0, 100);
    window.localStorage.setItem(ANNOUNCEMENTS_READ_KEY, JSON.stringify(merged));
    setUnreadAnnouncements(0);
  }

  useEffect(() => {
    announcementsOpenRef.current = announcementsOpen;
  }, [announcementsOpen]);

  useEffect(() => {
    let cancelled = false;

    async function loadAnnouncements() {
      try {
        const rows = await fetchAnnouncements(20);
        if (cancelled) return;
        setAnnouncements(rows);
        const stored = window.localStorage.getItem(ANNOUNCEMENTS_READ_KEY);
        if (!stored) {
          setUnreadAnnouncements(rows.length);
          return;
        }
        if (announcementsOpenRef.current) {
          markAnnouncementsRead(rows);
          return;
        }
        let parsed: string[] = [];
        try {
          parsed = JSON.parse(stored) as string[];
        } catch {
          parsed = [];
        }
        const read = new Set(parsed);
        setUnreadAnnouncements(rows.filter((row) => !read.has(row.id)).length);
      } catch {
        // La cloche reste silencieuse si l’API est indisponible.
      }
    }

    void loadAnnouncements();
    const timer = window.setInterval(() => void loadAnnouncements(), 60000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  return (
    <>
      <div className="topbar">
        <div className="container topbar__inner">
          <p className="topbar__note">
            <span className="topbar__dot" aria-hidden="true" />
            Livraison offerte dès 150 $ à Kinshasa
          </p>
          <div className="topbar__links">
            <a href="tel:+243811860632">+243 811 860 632</a>
            <span aria-hidden="true">·</span>
            <a href="#contact">Kinshasa, RDC</a>
          </div>
        </div>
      </div>

      <header className="site-header">
        <div className="container site-header__inner">
          <Link className="brand" href="/" aria-label="Maison Forlife Business — accueil" onClick={closeAll}>
            <Image
              className="brand__mark"
              src="/brand/logo-monogram.png"
              alt=""
              width={44}
              height={44}
              priority
            />
            <span className="brand__text">
              <span className="brand__name">Maison Forlife</span>
              <span className="brand__sub">Business</span>
            </span>
          </Link>

          <nav className="nav" aria-label="Navigation principale">
            <ul className="nav__list">
              {NAV_LINKS.map((link, index) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className={index === 0 ? 'is-current' : undefined}
                    onClick={closeAll}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="header-actions">
            <button
              className="icon-btn"
              type="button"
              aria-label="Rechercher un produit"
              aria-expanded={searchOpen}
              onClick={() => {
                setSearchOpen((open) => !open);
                setMenuOpen(false);
              }}
            >
              <SearchIcon />
            </button>
            <button
              className="icon-btn announcement-btn"
              type="button"
              aria-label="Ouvrir les annonces"
              aria-expanded={announcementsOpen}
              onClick={() => {
                announcementsOpenRef.current = true;
                setAnnouncementsOpen(true);
                markAnnouncementsRead(announcements);
                setMenuOpen(false);
                setSearchOpen(false);
                setCartOpen(false);
              }}
            >
              <BellIcon />
              {unreadAnnouncements > 0 && (
                <span className="announcement-btn__count">
                  {unreadAnnouncements > 9 ? '9+' : unreadAnnouncements}
                </span>
              )}
            </button>
            <button
              className="icon-btn cart-btn"
              type="button"
              aria-label="Ouvrir le panier"
              aria-expanded={cartOpen}
              onClick={() => {
                setCartOpen(true);
                setMenuOpen(false);
                setSearchOpen(false);
              }}
            >
              <CartIcon />
              {count > 0 && <span className="cart-btn__count">{count}</span>}
            </button>
            <button
              className="burger"
              type="button"
              aria-label={menuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
              aria-expanded={menuOpen}
              onClick={() => {
                setMenuOpen((open) => !open);
                setSearchOpen(false);
              }}
            >
              {menuOpen ? <CloseIcon /> : <MenuIcon />}
            </button>
          </div>
        </div>

        {searchOpen && (
          <div className="search-panel">
            <form className="container search-panel__form" action="/catalogue" method="get">
              <SearchIcon />
              <label className="sr-only" htmlFor="site-search">
                Rechercher un produit
              </label>
              <input
                id="site-search"
                name="search"
                type="search"
                placeholder="iPhone, Samsung, écouteurs…"
                autoComplete="off"
                autoFocus
              />
              <button className="btn btn--dark btn--sm" type="submit">
                Rechercher
              </button>
            </form>
          </div>
        )}
      </header>

      <div
        className={`nav-overlay ${menuOpen || cartOpen || announcementsOpen ? 'is-visible' : ''}`}
        onClick={closeAll}
        aria-hidden="true"
      />

      <aside className={`mobile-nav ${menuOpen ? 'is-open' : ''}`} aria-hidden={!menuOpen}>
        <div className="mobile-nav__head">
          <span className="eyebrow">Menu</span>
          <button className="icon-btn" type="button" onClick={closeAll} aria-label="Fermer le menu">
            <CloseIcon />
          </button>
        </div>
        <ul className="mobile-nav__list">
          {NAV_LINKS.map((link) => (
            <li key={link.label}>
              <Link href={link.href} onClick={closeAll}>
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
        <div className="mobile-nav__aside">
          <p>Besoin d’un conseil ?</p>
          <a className="mobile-nav__phone" href="tel:+243811860632">
            +243 811 860 632
          </a>
          <a
            className="btn btn--gold"
            href="https://wa.me/243811860632?text=Bonjour%20MF%20Business"
            target="_blank"
            rel="noopener"
          >
            Écrire sur WhatsApp
          </a>
        </div>
      </aside>

      <aside className={`announcements-drawer ${announcementsOpen ? 'is-open' : ''}`} aria-hidden={!announcementsOpen}>
        <div className="announcements-drawer__head">
          <div>
            <span className="eyebrow">Le journal</span>
            <h2>Annonces</h2>
          </div>
          <button className="icon-btn" type="button" onClick={closeAll} aria-label="Fermer les annonces">
            <CloseIcon />
          </button>
        </div>
        <div className="announcements-drawer__body">
          {announcements.length === 0 ? (
            <div className="announcements-empty">
              <span className="announcements-empty__icon">
                <BellIcon />
              </span>
              <h3>Rien à l’affiche pour le moment.</h3>
              <p>Les nouveautés et offres de la maison apparaîtront ici.</p>
            </div>
          ) : (
            announcements.map((announcement) => (
              <article className="announcement-item" key={announcement.id}>
                <time>{formatAnnouncementDate(announcement.publishedAt)}</time>
                <h3>{announcement.title}</h3>
                <p>{announcement.body}</p>
                {announcement.url && (
                  <Link href={announcement.url} onClick={closeAll}>
                    Découvrir <span aria-hidden="true">→</span>
                  </Link>
                )}
              </article>
            ))
          )}
        </div>
        <div className="announcements-drawer__foot">
          <span>Les annonces sont aussi envoyées par notification.</span>
        </div>
      </aside>

      <aside className={`cart-drawer ${cartOpen ? 'is-open' : ''}`} aria-hidden={!cartOpen}>
        <div className="cart-drawer__head">
          <span className="eyebrow">Votre panier</span>
          <button className="icon-btn" type="button" onClick={closeAll} aria-label="Fermer le panier">
            <CloseIcon />
          </button>
        </div>
        {items.length === 0 ? (
          <div className="cart-drawer__empty">
            <span className="cart-drawer__icon">
              <CartIcon />
            </span>
            <h2>Votre panier est vide.</h2>
            <p>La sélection MF Business n’attend que vous. Ajoutez un produit depuis sa fiche.</p>
            <Link className="btn btn--dark" href="/catalogue" onClick={closeAll}>
              Explorer le catalogue
            </Link>
          </div>
        ) : (
          <>
            <div className="cart-drawer__items">
              {items.map((item) => {
                const image = imageUrl(item.image);
                return (
                  <div className="cart-drawer__item" key={`${item.productId}-${item.variantId}`}>
                    <Link
                      className="cart-drawer__thumb"
                      href={`/produit/${item.slug}`}
                      onClick={closeAll}
                    >
                      {image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={image} alt="" width={120} height={120} />
                      ) : null}
                    </Link>
                    <div className="cart-drawer__item-body">
                      <span className="cart-drawer__item-brand">{item.brand}</span>
                      <Link href={`/produit/${item.slug}`} onClick={closeAll}>
                        {item.name}
                      </Link>
                      <span className="cart-drawer__item-variant">{item.variantLabel}</span>
                      <div className="cart-drawer__item-bottom">
                        <div className="cart-drawer__qty">
                          <button
                            type="button"
                            onClick={() =>
                              setQuantity(item.productId, item.variantId, item.quantity - 1)
                            }
                            aria-label="Diminuer la quantité"
                          >
                            −
                          </button>
                          <span>{item.quantity}</span>
                          <button
                            type="button"
                            onClick={() =>
                              setQuantity(item.productId, item.variantId, item.quantity + 1)
                            }
                            aria-label="Augmenter la quantité"
                          >
                            +
                          </button>
                        </div>
                        <strong>{formatPrice(item.price * item.quantity)}</strong>
                      </div>
                    </div>
                    <button
                      className="cart-drawer__remove"
                      type="button"
                      onClick={() => removeItem(item.productId, item.variantId)}
                      aria-label={`Retirer ${item.name}`}
                    >
                      ×
                    </button>
                  </div>
                );
              })}
            </div>
            <div className="cart-drawer__foot">
              <div className="cart-drawer__subtotal">
                <span>Sous-total</span>
                <strong>{formatPrice(subtotal)}</strong>
              </div>
              <p>Livraison calculée à l’étape suivante.</p>
              <Link className="btn btn--outline" href="/panier" onClick={closeAll}>
                Voir le panier
              </Link>
              <Link className="btn btn--dark" href="/checkout" onClick={closeAll}>
                Passer commande
              </Link>
            </div>
          </>
        )}
      </aside>
    </>
  );
}

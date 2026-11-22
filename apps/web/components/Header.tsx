'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState, type FormEvent } from 'react';
import { CartIcon, CloseIcon, MenuIcon, SearchIcon } from './Icons';

const NAV_LINKS = [
  { href: '/', label: 'Accueil' },
  { href: '/#featured', label: 'Boutique' },
  { href: '/#categories', label: 'Smartphones' },
  { href: '/#categories', label: 'Tablettes' },
  { href: '/#categories', label: 'Audio' },
  { href: '/#categories', label: 'Accessoires' },
  { href: '/#contact', label: 'Contact' },
];

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);

  useEffect(() => {
    const shouldLock = menuOpen || searchOpen || cartOpen;
    document.body.classList.toggle('is-locked', shouldLock);
    return () => document.body.classList.remove('is-locked');
  }, [menuOpen, searchOpen, cartOpen]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setMenuOpen(false);
        setSearchOpen(false);
        setCartOpen(false);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  function closeAll() {
    setMenuOpen(false);
    setSearchOpen(false);
    setCartOpen(false);
  }

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSearchOpen(false);
    document.getElementById('featured')?.scrollIntoView({ behavior: 'smooth' });
  }

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
              <span className="cart-btn__count">0</span>
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
            <form className="container search-panel__form" onSubmit={handleSearch}>
              <SearchIcon />
              <label className="sr-only" htmlFor="site-search">
                Rechercher un produit
              </label>
              <input
                id="site-search"
                type="search"
                placeholder="iPhone, Samsung, écouteurs…"
                autoComplete="off"
                autoFocus
              />
              <button className="btn btn--dark btn--sm" type="submit">
                Rechercher
              </button>
            </form>
            <p className="search-panel__note">
              La recherche détaillée arrive avec le catalogue. En attendant, parcourez la sélection.
            </p>
          </div>
        )}
      </header>

      <div
        className={`nav-overlay ${menuOpen || cartOpen ? 'is-visible' : ''}`}
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

      <aside className={`cart-drawer ${cartOpen ? 'is-open' : ''}`} aria-hidden={!cartOpen}>
        <div className="cart-drawer__head">
          <span className="eyebrow">Votre panier</span>
          <button className="icon-btn" type="button" onClick={closeAll} aria-label="Fermer le panier">
            <CloseIcon />
          </button>
        </div>
        <div className="cart-drawer__empty">
          <span className="cart-drawer__icon">
            <CartIcon />
          </span>
          <h2>Votre panier est vide.</h2>
          <p>La sélection MF Business n’attend que vous. Le panier complet arrive à la prochaine étape.</p>
          <Link className="btn btn--dark" href="/#featured" onClick={closeAll}>
            Explorer la sélection
          </Link>
        </div>
      </aside>
    </>
  );
}

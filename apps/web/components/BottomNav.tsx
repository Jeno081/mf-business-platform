'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCart } from './CartProvider';
import { CartIcon, GridIcon, HomeIcon, PhoneIcon } from './Icons';

const ITEMS = [
  { href: '/', label: 'Accueil', icon: HomeIcon },
  { href: '/catalogue', label: 'Boutique', icon: GridIcon },
  { href: '/panier', label: 'Panier', icon: CartIcon },
  { href: '/contact', label: 'Contact', icon: PhoneIcon },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  const { count } = useCart();

  function isActive(href: string): boolean {
    if (href === '/') return pathname === '/';
    if (href === '/catalogue') return pathname.startsWith('/catalogue') || pathname.startsWith('/produit');
    if (href === '/panier') return pathname.startsWith('/panier') || pathname.startsWith('/checkout');
    return pathname.startsWith(href);
  }

  return (
    <nav className="bottom-nav" aria-label="Navigation mobile">
      {ITEMS.map((item) => {
        const Icon = item.icon;
        const active = isActive(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={active ? 'is-active' : undefined}
            aria-current={active ? 'page' : undefined}
          >
            <span className="bottom-nav__icon">
              <Icon />
              {item.href === '/panier' && count > 0 && (
                <em className="bottom-nav__badge">{count}</em>
              )}
            </span>
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

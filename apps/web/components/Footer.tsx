import Image from 'next/image';
import Link from 'next/link';
import {
  FacebookIcon,
  InstagramIcon,
  TiktokIcon,
  WhatsappIcon,
} from './Icons';

const SHOP_LINKS = [
  ['Smartphones', '/catalogue?category=smartphones'],
  ['Tablettes', '/catalogue?category=tablettes'],
  ['Audio', '/catalogue?category=audio'],
  ['Accessoires', '/catalogue?category=accessoires'],
  ['Toute la sélection', '/catalogue'],
];

const HOUSE_LINKS = [
  ['Notre maison', '/#values'],
  ['Livraison & retours', '/#services'],
  ['Garantie 12 mois', '/#services'],
  ['Contact', '/#contact'],
];

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer__top">
        <div className="footer__brand">
          <Image
            className="footer__logo"
            src="/brand/logo-full-white.png"
            alt="Maison Forlife Business — Vente des téléphones en Gros & en Détails"
            width={280}
            height={289}
            priority
          />
          <p className="footer__meaning">
            <strong>Maison Forlife Business.</strong> « Forlife » pour la technologie qui vous
            accompagne toute la vie. « Business » pour les outils qui font avancer vos projets.
          </p>
          <div className="footer__contact">
            <a href="tel:+243811860632">+243 811 860 632</a>
            <a href="mailto:jenovicmulomba@gmail.com">jenovicmulomba@gmail.com</a>
            <p>Avenue de la République du Tchad, B.P. 68, 5D, Av. Rep Du Tchad, Kinshasa.</p>
          </div>
        </div>

        <div className="footer__column">
          <p className="footer__title">Boutique</p>
          <ul>
            {SHOP_LINKS.map(([label, href]) => (
              <li key={label}>
                <Link href={href}>{label}</Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="footer__column">
          <p className="footer__title">La maison</p>
          <ul>
            {HOUSE_LINKS.map(([label, href]) => (
              <li key={label}>
                <Link href={href}>{label}</Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="footer__column footer__column--wide">
          <p className="footer__title">Les arrivages en avant-première</p>
          <p className="footer__small">
            Un e-mail par mois, les nouveautés et les offres de la maison. Pas de bruit inutile.
          </p>
          <form className="newsletter" action="#contact">
            <label className="sr-only" htmlFor="newsletter-email">
              Votre e-mail
            </label>
            <input id="newsletter-email" type="email" placeholder="votre@email.com" />
            <button type="submit">S’inscrire</button>
          </form>
          <div className="footer__socials">
            <a href="https://wa.me/243811860632" target="_blank" rel="noopener" aria-label="WhatsApp">
              <WhatsappIcon />
            </a>
            <a href="https://instagram.com" target="_blank" rel="noopener" aria-label="Instagram">
              <InstagramIcon />
            </a>
            <a href="https://facebook.com" target="_blank" rel="noopener" aria-label="Facebook">
              <FacebookIcon />
            </a>
            <a href="https://tiktok.com" target="_blank" rel="noopener" aria-label="TikTok">
              <TiktokIcon />
            </a>
          </div>
        </div>
      </div>

      <div className="container footer__bottom">
        <p>© 2026 MF Business — Maison Forlife Business. Tous droits réservés.</p>
        <div className="footer__payments">
          <span>Visa</span>
          <span>Mastercard</span>
          <span>Airtel Money</span>
          <span>M-Pesa</span>
          <span>Paiement à la livraison</span>
        </div>
      </div>
    </footer>
  );
}

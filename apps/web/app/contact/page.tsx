import type { Metadata } from 'next';
import Link from 'next/link';
import { HeadsetIcon, ShieldIcon, TruckIcon, WhatsappIcon } from '@/components/Icons';

export const metadata: Metadata = {
  title: 'Contact — MF Business',
  description:
    'Contactez MF Business à Kinshasa : téléphone, WhatsApp, e-mail et adresse du showroom.',
};

export default function ContactPage() {
  return (
    <main className="contact-page">
      <div className="container">
        <nav className="breadcrumb" aria-label="Fil d’Ariane">
          <Link href="/">Accueil</Link>
          <span aria-hidden="true">/</span>
          <span>Contact</span>
        </nav>

        <div className="contact-head">
          <p className="eyebrow">La maison</p>
          <h1 className="display">
            Parlons de votre <em>prochain téléphone.</em>
          </h1>
          <p>
            Une question sur un modèle, un stock, une livraison ? La maison répond sur WhatsApp,
            par téléphone ou au showroom.
          </p>
        </div>

        <div className="contact-grid">
          <section className="contact-card contact-card--dark">
            <span className="eyebrow eyebrow--light">Showroom</span>
            <h2>Maison Forlife Business</h2>
            <address>
              Avenue de la République du Tchad
              <br />
              B.P. 68, 5D, Av. Rep Du Tchad
              <br />
              Kinshasa, RDC
            </address>
            <div className="contact-card__links">
              <a href="tel:+243811860632">+243 811 860 632</a>
              <a href="mailto:jenovicmulomba@gmail.com">jenovicmulomba@gmail.com</a>
            </div>
            <a
              className="btn btn--gold"
              href="https://www.google.com/maps/search/?api=1&query=Avenue%20de%20la%20R%C3%A9publique%20du%20Tchad%2C%20Kinshasa%2C%20RDC"
              target="_blank"
              rel="noopener"
            >
              Voir sur Google Maps
            </a>
          </section>

          <div className="contact-side">
            <section className="contact-card">
              <span className="contact-card__icon">
                <WhatsappIcon />
              </span>
              <h2>WhatsApp</h2>
              <p>Le plus rapide pour une disponibilité, un conseil ou une commande.</p>
              <a
                className="btn btn--dark"
                href="https://wa.me/243811860632?text=Bonjour%20MF%20Business"
                target="_blank"
                rel="noopener"
              >
                Écrire sur WhatsApp
              </a>
            </section>

            <section className="contact-hours">
              <div>
                <HeadsetIcon />
                <span>Conseil personnalisé</span>
              </div>
              <div>
                <TruckIcon />
                <span>Livraison 24–48 h</span>
              </div>
              <div>
                <ShieldIcon />
                <span>Garantie 12 mois</span>
              </div>
              <p>Lundi – samedi · 9 h – 19 h</p>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}

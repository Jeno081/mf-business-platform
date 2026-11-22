'use client';

import Link from 'next/link';
import { useState } from 'react';
import { formatPrice, imageUrl } from '@/lib/api';
import { useCart } from '@/components/CartProvider';
import { deliveryFee } from '@/lib/cart';
import { WhatsappIcon } from '@/components/Icons';

const PAYMENT_OPTIONS = [
  ['cod', 'Paiement à la livraison'],
  ['mobile', 'Mobile Money (M-Pesa, Airtel, Orange)'],
  ['boutique', 'Paiement en boutique'],
] as const;

type Payment = (typeof PAYMENT_OPTIONS)[number][0];

interface FormState {
  name: string;
  phone: string;
  email: string;
  city: string;
  commune: string;
  address: string;
  note: string;
  payment: Payment;
}

const INITIAL_FORM: FormState = {
  name: '',
  phone: '',
  email: '',
  city: 'Kinshasa',
  commune: '',
  address: '',
  note: '',
  payment: 'cod',
};

export default function CheckoutPage() {
  const { items, subtotal, clearCart } = useCart();
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [terms, setTerms] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [whatsappUrl, setWhatsappUrl] = useState<string | null>(null);
  const delivery = deliveryFee(subtotal);
  const total = subtotal + delivery;
  const count = items.reduce((sum, item) => sum + item.quantity, 0);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: '' }));
  }

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (form.name.trim().length < 2) next.name = 'Indiquez votre nom complet.';
    if (!/^[+0-9][0-9\s().-]{7,19}$/.test(form.phone.trim())) {
      next.phone = 'Indiquez un numéro valide (ex. +243 811 860 632).';
    }
    if (form.city.trim().length < 2) next.city = 'Indiquez votre ville.';
    if (form.commune.trim().length < 2) next.commune = 'Indiquez votre commune.';
    if (form.address.trim().length < 5) next.address = 'Indiquez une adresse ou un point de repère.';
    if (!terms) next.terms = 'Confirmez les conditions de commande.';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (items.length === 0) return;
    if (!validate()) return;

    const paymentLabel =
      PAYMENT_OPTIONS.find(([value]) => value === form.payment)?.[1] ?? 'Paiement à la livraison';

    const lines = items.map(
      (item, index) =>
        `${index + 1}. ${item.name}${item.variantLabel ? ` — ${item.variantLabel}` : ''}\n   Quantité : ${item.quantity} · ${formatPrice(item.price * item.quantity)}`,
    );

    const message = [
      'NOUVELLE COMMANDE — MF BUSINESS',
      '',
      `Client : ${form.name}`,
      `Téléphone : ${form.phone}`,
      form.email ? `E-mail : ${form.email}` : null,
      `Ville : ${form.city}`,
      `Commune : ${form.commune}`,
      `Adresse : ${form.address}`,
      form.note ? `Note : ${form.note}` : null,
      '',
      'PRODUITS',
      ...lines,
      '',
      `Sous-total : ${formatPrice(subtotal)}`,
      `Livraison : ${delivery === 0 ? 'Offerte' : formatPrice(delivery)}`,
      `TOTAL : ${formatPrice(total)}`,
      '',
      `Paiement : ${paymentLabel}`,
      `Articles : ${count}`,
      '',
      'Merci de confirmer la disponibilité et le créneau de livraison.',
    ]
      .filter((line) => line !== null)
      .join('\n');

    const url = `https://wa.me/243811860632?text=${encodeURIComponent(message)}`;
    setWhatsappUrl(url);
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  if (items.length === 0 && !whatsappUrl) {
    return (
      <main className="cart-page">
        <div className="container">
          <div className="cart-empty">
            <h1 className="display">Votre panier est vide.</h1>
            <p>Ajoutez un produit avant de passer commande.</p>
            <Link className="btn btn--dark" href="/catalogue">
              Explorer le catalogue
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="checkout-page">
      <div className="container">
        <nav className="breadcrumb" aria-label="Fil d’Ariane">
          <Link href="/">Accueil</Link>
          <span aria-hidden="true">/</span>
          <Link href="/panier">Panier</Link>
          <span aria-hidden="true">/</span>
          <span>Commande</span>
        </nav>

        <div className="checkout-head">
          <p className="eyebrow">Dernière étape</p>
          <h1 className="display">
            Finalisons <em>votre commande.</em>
          </h1>
          <p>
            Renseignez vos coordonnées : le récapitulatif sera envoyé sur WhatsApp pour confirmation.
          </p>
        </div>

        {whatsappUrl && (
          <div className="checkout-success">
            <p className="eyebrow">Commande préparée</p>
            <h2 className="display">Le message WhatsApp est prêt.</h2>
            <p>
              Si la fenêtre WhatsApp ne s’est pas ouverte, cliquez sur le bouton ci-dessous. Un
              conseiller confirmera la disponibilité et le paiement.
            </p>
            <div className="checkout-success__actions">
              <a className="btn btn--dark" href={whatsappUrl} target="_blank" rel="noopener">
                <WhatsappIcon /> Ouvrir WhatsApp
              </a>
              <button
                className="btn btn--outline"
                type="button"
                onClick={() => {
                  clearCart();
                  setWhatsappUrl(null);
                }}
              >
                Vider le panier
              </button>
            </div>
          </div>
        )}

        <div className="checkout-layout">
          <form className="checkout-form" onSubmit={handleSubmit} noValidate>
            <fieldset>
              <legend>Vos coordonnées</legend>
              <div className="field-row">
                <label className="field">
                  <span>Nom complet *</span>
                  <input
                    value={form.name}
                    onChange={(event) => update('name', event.target.value)}
                    autoComplete="name"
                    placeholder="Votre nom"
                  />
                  {errors.name && <em>{errors.name}</em>}
                </label>
                <label className="field">
                  <span>Téléphone / WhatsApp *</span>
                  <input
                    value={form.phone}
                    onChange={(event) => update('phone', event.target.value)}
                    autoComplete="tel"
                    placeholder="+243 811 860 632"
                  />
                  {errors.phone && <em>{errors.phone}</em>}
                </label>
              </div>
              <label className="field">
                <span>E-mail (facultatif)</span>
                <input
                  type="email"
                  value={form.email}
                  onChange={(event) => update('email', event.target.value)}
                  autoComplete="email"
                  placeholder="vous@exemple.com"
                />
              </label>
            </fieldset>

            <fieldset>
              <legend>Livraison</legend>
              <div className="field-row">
                <label className="field">
                  <span>Ville *</span>
                  <input
                    value={form.city}
                    onChange={(event) => update('city', event.target.value)}
                    autoComplete="address-level2"
                  />
                  {errors.city && <em>{errors.city}</em>}
                </label>
                <label className="field">
                  <span>Commune *</span>
                  <input
                    value={form.commune}
                    onChange={(event) => update('commune', event.target.value)}
                    autoComplete="address-level3"
                    placeholder="Gombe, Limete, Ngaliema…"
                  />
                  {errors.commune && <em>{errors.commune}</em>}
                </label>
              </div>
              <label className="field">
                <span>Adresse / point de repère *</span>
                <input
                  value={form.address}
                  onChange={(event) => update('address', event.target.value)}
                  autoComplete="street-address"
                  placeholder="Avenue, numéro, référence"
                />
                {errors.address && <em>{errors.address}</em>}
              </label>
              <label className="field">
                <span>Note pour le livreur (facultatif)</span>
                <textarea
                  value={form.note}
                  onChange={(event) => update('note', event.target.value)}
                  rows={3}
                  placeholder="Un détail utile pour la livraison"
                />
              </label>
            </fieldset>

            <fieldset>
              <legend>Paiement</legend>
              <div className="payment-options">
                {PAYMENT_OPTIONS.map(([value, label]) => (
                  <label className="payment-option" key={value}>
                    <input
                      type="radio"
                      name="payment"
                      value={value}
                      checked={form.payment === value}
                      onChange={() => update('payment', value)}
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
              <p className="checkout-form__hint">
                Aucun paiement n’est prélevé sur le site. La confirmation et le paiement se font
                avec le conseiller.
              </p>
            </fieldset>

            <label className="checkout-terms">
              <input
                type="checkbox"
                checked={terms}
                onChange={(event) => {
                  setTerms(event.target.checked);
                  setErrors((current) => ({ ...current, terms: '' }));
                }}
              />
              <span>
                J’accepte que mes coordonnées soient utilisées pour traiter cette commande. *
              </span>
            </label>
            {errors.terms && <em className="checkout-error">{errors.terms}</em>}

            <button className="btn btn--dark checkout-submit" type="submit">
              Envoyer la commande sur WhatsApp
            </button>
          </form>

          <aside className="checkout-summary">
            <h2>Votre commande</h2>
            <div className="checkout-summary__items">
              {items.map((item) => {
                const image = imageUrl(item.image);
                return (
                  <div className="checkout-summary__item" key={`${item.productId}-${item.variantId}`}>
                    {image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={image} alt="" width={80} height={80} />
                    ) : null}
                    <div>
                      <strong>{item.name}</strong>
                      <span>
                        {item.variantLabel} · ×{item.quantity}
                      </span>
                    </div>
                    <em>{formatPrice(item.price * item.quantity)}</em>
                  </div>
                );
              })}
            </div>
            <div className="cart-summary__row">
              <span>Sous-total</span>
              <strong>{formatPrice(subtotal)}</strong>
            </div>
            <div className="cart-summary__row">
              <span>Livraison</span>
              <strong>{delivery === 0 ? 'Offerte' : formatPrice(delivery)}</strong>
            </div>
            <div className="cart-summary__total">
              <span>Total</span>
              <strong>{formatPrice(total)}</strong>
            </div>
            <Link className="checkout-back" href="/panier">
              ← Modifier le panier
            </Link>
          </aside>
        </div>
      </div>
    </main>
  );
}

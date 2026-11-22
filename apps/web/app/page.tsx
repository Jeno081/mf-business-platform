import { CategoryCard } from '@/components/CategoryCard';
import { ProductCard } from '@/components/ProductCard';
import { SectionHead } from '@/components/SectionHead';
import {
  ArrowIcon,
  HeadsetIcon,
  ShieldIcon,
  SparkIcon,
  StarIcon,
  TruckIcon,
  WhatsappIcon,
} from '@/components/Icons';
import { formatPrice, getHomeData, imageUrl } from '@/lib/api';

export const revalidate = 120;

const VALUES = [
  {
    icon: ShieldIcon,
    title: 'Des appareils authentiques',
    text: 'Chaque téléphone est vérifié, scellé et garanti 12 mois. Aucune mauvaise surprise, jamais de boîte ouverte.',
  },
  {
    icon: HeadsetIcon,
    title: 'Un conseil, pas un discours',
    text: 'Vous avez un budget, un usage, une contrainte ? On vous dit ce qui compte vraiment, sans jargon.',
  },
  {
    icon: TruckIcon,
    title: 'Une livraison soignée',
    text: 'Emballage protégé, livreur en main propre, créneau confirmé. Kinshasa et environs, 24–48 h.',
  },
  {
    icon: SparkIcon,
    title: 'Un suivi dans le temps',
    text: 'Une question six mois après ? La maison reste joignable, sur WhatsApp, sans mur ni formulaire.',
  },
];

const TESTIMONIALS = [
  {
    quote:
      'J’hésitais entre deux modèles. On m’a demandé ce que j’en ferais avant de me conseiller. Deux mois après, aucun regret.',
    name: 'Alain K.',
    detail: 'iPhone 15',
  },
  {
    quote:
      'Commande passée sur WhatsApp à 11 h, livrée avant 18 h le même jour. Le téléphone était scellé, avec la facture.',
    name: 'Mireille M.',
    detail: 'Samsung Galaxy S24',
  },
  {
    quote:
      'Ma fille voulait un iPad pour l’école. On est repartis avec la bonne coque et un chargeur, sans se ruiner.',
    name: 'Sandrine T.',
    detail: 'iPad (2025)',
  },
];

export default async function HomePage() {
  const { featured, categories, brands, hero, promoProducts, totalProducts } = await getHomeData();
  const heroImage = imageUrl(hero.image);

  return (
    <main id="main">
      <section className="hero">
        <div className="container hero__grid">
          <div className="hero__copy">
            <p className="eyebrow eyebrow--light">Maison Forlife Business · Kinshasa</p>
            <h1>
              La tech qui vous ressemble, <em>livrée avec soin.</em>
            </h1>
            <p className="hero__lead">
              iPhone, Samsung, Huawei, Xiaomi, iPad, Tecno… Des appareils authentiques, garantis
              12 mois, choisis par des humains et livrés à votre porte.
            </p>
            <div className="hero__actions">
              <a className="btn btn--gold" href="#featured">
                Explorer la sélection <ArrowIcon />
              </a>
              <a
                className="btn btn--ghost-light"
                href="https://wa.me/243811860632?text=Bonjour%20MF%20Business%2C%20j%27aimerais%20un%20conseil."
                target="_blank"
                rel="noopener"
              >
                <WhatsappIcon /> Commander sur WhatsApp
              </a>
            </div>
            <dl className="hero__stats">
              <div>
                <dt>{totalProducts}</dt>
                <dd>références en boutique</dd>
              </div>
              <div>
                <dt>12</dt>
                <dd>mois de garantie</dd>
              </div>
              <div>
                <dt>24–48 h</dt>
                <dd>livraison à domicile</dd>
              </div>
            </dl>
          </div>

          <div className="hero__stage">
            <span className="hero__glow" aria-hidden="true" />
            <span className="hero__ring" aria-hidden="true" />
            <div className="hero__device-card">
              {heroImage && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={heroImage} alt={hero.name} width={900} height={900} />
              )}
            </div>
            <div className="hero__chip hero__chip--care">
              <ShieldIcon />
              <div>
                <strong>Garantie 12 mois</strong>
                <span>Appareils vérifiés</span>
              </div>
            </div>
            <div className="hero__chip hero__chip--delivery">
              <TruckIcon />
              <div>
                <strong>Livraison 24–48 h</strong>
                <span>Kinshasa</span>
              </div>
            </div>
            <div className="hero__price">
              <span>À partir de</span>
              <strong>{formatPrice(hero.price)}</strong>
            </div>
          </div>
        </div>

        <div className="container hero__foot">
          <p>Marques disponibles</p>
          <ul className="brand-strip">
            {brands.slice(0, 8).map((brand) => (
              <li key={brand.id}>{brand.name}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="section" id="categories">
        <div className="container">
          <SectionHead
            eyebrow="Parcourir"
            title={
              <>
                Quatre univers, une <em>même exigence.</em>
              </>
            }
            note="Du flagship au premier smartphone : chaque produit est choisi pour sa fiabilité, pas pour son étiquette."
            action={{ href: '#featured', label: 'Voir la sélection' }}
          />

          <div className="category-grid">
            {categories.map((category) => (
              <CategoryCard key={category.id} category={category} />
            ))}
          </div>
        </div>
      </section>

      <section className="section section--products" id="featured">
        <div className="container">
          <SectionHead
            eyebrow="Sélection de la maison"
            title={
              <>
                Les favoris <em>du moment.</em>
              </>
            }
            note="Les modèles que je recommande le plus souvent en boutique — et que je réapprovisionne le plus vite."
            action={{ href: '#categories', label: 'Explorer les univers' }}
          />

          <div className="product-grid">
            {featured.map((product, index) => (
              <ProductCard key={product.id} product={product} priority={index < 4} />
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="promo">
            <div className="promo__copy">
              <p className="eyebrow eyebrow--light">Les essentiels</p>
              <h2 className="display">
                Les petits accessoires qui <em>changent tout.</em>
              </h2>
              <p>
                Une coque qui protège vraiment, un chargeur qui tient la route, un câble qui ne
                lâche pas. Les détails font une journée sans accroc.
              </p>
              <a className="btn btn--gold" href="#featured">
                Découvrir les accessoires <ArrowIcon />
              </a>
            </div>
            <div className="promo__visual">
              {promoProducts.slice(0, 3).map((product) => {
                const image = imageUrl(product.image);
                return image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={product.id}
                    src={image}
                    alt={product.imageAlt ?? product.name}
                    width={900}
                    height={900}
                  />
                ) : null;
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="section" id="values">
        <div className="container">
          <SectionHead
            eyebrow="La différence MF"
            title={
              <>
                Le service, <em>sans compromis.</em>
              </>
            }
            note="Une boutique de quartier avec les exigences d’une grande maison. C’est tout simple, et c’est rare."
          />

          <div className="value-grid">
            {VALUES.map((value, index) => {
              const Icon = value.icon;
              return (
                <article className="value-card" key={value.title}>
                  <span className="value-card__number">0{index + 1}</span>
                  <span className="value-card__icon">
                    <Icon />
                  </span>
                  <h3>{value.title}</h3>
                  <p>{value.text}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="section section--reviews">
        <div className="container">
          <SectionHead
            eyebrow="Ils ont acheté chez nous"
            title={
              <>
                La confiance <em>se raconte.</em>
              </>
            }
            note="Des clients de Kinshasa, Lubumbashi et Goma — et quelques habitués qui reviennent pour l’accompagnement avant l’achat."
          />

          <div className="review-grid">
            {TESTIMONIALS.map((review) => (
              <article className="review-card" key={review.name}>
                <div className="review-card__stars" aria-label="5 étoiles sur 5">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <StarIcon key={index} />
                  ))}
                </div>
                <blockquote>« {review.quote} »</blockquote>
                <footer>
                  <span className="review-card__avatar">{review.name.charAt(0)}</span>
                  <div>
                    <strong>{review.name}</strong>
                    <span>{review.detail}</span>
                  </div>
                </footer>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section section--cta" id="contact">
        <div className="container cta">
          <div>
            <p className="eyebrow">Un doute, une hésitation ?</p>
            <h2 className="display">
              Parlons de votre <em>prochain téléphone.</em>
            </h2>
          </div>
          <div className="cta__actions">
            <a
              className="btn btn--dark"
              href="https://wa.me/243811860632?text=Bonjour%20MF%20Business%2C%20je%20cherche%20un%20téléphone."
              target="_blank"
              rel="noopener"
            >
              <WhatsappIcon /> Écrire sur WhatsApp
            </a>
            <a className="btn btn--outline" href="tel:+243811860632">
              +243 811 860 632
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}

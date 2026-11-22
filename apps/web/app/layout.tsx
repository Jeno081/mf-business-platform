import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { CartProvider } from '@/components/CartProvider';
import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import { PwaRegister } from '@/components/PwaRegister';
import './globals.css';

export const metadata: Metadata = {
  title: 'MF Business — Téléphones & accessoires à Kinshasa | Maison Forlife Business',
  description:
    'iPhone, Samsung, Huawei, Xiaomi, iPad, Tecno : des appareils authentiques, garantis 12 mois et livrés à Kinshasa. Paiement à la livraison.',
  applicationName: 'MF Business',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'MF Business' },
  icons: {
    icon: '/favicon.png',
    apple: '/icons/apple-touch-icon.png',
  },
  openGraph: {
    title: 'MF Business — La tech, avec soin.',
    description:
      'Téléphones et accessoires choisis avec soin. Livraison 24–48 h à Kinshasa, garantie 12 mois.',
    type: 'website',
    locale: 'fr_CD',
  },
};

export const viewport: Viewport = {
  themeColor: '#0f0f0f',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="fr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Bodoni+Moda:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <a className="skip-link" href="#main">
          Aller au contenu
        </a>
        <CartProvider>
          <Header />
          {children}
          <Footer />
        </CartProvider>
        <PwaRegister />
      </body>
    </html>
  );
}

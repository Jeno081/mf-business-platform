import Link from 'next/link';

export const metadata = {
  title: 'Hors ligne — MF Business',
};

export default function OfflinePage() {
  return (
    <main className="offline-page">
      <div className="container">
        <p className="eyebrow">Pas de connexion</p>
        <h1 className="display">
          La boutique est <em>hors ligne.</em>
        </h1>
        <p>
          Vérifiez votre connexion internet. Les pages déjà consultées restent disponibles, mais
          les prix et stocks seront actualisés au retour du réseau.
        </p>
        <Link className="btn btn--dark" href="/">
          Réessayer
        </Link>
      </div>
    </main>
  );
}

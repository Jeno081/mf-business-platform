'use client';

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="container" style={{ padding: '120px 0', minHeight: '60vh' }}>
      <p className="eyebrow">Un instant</p>
      <h1 className="display">La sélection est momentanément indisponible.</h1>
      <p style={{ maxWidth: 520, marginTop: 18, color: 'var(--muted)' }}>
        Le catalogue n’a pas pu être chargé. Vérifiez votre connexion et réessayez dans quelques
        instants.
      </p>
      <button className="btn btn--dark" type="button" onClick={reset} style={{ marginTop: 26 }}>
        Réessayer
      </button>
    </main>
  );
}

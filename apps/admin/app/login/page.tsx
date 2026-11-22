import { LoginForm } from '@/components/LoginForm';

export default function LoginPage() {
  return (
    <main className="login-page">
      <section className="login-brand">
        <div className="login-brand__top">
          <span className="admin-logo admin-logo--light">MF</span>
          <span>
            <strong>Maison Forlife</strong>
            <em>Business</em>
          </span>
        </div>
        <div className="login-brand__copy">
          <p className="admin-eyebrow admin-eyebrow--light">Back-office</p>
          <h2>
            La maison, <em>sous contrôle.</em>
          </h2>
          <p>Commandes, produits, stocks et paiements réunis dans un espace privé.</p>
        </div>
        <div className="login-brand__foot">
          <span>Kinshasa · RDC</span>
          <span>Accès sécurisé · 2FA obligatoire</span>
        </div>
      </section>
      <section className="login-panel">
        <LoginForm />
      </section>
    </main>
  );
}

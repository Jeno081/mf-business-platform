'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { AdminApiError, type SetupResponse } from '@/lib/api';
import { useAuth } from './AuthProvider';
import { CopyIcon } from './Icons';

type Step = 'credentials' | 'totp' | 'setup' | 'codes';

export function LoginForm() {
  const router = useRouter();
  const { user, loading, login, startSetup, enableSetup } = useAuth();
  const [step, setStep] = useState<Step>('credentials');
  const [email, setEmail] = useState('jenovicmulomba@gmail.com');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [useRecovery, setUseRecovery] = useState(false);
  const [setupToken, setSetupToken] = useState('');
  const [setup, setSetup] = useState<SetupResponse | null>(null);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!loading && user && step !== 'codes') router.replace('/');
  }, [loading, user, step, router]);

  async function handleCredentials(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const result = await login(email.trim(), password);
      if ('requiresTwoFactorSetup' in result) {
        const setupData = await startSetup(result.setupToken);
        setSetupToken(result.setupToken);
        setSetup(setupData);
        setStep('setup');
        return;
      }
      router.replace('/');
    } catch (err) {
      if (err instanceof AdminApiError && err.code === 'TWO_FACTOR_REQUIRED') {
        setStep('totp');
        setError('Saisissez le code de votre application d’authentification.');
      } else {
        setError(err instanceof Error ? err.message : 'Connexion impossible.');
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleSecondFactor(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await login(email.trim(), password, useRecovery ? { recoveryCode: code } : { totp: code });
      router.replace('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Code invalide.');
    } finally {
      setBusy(false);
    }
  }

  async function handleSetup(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const result = await enableSetup(setupToken, code);
      setRecoveryCodes(result.recoveryCodes);
      setStep('codes');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Code invalide.');
    } finally {
      setBusy(false);
    }
  }

  async function copyCodes() {
    await navigator.clipboard.writeText(recoveryCodes.join('\n'));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  if (loading) {
    return (
      <div className="login-card login-card--loading">
        <span className="admin-boot__mark">MF</span>
        <p>Vérification de la session…</p>
      </div>
    );
  }

  return (
    <div className="login-card">
      <div className="login-card__head">
        <span className="admin-logo admin-logo--light">MF</span>
        <p className="admin-eyebrow">Espace réservé</p>
        <h1>
          {step === 'setup' ? 'Protégez votre accès.' : step === 'codes' ? 'Vos codes de secours.' : 'Bon retour.'}
        </h1>
        <p>
          {step === 'credentials' && 'Connectez-vous pour gérer la boutique, les commandes et les stocks.'}
          {step === 'totp' && 'La double authentification protège votre back-office.'}
          {step === 'setup' && 'Scannez le QR code avec Google Authenticator, Authy ou 1Password.'}
          {step === 'codes' && 'Conservez ces codes hors ligne. Ils permettent de récupérer l’accès si vous perdez votre téléphone.'}
        </p>
      </div>

      {error && <div className="admin-alert admin-alert--danger">{error}</div>}

      {step === 'credentials' && (
        <form className="login-form" onSubmit={handleCredentials}>
          <label className="admin-field">
            <span>E-mail administrateur</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="username"
              required
            />
          </label>
          <label className="admin-field">
            <span>Mot de passe</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
            />
          </label>
          <button className="admin-btn admin-btn--primary" type="submit" disabled={busy}>
            {busy ? 'Connexion…' : 'Se connecter'}
          </button>
          <p className="login-form__note">
            Première connexion : l’application vous guidera pour configurer la 2FA.
          </p>
        </form>
      )}

      {step === 'totp' && (
        <form className="login-form" onSubmit={handleSecondFactor}>
          <label className="admin-field">
            <span>{useRecovery ? 'Code de secours' : 'Code à 6 chiffres'}</span>
            <input
              value={code}
              onChange={(event) => setCode(event.target.value)}
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder={useRecovery ? 'XXXX-XXXX' : '000000'}
              autoFocus
              required
            />
          </label>
          <button className="admin-btn admin-btn--primary" type="submit" disabled={busy}>
            {busy ? 'Vérification…' : 'Vérifier le code'}
          </button>
          <button
            className="login-form__link"
            type="button"
            onClick={() => {
              setUseRecovery((value) => !value);
              setCode('');
              setError('');
            }}
          >
            {useRecovery ? 'Utiliser mon application d’authentification' : 'Utiliser un code de secours'}
          </button>
        </form>
      )}

      {step === 'setup' && setup && (
        <form className="login-form" onSubmit={handleSetup}>
          <div className="login-qr">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={setup.qrCodeDataUrl} alt="QR code de configuration 2FA" />
          </div>
          <p className="login-secret">
            Ou saisissez la clé : <code>{setup.secret}</code>
          </p>
          <label className="admin-field">
            <span>Code affiché dans l’application</span>
            <input
              value={code}
              onChange={(event) => setCode(event.target.value)}
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="000000"
              autoFocus
              required
            />
          </label>
          <button className="admin-btn admin-btn--primary" type="submit" disabled={busy}>
            {busy ? 'Activation…' : 'Activer la 2FA'}
          </button>
        </form>
      )}

      {step === 'codes' && (
        <div className="login-codes">
          <div className="login-codes__grid">
            {recoveryCodes.map((item) => (
              <code key={item}>{item}</code>
            ))}
          </div>
          <button className="admin-btn admin-btn--ghost" type="button" onClick={copyCodes}>
            <CopyIcon /> {copied ? 'Codes copiés' : 'Copier les codes'}
          </button>
          <button className="admin-btn admin-btn--primary" type="button" onClick={() => router.replace('/')}>
            Entrer dans le dashboard
          </button>
        </div>
      )}
    </div>
  );
}

'use client';

import Link from 'next/link';
import { SyntheticEvent, useState } from 'react';
import { ArrowRight, CircleUserRound, LoaderCircle } from 'lucide-react';

export function AuthForm({ mode }: { mode: 'login' | 'register' }) {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const isRegister = mode === 'register';

  async function submit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError('');
    const form = new FormData(event.currentTarget);
    const response = await fetch(`/api/auth/${mode}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: form.get('email'), password: form.get('password') }),
    });
    const data = await response.json() as { error?: { message?: string } };
    if (!response.ok) {
      setError(data.error?.message ?? 'Unable to continue.');
      setLoading(false);
      return;
    }
    window.location.assign('/dashboard');
  }

  return (
    <div className="auth-panel">
      {/* OAuth must begin with a top-level browser navigation. */}
      {/* oxlint-disable-next-line next/no-html-link-for-pages */}
      <a className="google-button" href="/api/auth/google">
        <CircleUserRound size={17} /> Continue with Google
      </a>
      <div className="auth-divider"><span>or use email</span></div>
      <form onSubmit={submit} className="auth-form">
        <label>
          <span>Email</span>
          <input name="email" type="email" autoComplete="email" required placeholder="you@example.com" />
        </label>
        <label>
          <span>Password</span>
          <input name="password" type="password" minLength={12} maxLength={128}
            autoComplete={isRegister ? 'new-password' : 'current-password'} required placeholder="At least 12 characters" />
        </label>
        {error && <p className="auth-error" role="alert">{error}</p>}
        <button className="button button-primary auth-submit" disabled={loading}>
          {loading ? <LoaderCircle className="animate-spin" size={17} /> : <>{isRegister ? 'Create account' : 'Sign in'} <ArrowRight size={17} /></>}
        </button>
      </form>
      <p className="auth-switch">
        {isRegister ? 'Already have an account?' : 'New to Redwood?'}{' '}
        <Link href={isRegister ? '/signin' : '/signup'}>{isRegister ? 'Sign in' : 'Create one'}</Link>
      </p>
    </div>
  );
}

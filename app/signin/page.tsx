'use client';

import { LanguageSelect, useLocale } from '@/components/locale-provider';
import { authCopy } from '@/lib/auth-copy';
import { AuthForm } from '@/components/auth-form';
import Link from 'next/link';

export default function SignInPage() {
  const copy = authCopy[useLocale().locale];
  return (
    <main className="auth-page">
      <Link href="/" className="auth-brand"><span className="brand-mark"><span /></span><strong>REDWOOD RESEARCH</strong></Link>
      <LanguageSelect />
      <section>
        <span className="section-index">{copy.member}</span>
        <h1>{copy.welcome}</h1>
        <p>{copy.loginIntro}</p>
        <AuthForm mode="login" />
      </section>
      <p className="auth-disclosure">{copy.disclosure}</p>
    </main>
  );
}

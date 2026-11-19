'use client';

import { LanguageSelect, useLocale } from '@/components/locale-provider';
import { authCopy } from '@/lib/auth-copy';
import { AuthForm } from '@/components/auth-form';
import Link from 'next/link';

export default function SignUpPage() {
  const copy = authCopy[useLocale().locale];
  return (
    <main className="auth-page">
      <Link href="/" className="auth-brand"><span className="brand-mark"><span /></span><strong>REDWOOD</strong></Link>
      <LanguageSelect />
      <section>
        <span className="section-index">{copy.register}</span>
        <h1>{copy.begin}</h1>
        <p>{copy.registerIntro}</p>
        <AuthForm mode="register" />
      </section>
      <p className="auth-disclosure">{copy.registerDisclosure}</p>
    </main>
  );
}

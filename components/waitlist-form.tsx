'use client';

import { ArrowRight, Check } from 'lucide-react';
import { useId, useState } from 'react';

type WaitlistFormProps = {
  source: 'header' | 'footer';
  inverted?: boolean;
};

export function WaitlistForm({ source, inverted = false }: WaitlistFormProps) {
  const inputId = useId();
  const [expanded, setExpanded] = useState(source === 'footer');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  async function submit(event: { preventDefault(): void; currentTarget: HTMLFormElement }) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const emailValue = form.get('email');
    const companyValue = form.get('company');
    const email = typeof emailValue === 'string' ? emailValue.trim() : '';
    const company = typeof companyValue === 'string' ? companyValue : '';

    setStatus('submitting');
    setMessage('');

    try {
      const response = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, company, source }),
      });
      const data = (await response.json()) as { ok: boolean; message?: string; error?: string };
      if (!response.ok || !data.ok) throw new Error(data.error ?? 'Unable to join right now.');
      setStatus('success');
      setMessage(data.message ?? 'You’re on the list.');
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Unable to join right now.');
    }
  }

  if (status === 'success') {
    return <output className={`waitlist-success ${inverted ? 'waitlist-inverted' : ''}`}><Check size={17} /> {message}</output>;
  }

  if (!expanded) {
    return <button type="button" className="button button-outline" onClick={() => setExpanded(true)} aria-expanded="false">Join private beta <ArrowRight size={15} /></button>;
  }

  return (
    <form className={`waitlist-form ${inverted ? 'waitlist-inverted' : ''}`} onSubmit={submit} noValidate>
      <label className="sr-only" htmlFor={inputId}>Email address</label>
      <input id={inputId} name="email" type="email" inputMode="email" autoComplete="email" placeholder="you@company.com" required maxLength={254} />
      <input className="hidden" name="company" tabIndex={-1} autoComplete="off" aria-hidden="true" />
      <button type="submit" disabled={status === 'submitting'} aria-label="Join the Redwood private beta">
        {status === 'submitting' ? <span className="submit-spinner" /> : <ArrowRight size={18} />}
      </button>
      {status === 'error' && <p className="waitlist-error" role="alert">{message}</p>}
    </form>
  );
}

'use client';

import { ArrowRight, Check } from 'lucide-react';
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

type WaitlistFormProps = {
  source: 'header' | 'footer';
  inverted?: boolean;
};

export function WaitlistForm({ source, inverted = false }: WaitlistFormProps) {
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  async function submit(event: { preventDefault(): void; currentTarget: HTMLFormElement }) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const value = (key: string) => {
      const item = form.get(key);
      return typeof item === 'string' ? item.trim() : '';
    };

    setStatus('submitting');
    setMessage('');

    try {
      const response = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: value('name'),
          email: value('email'),
          company: value('company'),
          message: value('message'),
          fax: value('fax'),
          source,
        }),
      });
      const data = (await response.json()) as { ok: boolean; message?: string; error?: string };
      if (!response.ok || !data.ok) throw new Error(data.error ?? 'Unable to send your request.');

      const subject = `Redwood private beta request — ${value('name')}`;
      const body = [
        'Hello Redwood team,',
        '',
        'I would like to request access to the Redwood private beta.',
        '',
        `Name: ${value('name')}`,
        `Email: ${value('email')}`,
        `Company: ${value('company') || 'Not provided'}`,
        '',
        'What I am looking for:',
        value('message') || 'Not provided',
      ].join('\n');

      formElement.reset();
      setStatus('success');
      setMessage('Your email draft is ready. Review it in your email app, then press Send.');
      window.location.href = `mailto:request@cortexhubs.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Unable to send your request.');
    }
  }

  return (
    <Dialog onOpenChange={(open) => { if (!open && status !== 'submitting') { setStatus('idle'); setMessage(''); } }}>
      <DialogTrigger className={inverted ? 'button beta-trigger beta-trigger-inverted' : 'button button-outline'}>
        Join private beta <ArrowRight size={16} />
      </DialogTrigger>
      <DialogContent className="beta-dialog" showCloseButton={status !== 'submitting'}>
        {status === 'success' ? (
          <output className="beta-success">
            <span><Check size={22} /></span>
            <DialogTitle>Email draft opened</DialogTitle>
            <DialogDescription>{message}</DialogDescription>
          </output>
        ) : (
          <>
            <DialogHeader>
              <span className="section-index">PRIVATE BETA / REDWOOD</span>
              <DialogTitle className="beta-title">Tell us about yourself.</DialogTitle>
              <DialogDescription>Share a few details, then send the prepared email from your email app.</DialogDescription>
            </DialogHeader>
            <form className="beta-form" onSubmit={submit}>
              <div className="beta-field-row">
                <label><span>Name *</span><input name="name" type="text" autoComplete="name" placeholder="Your name" maxLength={100} required /></label>
                <label><span>Email *</span><input name="email" type="email" inputMode="email" autoComplete="email" placeholder="you@company.com" maxLength={254} required /></label>
              </div>
              <label><span>Company <i>optional</i></span><input name="company" type="text" autoComplete="organization" placeholder="Company or fund" maxLength={160} /></label>
              <label><span>What are you looking for? <i>optional</i></span><textarea name="message" placeholder="Tell us about your research workflow or what you’d like to explore with Redwood." rows={4} maxLength={2000} /></label>
              <input className="hidden" name="fax" tabIndex={-1} autoComplete="off" aria-hidden="true" />
              {status === 'error' && <p className="beta-error" role="alert">{message}</p>}
              <button className="beta-submit" type="submit" disabled={status === 'submitting'}>
                {status === 'submitting' ? <><span className="submit-spinner" /> Preparing email</> : <>Continue to email <ArrowRight size={17} /></>}
              </button>
              <p className="beta-privacy">This opens your email app with a message addressed to request@cortexhubs.com.</p>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

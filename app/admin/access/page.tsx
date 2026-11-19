'use client';

import Link from 'next/link';
import { type SubmitEvent, useEffect, useState } from 'react';
import type { Feature } from '@/lib/auth/features';

const labels: Record<Feature, string> = {
  portfolio: 'Portfolio analysis',
  volume_profile: 'Volume Profile',
  market_sentiment: 'Market Sentiment',
};

type AuditPage = {
  history: Array<{
    sequence: number; feature: Feature; action: 'grant' | 'revoke'; source: 'manual' | 'payment';
    actor_email: string | null; created_at: string; expires_at: string | null;
  }>;
  next_before: number | null;
};

type Target = AuditPage & {
  id: string;
  email: string;
  google_linked: number;
  admin: boolean;
  features: Record<Feature, {
    allowed: boolean;
    expired: boolean;
    event: { action: string; source: string; created_at: string; expires_at: string | null } | null;
  }>;
};

export default function AdminAccessPage() {
  const [status, setStatus] = useState('loading');
  const [target, setTarget] = useState<Target>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/feature-access').then(async response => {
      if (response.status === 401) setStatus('signin');
      else if (!response.ok) setStatus('error');
      else setStatus((await response.json() as { admin: boolean }).admin ? 'ready' : 'denied');
    }).catch(() => setStatus('error'));
  }, []);

  async function perform(request: Promise<Response>) {
    setBusy(true);
    setError('');
    try {
      const response = await request;
      const data = await response.json() as Target & { error?: { message?: string } };
      if (!response.ok) throw new Error(data.error?.message ?? 'Request failed.');
      setTarget(data);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Request failed.');
    } finally {
      setBusy(false);
    }
  }

  async function loadOlder() {
    if (!target || target.next_before === null) return;
    setBusy(true);
    setError('');
    try {
      const params = new URLSearchParams({ email: target.email, before: String(target.next_before) });
      const response = await fetch('/api/admin/feature-access?' + params.toString());
      const data = await response.json() as AuditPage & { error?: { message?: string } };
      if (!response.ok) throw new Error(data.error?.message ?? 'Unable to load permission history.');
      setTarget({ ...target, history: [...target.history, ...data.history], next_before: data.next_before });
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to load permission history.');
    } finally {
      setBusy(false);
    }
  }

  function lookup(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setTarget(undefined);
    const email = new FormData(event.currentTarget).get('email');
    if (typeof email !== 'string') return;
    void perform(fetch('/api/admin/feature-access?email=' + encodeURIComponent(email)));
  }

  function update(feature: Feature, action: 'grant' | 'revoke', expiresOn?: FormDataEntryValue | null) {
    if (!target) return;
    void perform(fetch('/api/admin/feature-access', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: target.email, targetId: target.id, feature, action, expiresOn }),
    }));
  }

  return (
    <main className="research-tool mx-auto max-w-5xl space-y-6 px-6 py-8">
      <nav className="text-sm"><Link href="/dashboard">Account</Link></nav>
      <h1 className="display-title">Feature access</h1>
      {status === 'loading' && <output className="block">Checking your account…</output>}
      {status === 'signin' && <Link className="button button-primary" href="/signin">Sign in to continue</Link>}
      {status === 'denied' && <p>Administrator access is required.</p>}
      {status === 'error' && <p role="alert">Unable to check administrator access.</p>}
      {status === 'ready' && <>
        <form onSubmit={lookup} className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-sm">Account email
            <input className="rounded border bg-background px-3 py-2" name="email" type="email" required disabled={busy} />
          </label>
          <button className="button button-primary" disabled={busy}>Find account</button>
        </form>
        {busy && <output className="block">Updating access information…</output>}
        {error && <p className="auth-error" role="alert">{error}</p>}
        {target && <section aria-label={target.email} className="space-y-3">
          <h2 className="text-xl font-semibold">{target.email}</h2>
          <p className="break-all text-sm">Account ID <code>{target.id}</code></p>
          <p className="text-sm">{target.google_linked ? 'Google sign-in linked.' : 'Redwood Research has not verified this email. Confirm the account ID with the member before granting access.'}</p>
          {target.admin && <p>Administrator · All features enabled</p>}
          {(Object.keys(labels) as Feature[]).map(feature => {
            const { allowed, expired, event } = target.features[feature];
            return <article key={feature} className="space-y-3 rounded border bg-card p-4">
              <h3 className="font-semibold">{labels[feature]} · {allowed ? 'Enabled' : expired ? 'Expired' : 'Disabled'}</h3>
              {event && <p className="text-sm">{event.action === 'grant' ? 'Granted' : 'Revoked'} · {event.source} · {new Date(event.created_at).toLocaleString()}
                {event.expires_at && ' · Expires ' + event.expires_at.slice(0, 10) + ' (UTC)'}</p>}
              {!target.admin && <form key={event?.created_at} className="flex flex-wrap items-end gap-3" onSubmit={submit => {
                submit.preventDefault();
                update(feature, 'grant', new FormData(submit.currentTarget).get('expiresOn'));
              }}>
                <label className="flex flex-col gap-1 text-sm">Expires on (optional, end of day UTC)
                  <input className="rounded border bg-background p-2" type="date" name="expiresOn"
                    defaultValue={allowed ? event?.expires_at?.slice(0, 10) : undefined} disabled={busy} />
                </label>
                <button className="button button-primary" disabled={busy}>{allowed ? 'Update grant' : 'Grant access'}</button>
                {(allowed || expired) && <button className="button button-outline" type="button" disabled={busy}
                  onClick={() => update(feature, 'revoke')}>Revoke</button>}
              </form>}
            </article>;
          })}
          <section className="space-y-3 rounded border bg-card p-4" aria-labelledby="access-history">
            <h3 id="access-history" className="font-semibold">Permission history</h3>
            {target.history.length === 0 ? <p className="text-sm">No recorded changes for this account.</p> :
              <ul className="divide-y text-sm">{target.history.map(event => (
                <li className="space-y-1 py-2" key={event.sequence}>
                  <div>{labels[event.feature]} · {event.action === 'grant' ? 'Granted' : 'Revoked'}</div>
                  <div className="text-muted-foreground">
                    {event.actor_email ?? (event.source === 'manual' ? 'Former administrator' : 'System')}
                    {' · '}{event.source}{' · '}
                    <time dateTime={event.created_at}>{new Date(event.created_at).toLocaleString()}</time>
                    {event.expires_at && ' · Expires ' + event.expires_at.slice(0, 10) + ' (UTC)'}
                  </div>
                </li>
              ))}</ul>}
            {target.next_before !== null && <button type="button" className="button button-outline"
              disabled={busy} onClick={() => void loadOlder()}>Load older changes</button>}
          </section>
        </section>}
      </>}
    </main>
  );
}

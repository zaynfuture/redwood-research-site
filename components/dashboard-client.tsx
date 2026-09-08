'use client';

import Link from 'next/link';
import { SyntheticEvent, useEffect, useState } from 'react';
import { BarChart3, Bot, Building2, CreditCard, LoaderCircle, LogOut, Send, Sparkles } from 'lucide-react';

interface Account {
  user: { email: string; displayName: string | null; plan: string; subscriptionStatus: string };
  can_chat: boolean;
  quota: { limit: number; used: number; remaining: number };
  usage_month: string;
}

interface Message { role: 'user' | 'assistant'; content: string }
interface MonthlyResearch {
  period: string;
  kind: 'stock_analysis' | 'market_outlook';
  title: string;
  summary: string;
  body: string;
  evidence: Array<{ id: string; label: string; locator?: string }>;
  publishedAt: string;
}

function resultText(value: unknown): string {
  if (typeof value === 'string') return value;
  return JSON.stringify(value, null, 2);
}

export function DashboardClient() {
  const [account, setAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [research, setResearch] = useState<MonthlyResearch[]>([]);
  const [selectedResearch, setSelectedResearch] = useState<MonthlyResearch | null>(null);

  useEffect(() => {
    fetch('/api/account').then(async (response) => {
      if (response.status === 401) { window.location.assign('/signin'); return; }
      if (!response.ok) throw new Error('account_request_failed');
      const nextAccount = await response.json() as Account;
      setAccount(nextAccount);
      if (nextAccount.can_chat) {
        const researchResponse = await fetch('/api/research/monthly');
        if (researchResponse.ok) {
          const data = await researchResponse.json() as { items: MonthlyResearch[] };
          setResearch(data.items);
        }
      }
      setLoading(false);
    }).catch(() => { setError('Unable to load your account.'); setLoading(false); });
  }, []);

  async function checkout() {
    setBusy(true); setError('');
    const response = await fetch('/api/billing/checkout', { method: 'POST' });
    const data = await response.json() as { url?: string; error?: { message?: string } };
    if (data.url) window.location.assign(data.url);
    else { setError(data.error?.message ?? 'Billing is unavailable.'); setBusy(false); }
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.assign('/');
  }

  async function ask(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const rawInput = new FormData(form).get('input');
    const input = typeof rawInput === 'string' ? rawInput.trim() : '';
    if (!input || busy) return;
    setBusy(true); setError('');
    setMessages((current) => [...current, { role: 'user', content: input }]);
    form.reset();
    const response = await fetch('/api/chat', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ input }) });
    const data = await response.json() as { result?: unknown; remaining?: number; error?: { message?: string } };
    if (!response.ok) setError(data.error?.message ?? 'The research service is unavailable.');
    else {
      setMessages((current) => [...current, { role: 'assistant', content: resultText(data.result) }]);
      setAccount((current) => current && data.remaining !== undefined ? { ...current, quota: { ...current.quota, used: current.quota.limit - data.remaining, remaining: data.remaining } } : current);
    }
    setBusy(false);
  }

  if (loading) return <main className="dashboard-loading"><LoaderCircle className="animate-spin" /> Loading workspace…</main>;
  if (!account) return <main className="dashboard-loading">{error}</main>;
  const percent = Math.min(100, Math.round(account.quota.used / account.quota.limit * 100));

  return (
    <main className="dashboard-page">
      <header className="dashboard-header">
        <Link href="/" className="auth-brand"><span className="brand-mark"><span /></span><strong>REDWOOD</strong></Link>
        <div><span>{account.user.displayName ?? account.user.email}</span><button onClick={logout} aria-label="Sign out"><LogOut size={16} /></button></div>
      </header>
      <div className="dashboard-grid">
        <aside className="account-rail">
          <span className="section-index">MEMBERSHIP</span>
          <h1>{account.user.plan === 'individual' ? 'Individual' : account.user.plan === 'enterprise' ? 'Enterprise' : account.user.plan === 'legacy' ? 'Legacy access' : 'Free account'}</h1>
          <p className="status-line"><i className={account.can_chat ? 'active' : ''} />{account.can_chat ? 'Research access active' : 'Subscription required'}</p>
          <div className="quota-card">
            <div><span>Monthly chatbot use</span><strong>{account.quota.remaining.toLocaleString()}</strong></div>
            <small>calls remaining of {account.quota.limit.toLocaleString()} · {account.usage_month}</small>
            <span className="quota-track"><i style={{ width: `${percent}%` }} /></span>
          </div>
          <div className="deliverables-card">
            <span><Sparkles size={15} /> Included every month</span>
            <p>Selected stock analysis</p><p>Market outlook</p><p>1,000 chatbot calls</p>
          </div>
          {!account.can_chat && <button onClick={checkout} disabled={busy} className="button button-primary subscribe-button"><CreditCard size={16} />Activate US$99/month</button>}
          {error && <p className="auth-error" role="alert">{error}</p>}
        </aside>
        <section className="chat-workspace">
          <div className="chat-heading"><div><span className="section-index">RESEARCH CHATBOT</span><h2>Ask Redwood</h2></div><Bot size={28} /></div>
          <div className="monthly-research-strip">
            {research.length > 0 ? research.slice(0, 2).map((item) => (
              <button key={`${item.period}-${item.kind}`} onClick={() => setSelectedResearch(item)}>
                <span>{item.kind === 'stock_analysis' ? <Building2 size={15} /> : <BarChart3 size={15} />}{item.kind === 'stock_analysis' ? 'MONTHLY STOCK ANALYSIS' : 'MARKET OUTLOOK'}</span>
                <strong>{item.title}</strong>
                <small>{item.period} · Open report</small>
              </button>
            )) : (
              <div className="monthly-empty"><Sparkles size={16} /><span><strong>Monthly research library</strong>Published stock analysis and market outlooks will appear here.</span></div>
            )}
          </div>
          {selectedResearch && <dialog open className="research-overlay" aria-labelledby="research-title" onCancel={() => setSelectedResearch(null)}>
            <article>
              <button className="research-close" onClick={() => setSelectedResearch(null)} aria-label="Close report">×</button>
              <span className="section-index">{selectedResearch.kind === 'stock_analysis' ? 'MONTHLY STOCK ANALYSIS' : 'MARKET OUTLOOK'} · {selectedResearch.period}</span>
              <h3 id="research-title">{selectedResearch.title}</h3>
              <p className="research-summary">{selectedResearch.summary}</p>
              <div className="research-body">{selectedResearch.body}</div>
              <div className="research-evidence"><strong>Evidence references</strong>{selectedResearch.evidence.length ? selectedResearch.evidence.map((item) => <p key={item.id}><span><code>{item.id}</code>{item.label}</span>{item.locator ? <span>{item.locator}</span> : null}</p>) : <p>No evidence references were supplied.</p>}</div>
              <p className="chat-disclosure">Informational research support only. Verify material claims before making an investment decision.</p>
            </article>
          </dialog>}
          <div className="chat-messages" aria-live="polite">
            {messages.length === 0 && <div className="chat-empty"><Bot size={30} /><h3>Start with a research question.</h3><p>Ask about a company, valuation assumptions, market context, or risks. Important claims should be checked against their cited evidence.</p></div>}
            {messages.map((message, index) => <article className={`chat-message ${message.role}`} key={index}><span>{message.role === 'user' ? 'YOU' : 'REDWOOD'}</span><pre>{message.content}</pre></article>)}
            {busy && account.can_chat && <div className="chat-thinking"><LoaderCircle className="animate-spin" size={16} /> Reviewing evidence…</div>}
          </div>
          <form className="chat-form" onSubmit={ask}>
            <textarea name="input" rows={3} maxLength={8000} disabled={!account.can_chat || busy} placeholder={account.can_chat ? 'Ask a research question…' : 'Activate a plan to use the chatbot'} />
            <button disabled={!account.can_chat || busy} aria-label="Send"><Send size={18} /></button>
          </form>
          <p className="chat-disclosure">Informational research support only — not personalized investment advice or a guarantee of future performance.</p>
        </section>
      </div>
    </main>
  );
}

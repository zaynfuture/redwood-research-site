'use client';

import Link from 'next/link';
import { SyntheticEvent, useEffect, useState } from 'react';
import { BarChart3, Bot, Building2, LoaderCircle, LogOut, Send, Sparkles } from 'lucide-react';

interface Account {
  user: { id: string; email: string; displayName: string | null; plan: string; subscriptionStatus: string };
  can_chat: boolean;
  admin: boolean;
  features: Record<'portfolio' | 'volume_profile' | 'market_sentiment', { allowed: boolean; expired: boolean }>;
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

const researchTopics = {
  'Stock screening': 'Find evidence-based stock screening criteria, including profitability, balance-sheet strength and valuation. Identify which current inputs are needed to rank candidates.',
  'Technical analysis': 'Find evidence on technical analysis and volume profiles. Identify the price, volume, and timeframe inputs required to evaluate a specific ticker.',
  'Fundamental analysis': 'Find relevant evidence on financial statements, earnings quality, return on invested capital, cash flow, and valuation. Identify missing company inputs.',
  'Investment decision support': 'Find evidence on evaluating an investment thesis, valuation, downside scenarios, and the conditions that would invalidate it. Distinguish evidence from assumptions.',
};

function resultText(value: unknown): string {
  if (typeof value === 'string') return value;
  return JSON.stringify(value, null, 2);
}

export function DashboardClient() {
  const [account, setAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState('');
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
    setDraft('');
    try {
      const response = await fetch('/api/chat', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ input }) });
      const data = await response.json() as { result?: unknown; remaining?: number; error?: { message?: string } };
      if (!response.ok) setError(data.error?.message ?? 'The research service is unavailable.');
      else {
        setMessages((current) => [...current, { role: 'assistant', content: resultText(data.result) }]);
        setAccount((current) => current && data.remaining !== undefined ? { ...current, quota: { ...current.quota, used: current.quota.limit - data.remaining, remaining: data.remaining } } : current);
      }
    } catch {
      setError('The research service is unavailable.');
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <main className="dashboard-loading"><LoaderCircle className="animate-spin" /> Loading workspace…</main>;
  if (!account) return <main className="dashboard-loading">{error}</main>;
  const percent = Math.min(100, Math.round(account.quota.used / account.quota.limit * 100));

  return (
    <main className="dashboard-page">
      <header className="dashboard-header">
        <Link href="/" className="auth-brand"><span className="brand-mark"><span /></span><strong>REDWOOD RESEARCH</strong></Link>
        <div><span>{account.user.displayName ?? account.user.email}</span><button onClick={logout} aria-label="Sign out"><LogOut size={16} /></button></div>
      </header>
      <div className="dashboard-grid">
        <aside className="account-rail">
          <span className="section-index">ACCESS</span>
          <h1>{account.admin ? 'Administrator' : account.user.plan === 'individual' ? 'Private beta' : account.user.plan === 'enterprise' ? 'Enterprise' : account.user.plan === 'legacy' ? 'Legacy access' : 'Access pending'}</h1>
          <p className="status-line"><i className={account.can_chat ? 'active' : ''} />{account.can_chat ? 'Research access active' : 'Invitation required'}</p>
          <details className="text-sm">
            <summary>Account ID</summary>
            <code className="break-all">{account.user.id}</code>
          </details>
          <nav className="flex flex-col gap-2 text-sm" aria-label="Research tools">
            {([
              ['portfolio', '/portfolio', 'Portfolio analysis'],
              ['volume_profile', '/volume-profile', 'Volume Profile'],
              ['market_sentiment', '/market-sentiment', 'Market Sentiment'],
            ] as const).map(([feature, path, label]) => (
              <Link key={feature} href={path}>{label} · {account.features[feature].allowed
                ? 'Enabled' : account.features[feature].expired ? 'Expired' : 'Access required'}</Link>
            ))}
            {account.admin && <Link href="/admin/access">Manage feature access</Link>}
          </nav>
          <div className="quota-card">
            <div><span>Monthly chatbot use</span><strong>{account.quota.remaining.toLocaleString()}</strong></div>
            <small>calls remaining of {account.quota.limit.toLocaleString()} · {account.usage_month}</small>
            <span className="quota-track"><i style={{ width: `${percent}%` }} /></span>
          </div>
          <div className="deliverables-card">
            <span><Sparkles size={15} /> Included every month</span>
            <p>Selected stock analysis</p><p>Market outlook</p><p>1,000 chatbot calls</p>
          </div>
          {!account.can_chat && <Link href="/pricing" className="button button-primary subscribe-button">Request access</Link>}
          {error && <p className="auth-error" role="alert">{error}</p>}
        </aside>
        <section className="chat-workspace">
          <div className="chat-heading"><div><span className="section-index">RESEARCH CHATBOT</span><h2>Ask Redwood Research</h2></div><Bot size={28} /></div>
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
            {messages.length === 0 && <div className="chat-empty"><Bot size={30} /><h3>Start with a research question.</h3><p>Search available research evidence or open a published report. Screening live candidates requires current market and company data.</p></div>}
            {messages.map((message, index) => <article className={`chat-message ${message.role}`} key={index}><span>{message.role === 'user' ? 'YOU' : 'REDWOOD RESEARCH'}</span><pre>{message.content}</pre></article>)}
            {busy && account.can_chat && <div className="chat-thinking"><LoaderCircle className="animate-spin" size={16} /> Reviewing evidence…</div>}
          </div>
          {account.can_chat && <div className="flex flex-wrap gap-2 px-4" aria-label="Research topics">
            {Object.entries(researchTopics).map(([topic, prompt]) => (
              <button type="button" className="button button-outline" key={topic} disabled={busy}
                onClick={() => setDraft(prompt)}>{topic}</button>
            ))}
          </div>}
          <form className="chat-form" onSubmit={ask}>
            <textarea name="input" value={draft} onChange={event => setDraft(event.target.value)} rows={3} maxLength={8000} disabled={!account.can_chat || busy} placeholder={account.can_chat ? 'Ask a research question…' : 'Private-beta access is required'} />
            <button disabled={!account.can_chat || busy} aria-label="Send"><Send size={18} /></button>
          </form>
          <p className="chat-disclosure">Informational research support only — not personalized investment advice or a guarantee of future performance.</p>
        </section>
      </div>
    </main>
  );
}

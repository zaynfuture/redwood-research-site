'use client';

import Link from 'next/link';
import { type SubmitEvent, useEffect, useState } from 'react';

type Connection = { state: 'saved' | 'connected' | 'invalid'; updated_at: string };
type Run = { id: string; finished_at: string };
type Analysis = {
  as_of: string;
  source: string;
  positions: Array<{ symbol: string; asset: string; currency: string; quantity: number; market_value: number }>;
  priorities: Array<{ symbol: string; signed_exposure_usd: number }>;
  gaps: string[];
};

const quantities = new Intl.NumberFormat('en', { maximumFractionDigits: 6 });
const amounts = new Intl.NumberFormat('en', { maximumFractionDigits: 2 });
const usd = new Intl.NumberFormat('en', { style: 'currency', currency: 'USD' });

async function read<T>(response: Response): Promise<T> {
  const data = await response.json() as T & { error?: { message?: string } };
  if (!response.ok) throw new Error(data.error?.message ?? 'Request failed. Try again.');
  return data;
}

export default function PortfolioPage() {
  const [access, setAccess] = useState<'loading' | 'signin' | 'pending' | 'expired' | 'active' | 'error'>('loading');
  const [connection, setConnection] = useState<Connection | null>(null);
  const [runs, setRuns] = useState<Run[]>([]);
  const [analysis, setAnalysis] = useState<Analysis>();
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');

  async function refreshHistory() {
    setRuns((await read<{ runs: Run[] }>(await fetch('/api/portfolio/analysis'))).runs);
  }

  useEffect(() => {
    async function load() {
      const response = await fetch('/api/feature-access');
      if (response.status === 401) { setAccess('signin'); return; }
      const { features } = await read<{ features: { portfolio: { allowed: boolean; expired: boolean } } }>(response);
      const { allowed, expired } = features.portfolio;
      setConnection((await read<{ connection: Connection | null }>(await fetch('/api/portfolio/connection'))).connection);
      setAccess(allowed ? 'active' : expired ? 'expired' : 'pending');
      if (allowed) await refreshHistory();
    }
    void load().catch((error: Error) => {
      setAccess(current => current === 'loading' ? 'error' : current);
      setMessage(error.message);
    });
  }, []);

  async function perform(label: string, operation: () => Promise<void>) {
    setBusy(label);
    setMessage('');
    try {
      await operation();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Request failed. Try again.');
    } finally {
      setBusy('');
    }
  }

  function save(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const { token, queryId } = Object.fromEntries(new FormData(form));
    void perform('Saving connection…', async () => {
      const data = await read<{ connection: Connection | null }>(await fetch('/api/portfolio/connection', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, queryId }),
      }));
      setConnection(data.connection);
      form.reset();
    });
  }

  function run() {
    void perform('Reading your IBKR report and analyzing positions…', async () => {
      setAnalysis(undefined);
      const response = await fetch('/api/portfolio/analysis', { method: 'POST' });
      if (response.status === 403) {
        setRuns([]);
        const { error } = await response.json() as { error?: { code?: string } };
        setAccess(error?.code === 'access_expired' ? 'expired' : 'pending');
        return;
      }
      if (response.status === 401) { setAccess('signin'); setRuns([]); return; }
      if (response.status === 409) {
        setConnection((await read<{ connection: Connection | null }>(await fetch('/api/portfolio/connection'))).connection);
      }
      const { result } = await read<{ result: Analysis }>(response);
      setAnalysis(result);
      await refreshHistory();
      setConnection((await read<{ connection: Connection | null }>(await fetch('/api/portfolio/connection'))).connection);
    });
  }

  return (
    <main className="research-tool mx-auto max-w-5xl space-y-6 px-6 py-8">
      <nav className="flex gap-5 text-sm"><Link href="/">Research home</Link><Link href="/dashboard">Account</Link></nav>
      <h1 className="display-title">Portfolio analysis</h1>
      {access === 'loading' && <output className="block">Checking your account…</output>}
      {access === 'signin' && <Link className="button button-primary" href="/signin">Sign in to continue</Link>}
      {access === 'pending' && <p>Portfolio access requires administrator approval.</p>}
      {access === 'expired' && <p>Your Portfolio access has expired. Ask an administrator to renew it.</p>}
      {message && <p className="auth-error" role="alert">{message}</p>}
      {['active', 'pending', 'expired'].includes(access) && (
        <section className="space-y-4 rounded-lg border bg-card p-5">
          <h2 className="text-xl font-semibold">IBKR Flex connection</h2>
          <p className="text-sm">{connection ? {
            saved: 'Connection saved. Run an analysis to verify it.',
            connected: 'Connection verified.',
            invalid: 'IBKR rejected the connection. Enter a current token and query ID.',
          }[connection.state] : 'No connection saved.'}</p>
          <p className="text-sm">Use a read-only XML Activity Flex Query for one account with Open Positions set to Summary.</p>
          <form onSubmit={save} className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1 text-sm">Flex token
              <input className="rounded border bg-background px-3 py-2" name="token" type="password" inputMode="numeric"
                pattern="[0-9]{1,64}" maxLength={64} autoComplete="off" required disabled={!!busy} />
            </label>
            <label className="flex flex-col gap-1 text-sm">Query ID
              <input className="rounded border bg-background px-3 py-2" name="queryId" inputMode="numeric"
                pattern="[0-9]{1,32}" maxLength={32} autoComplete="off" required disabled={!!busy} />
            </label>
            <button className="button button-outline" disabled={!!busy}>{connection ? 'Replace connection' : 'Save connection'}</button>
            {connection && <button className="button button-outline" type="button" disabled={!!busy}
              onClick={() => void perform('Disconnecting…', async () => {
                await read<{ connection: Connection | null }>(await fetch('/api/portfolio/connection', { method: 'DELETE' }));
                setConnection(null);
              })}>Disconnect</button>}
          </form>
        </section>
      )}
      {access === 'active' && (
        <div className="flex flex-wrap items-center gap-3">
          <button className="button button-primary" onClick={run}
            disabled={!!busy || !connection || connection.state === 'invalid'}>Analyze my portfolio</button>
          {runs.length > 0 && <label className="text-sm">Past analyses{' '}
            <select className="rounded border bg-background p-2" disabled={!!busy} defaultValue=""
              onChange={event => {
                const id = event.currentTarget.value;
                if (id) void perform('Loading analysis…', async () => {
                  setAnalysis(undefined);
                  const { run: previous } = await read<{ run: { result: Analysis } }>(await fetch('/api/portfolio/analysis?id=' + encodeURIComponent(id)));
                  setAnalysis(previous.result);
                });
              }}>
              <option value="">Select an analysis</option>
              {runs.map(run => <option key={run.id} value={run.id}>{new Date(run.finished_at).toLocaleString()}</option>)}
            </select>
          </label>}
        </div>
      )}
      {busy && <output className="block">{busy}</output>}
      {access === 'active' && analysis && <section className="space-y-5 rounded-lg border bg-card p-5">
        <div>
          <h2 className="text-xl font-semibold">Statement through {analysis.as_of}</h2>
          <p className="text-sm">{analysis.source}</p>
        </div>
        <div>
          <h3 className="font-semibold">Suggested exposure reviews</h3>
          {analysis.priorities.length === 0 ? <p>No USD stock positions to rank.</p> :
            <ol className="list-decimal space-y-1 pl-5">
              {analysis.priorities.map(item => <li key={item.symbol}>Review concentration and downside exposure in <strong>{item.symbol}</strong> ({usd.format(item.signed_exposure_usd)} signed exposure).</li>)}
            </ol>}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <caption className="pb-2 text-left font-semibold">Open positions</caption>
            <thead><tr><th className="p-2">Symbol</th><th className="p-2">Asset</th><th className="p-2">Quantity</th><th className="p-2">Statement value</th></tr></thead>
            <tbody>{analysis.positions.map((item, index) => <tr className="border-t" key={index}>
              <td className="p-2">{item.symbol}</td><td className="p-2">{item.asset}</td>
              <td className="p-2">{quantities.format(item.quantity)}</td>
              <td className="p-2">{amounts.format(item.market_value)} {item.currency}</td>
            </tr>)}</tbody>
          </table>
          {!analysis.positions.length && <p className="p-2">This statement contains no open positions.</p>}
        </div>
        <ul className="list-disc pl-5 text-sm">{analysis.gaps.map(gap => <li key={gap}>{gap}</li>)}</ul>
      </section>}
    </main>
  );
}

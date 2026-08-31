import { ArrowRight, BarChart3, BrainCircuit, BriefcaseBusiness, CheckCircle2, Database, FileSearch, GitBranch, LockKeyhole, Mail, MessageSquare, ShieldCheck, Waypoints } from 'lucide-react';
import { WaitlistForm } from '@/components/waitlist-form';

const agents = [
  { name: 'Fundamentals', detail: 'Statements · Quality · ROIC', tone: 'bg-[#f7d9d2] text-[#8c2f20]' },
  { name: 'Valuation', detail: 'DCF · Scenarios · Sensitivity', tone: 'bg-[#eadbc8] text-[#714b24]' },
  { name: 'Market Pulse', detail: 'News · Technicals · Volatility', tone: 'bg-[#dce8df] text-[#28543a]' },
];

const framework = [
  ['01', 'Industry', 'Map industry structure, cycle position, and competitive forces'],
  ['02', 'Business model', 'Deconstruct revenue engines, moats, and unit economics'],
  ['03', 'Management', 'Assess capital allocation, incentives, and execution history'],
  ['04', 'Financials', 'Interrogate growth quality, cash flow, and the balance sheet'],
  ['05', 'Valuation', 'Build price discipline through DCF and relative valuation'],
];

const capabilities = [
  { icon: FileSearch, title: 'Local knowledge engine', text: 'Turn PDFs, Markdown, DOCX, and private notes into precisely located evidence while preserving source, time, and usage rights.' },
  { icon: BrainCircuit, title: 'Specialist research agents', text: 'Fundamentals, valuation, news, technicals, and volatility work in their own lanes while a coordinator enforces one evidence standard.' },
  { icon: BarChart3, title: 'Deterministic finance', text: 'Financial ratios, option Greeks, implied volatility, and risk metrics run through reproducible calculations with inspectable outputs.' },
  { icon: Waypoints, title: 'Financial research ontology', text: 'Unify companies, securities, metrics, and relationships while keeping matched, ambiguous, and unresolved identities explicit.' },
  { icon: GitBranch, title: 'Auditable evidence chain', text: 'Every material claim can resolve to an original document, precise locator, and evidence class—ready to challenge, verify, and update.' },
  { icon: ShieldCheck, title: 'Read-only safety boundary', text: 'Redwood supports research and risk understanding, never order execution. Sensitive credentials stay outside model context and outputs.' },
  { icon: Mail, title: 'Email & messaging delivery', text: 'Deliver scheduled research and agent-triggered updates through email or approved third-party instant-messaging channels.' },
  { icon: BriefcaseBusiness, title: 'Portfolio intelligence', text: 'Produce full-view asset statistics, evaluation reports, and IBKR holdings-risk reviews with privacy-safe presentation controls.' },
];

const highlights = [
  { value: '4+', label: 'Extensible knowledge domains', detail: 'Self-managed local collections, expandable to trusted third-party data sources' },
  { value: '5+2', label: 'Multiple research frameworks', detail: 'Valuation, Goldman Sachs research synthesis, 5+2 analysis, and more' },
  { value: 'BY DESIGN', label: 'Traceable evidence', detail: 'Claims retain provenance, context, and visible uncertainty' },
  { value: 'TRIGGERED', label: 'Workflow automation', detail: 'Scheduled and agent-triggered research runs without autonomous order execution' },
];

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-background text-foreground">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6 lg:px-10">
        <a href="#top" className="flex items-center gap-3" aria-label="Redwood home">
          <span className="brand-mark"><span /></span>
          <span className="font-mono text-[15px] font-semibold tracking-[0.08em]">REDWOOD</span>
        </a>
        <div className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
          <a className="nav-link" href="#framework">Framework</a>
          <a className="nav-link" href="#capabilities">Capabilities</a>
          <a className="nav-link" href="#cases">Cases</a>
          <a className="nav-link" href="#principles">Principles</a>
        </div>
        <WaitlistForm source="header" />
      </nav>

      <section id="top" className="mx-auto grid max-w-7xl items-center gap-16 px-6 pb-24 pt-16 lg:grid-cols-[0.92fr_1.08fr] lg:px-10 lg:pb-32 lg:pt-24">
        <div>
          <div className="eyebrow"><span className="live-dot" /> Built for evidence-led investing</div>
          <h1 className="mt-7 font-heading text-[clamp(3.8rem,8vw,7.5rem)] font-medium leading-[0.82] tracking-[-0.075em]">
            Research,<br /><span className="serif-italic text-primary">rooted</span> in evidence
          </h1>
          <p className="mt-9 max-w-xl text-lg leading-8 text-muted-foreground">
            Redwood is a local-first U.S. equity research platform. It turns scattered filings, market data, and private knowledge into conclusions you can trace and verify.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <a href="#framework" className="button button-primary">Explore the research system <ArrowRight size={17} /></a>
            <a href="#capabilities" className="button button-ghost">View capabilities</a>
          </div>
          <div className="mt-10 flex flex-wrap gap-x-7 gap-y-3 border-t border-border pt-6 text-xs text-muted-foreground">
            <span className="flex items-center gap-2"><LockKeyhole size={14} /> Local-first</span>
            <span className="flex items-center gap-2"><ShieldCheck size={14} /> Evidence-auditable</span>
            <span className="flex items-center gap-2"><CheckCircle2 size={14} /> No order execution</span>
          </div>
        </div>

        <div className="relative">
          <div className="hero-orbit" aria-hidden="true" />
          <div className="research-console">
            <div className="console-topbar">
              <div className="flex items-center gap-2"><span className="terminal-dot" /><span className="terminal-dot" /><span className="terminal-dot" /></div>
              <span className="font-mono text-[10px] tracking-[0.18em] text-white/45">REDWOOD / RESEARCH RUN</span>
              <span className="rounded-full border border-white/10 px-2 py-1 font-mono text-[9px] text-[#e7a293]">ILLUSTRATIVE</span>
            </div>
            <div className="p-5 sm:p-7">
              <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-5">
                <div><p className="font-mono text-[10px] tracking-[0.14em] text-white/40">COMPANY UNDER REVIEW</p><h2 className="mt-2 text-2xl font-medium text-white">NVIDIA <span className="text-white/35">/ NVDA</span></h2></div>
                <div className="text-right"><p className="font-mono text-[10px] text-white/40">WORKFLOW</p><p className="mt-2 font-mono text-xs text-white/75">SAMPLE</p></div>
              </div>
              <div className="my-5 grid grid-cols-3 gap-2">
                {agents.map((agent, i) => (
                  <div key={agent.name} className="agent-card">
                    <div className="mb-5 flex items-center justify-between"><span className={`agent-number ${agent.tone}`}>0{i + 1}</span><span className="pulse-ring" /></div>
                    <p className="text-sm font-medium text-white">{agent.name}</p><p className="mt-1 text-[10px] leading-4 text-white/38">{agent.detail}</p>
                  </div>
                ))}
              </div>
              <div className="grid gap-3 sm:grid-cols-[1.3fr_.7fr]">
                <div className="console-panel">
                  <div className="mb-5 flex items-center justify-between"><span className="panel-label">EVIDENCE CHAIN</span><Database size={14} className="text-white/30" /></div>
                  <div className="space-y-3">
                    {[['10-K / Revenue', 'matched'], ['Earnings call / Guidance', 'matched'], ['Local thesis / Moat', 'review']].map(([a,b]) => <div key={a} className="evidence-row"><span>{a}</span><span className={b === 'matched' ? 'text-[#9ecbaa]' : 'text-[#e7a293]'}>{b}</span></div>)}
                  </div>
                </div>
                <div className="console-panel flex flex-col justify-between">
                  <span className="panel-label">RESEARCH DEPTH</span>
                  <div><strong className="font-mono text-4xl font-light text-white">5+2</strong><p className="mt-2 text-[10px] leading-4 text-white/38">Core modules<br />+ two-sided debate</p></div>
                </div>
              </div>
            </div>
            <div className="console-footer"><span>Coordinator synthesizing evidence</span><span className="loading-line"><i /></span><span>REVIEW</span></div>
          </div>
        </div>
      </section>

      <section className="border-y border-border bg-[#f1eee8]">
        <div className="mx-auto grid max-w-7xl grid-cols-2 divide-x divide-border px-6 md:grid-cols-4 lg:px-10">
          {highlights.map(({ value, label, detail }) => <div key={label} className="stat"><strong>{value}</strong><span>{label}</span><small>{detail}</small></div>)}
        </div>
      </section>

      <section id="framework" className="mx-auto max-w-7xl px-6 py-28 lg:px-10 lg:py-36">
        <div className="section-grid">
          <div className="sticky-copy">
            <span className="section-index">01 / RESEARCH SYSTEM</span>
            <h2 className="section-title">Not more information.<br />A better <span className="serif-italic text-primary">research order.</span></h2>
            <p className="section-copy">Redwood examines a company through a 5+2 framework: five objective research modules, followed by a two-sided stress test of the case for—and against—investing.</p>
          </div>
          <div className="framework-list">
            {framework.map(([n,title,text]) => <article className="framework-row" key={n}><span>{n}</span><h3>{title}</h3><p>{text}</p><ArrowRight size={16}/></article>)}
            <div className="debate-card">
              <div><span className="debate-sign">+</span><strong>Investment logic</strong><p>What must remain true? What is the market missing?</p></div>
              <div><span className="debate-sign">−</span><strong>Reasons not to invest</strong><p>What would invalidate the thesis? Which risks are underpriced?</p></div>
            </div>
          </div>
        </div>
      </section>

      <section id="capabilities" className="dark-section">
        <div className="mx-auto max-w-7xl px-6 py-28 lg:px-10 lg:py-36">
          <div className="mb-16 grid gap-8 lg:grid-cols-2">
            <div><span className="section-index text-white/35">02 / PLATFORM CAPABILITIES</span><h2 className="mt-6 max-w-2xl text-4xl font-medium tracking-[-.045em] text-white sm:text-6xl">Every conclusion<br />has a provenance.</h2></div>
            <p className="max-w-lg self-end text-base leading-7 text-white/50">From the moment information enters Redwood, its source, version, rights, and location are recorded. Agents find connections; humans retain judgment.</p>
          </div>
          <div className="capability-grid">
            {capabilities.map(({icon:Icon,title,text},i) => <article className="capability-card" key={title}><div className="flex items-center justify-between"><Icon size={20}/><span>0{i+1}</span></div><h3>{title}</h3><p>{text}</p></article>)}
          </div>
        </div>
      </section>

      <section id="cases" className="case-section border-b border-border">
        <div className="mx-auto max-w-7xl px-6 py-28 lg:px-10 lg:py-36">
          <div className="case-heading">
            <div><span className="section-index">03 / PRIVACY-SAFE CASES</span><h2 className="section-title">Useful at portfolio scale.<br /><span className="serif-italic text-primary">Private by construction.</span></h2></div>
            <p className="section-copy">Illustrative report layouts show how Redwood communicates portfolio findings. Sensitive fields are replaced with non-recoverable mosaic placeholders—no live account or position data is embedded in this page.</p>
          </div>
          <div className="case-grid">
            <article className="case-card">
              <div className="case-card-top"><span>CASE 01</span><span>FULL-VIEW ASSET REPORT</span></div>
              <div className="report-preview">
                <div className="report-title"><div><small>HOUSEHOLD / CONSOLIDATED</small><h3>Asset statistics & evaluation</h3></div><span className="privacy-chip"><ShieldCheck size={13}/> MOSAICED</span></div>
                <div className="masked-grid"><div><small>Owner</small><i className="mosaic mosaic-short"/></div><div><small>Total assets</small><i className="mosaic"/></div><div><small>Report date</small><i className="mosaic mosaic-short"/></div></div>
                <div className="allocation-bars" aria-label="Illustrative allocation chart"><i style={{width:'82%'}}/><i style={{width:'64%'}}/><i style={{width:'47%'}}/><i style={{width:'29%'}}/></div>
                <div className="report-tags"><span>Brokerage</span><span>Banking</span><span>Pension</span><span>Cash</span><span>Risk R1–R5</span></div>
              </div>
              <p>Consolidates asset classes, liquidity, currency exposure, allocation, and risk bands into one reconciled view.</p>
            </article>
            <article className="case-card">
              <div className="case-card-top"><span>CASE 02</span><span>IBKR HOLDINGS RISK</span></div>
              <div className="report-preview report-preview-dark">
                <div className="report-title"><div><small>PORTFOLIO / RISK REVIEW</small><h3>Holdings risk assessment</h3></div><span className="privacy-chip"><ShieldCheck size={13}/> MOSAICED</span></div>
                <div className="masked-grid"><div><small>Account</small><i className="mosaic mosaic-short"/></div><div><small>Net liquidation</small><i className="mosaic"/></div><div><small>Top position</small><i className="mosaic mosaic-short"/></div></div>
                <div className="risk-list"><span><i/>Concentration & overlap</span><span><i/>Options expiry & liquidity</span><span><i/>Margin, FX & drawdown risk</span></div>
                <div className="integration-row"><Mail size={14}/><span>Email</span><MessageSquare size={14}/><span>Third-party IM</span></div>
              </div>
              <p>Turns a read-only holdings snapshot into prioritized risk observations and scheduled or agent-triggered delivery.</p>
            </article>
          </div>
        </div>
      </section>

      <section id="principles" className="mx-auto max-w-7xl px-6 py-28 lg:px-10 lg:py-36">
        <span className="section-index">04 / PRODUCT PRINCIPLES</span>
        <div className="mt-8 grid gap-14 lg:grid-cols-[1fr_1.15fr]">
          <h2 className="section-title">AI can accelerate research.<br /><span className="serif-italic text-primary">It cannot replace accountability.</span></h2>
          <div className="principle-list">
            {[['Evidence before opinion','Claims begin with sources, not confidence.'],['Uncertainty stays visible','Unknowns are never packaged as certainty.'],['Local by default','Private knowledge and sensitive data remain local.'],['Human decides','The system supports research; the investor decides.']].map(([en,cn],i)=><div key={en}><span>0{i+1}</span><p><strong>{en}</strong>{cn}</p></div>)}
          </div>
        </div>
      </section>

      <section id="contact" className="cta-wrap">
        <div className="cta-orbit" aria-hidden="true" />
        <div className="relative z-10 mx-auto max-w-4xl px-6 py-28 text-center lg:py-36">
          <span className="section-index text-white/35">PRIVATE BETA / 2026</span>
          <h2 className="mt-7 text-5xl font-medium leading-[.95] tracking-[-.06em] text-white sm:text-7xl">Built for investors<br />who go <span className="serif-italic text-[#dc8473]">deep.</span></h2>
          <p className="mx-auto mt-7 max-w-xl text-base leading-7 text-white/50">Redwood is evolving in private beta with investors who value evidence, process, and long-term thinking.</p>
          <div className="mx-auto mt-9 max-w-md"><WaitlistForm source="footer" inverted /></div>
        </div>
      </section>

      <footer className="bg-[#171916] px-6 pb-10 pt-8 text-white/45 lg:px-10">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 border-t border-white/10 pt-8 text-xs sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-3 text-white"><span className="brand-mark"><span/></span><strong className="font-mono tracking-[.12em]">REDWOOD</strong></div><p>Research infrastructure for thoughtful investors.</p><p>© 2026 Cortex Hubs</p></div>
      </footer>
    </main>
  );
}

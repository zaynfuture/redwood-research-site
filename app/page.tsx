import { ArrowRight, BarChart3, BrainCircuit, CheckCircle2, Database, FileSearch, GitBranch, Layers3, LockKeyhole, Radar, ShieldCheck, Waypoints } from 'lucide-react';

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
          <a className="nav-link" href="#principles">Principles</a>
        </div>
        <a href="#contact" className="button button-outline">Join private beta <ArrowRight size={15} /></a>
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
              <span className="rounded-full border border-white/10 px-2 py-1 font-mono text-[9px] text-[#e7a293]">LIVE</span>
            </div>
            <div className="p-5 sm:p-7">
              <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-5">
                <div><p className="font-mono text-[10px] tracking-[0.14em] text-white/40">COMPANY UNDER REVIEW</p><h2 className="mt-2 text-2xl font-medium text-white">NVIDIA <span className="text-white/35">/ NVDA</span></h2></div>
                <div className="text-right"><p className="font-mono text-[10px] text-white/40">AS OF</p><p className="mt-2 font-mono text-xs text-white/75">2026.08.31</p></div>
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
            <div className="console-footer"><span>Coordinator synthesizing evidence</span><span className="loading-line"><i /></span><span>74%</span></div>
          </div>
        </div>
      </section>

      <section className="border-y border-border bg-[#f1eee8]">
        <div className="mx-auto grid max-w-7xl grid-cols-2 divide-x divide-border px-6 md:grid-cols-4 lg:px-10">
          {[['04', 'Local knowledge domains'], ['05+2', 'Company research framework'], ['100%', 'Traceable evidence'], ['0', 'Trade execution']].map(([n,l]) => <div key={l} className="stat"><strong>{n}</strong><span>{l}</span></div>)}
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

      <section id="principles" className="mx-auto max-w-7xl px-6 py-28 lg:px-10 lg:py-36">
        <span className="section-index">03 / PRODUCT PRINCIPLES</span>
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
          <a href="#top" className="button mt-9 bg-[#f6f1e8] px-6 text-[#1c1d1a] hover:bg-white">Follow Redwood <ArrowRight size={17}/></a>
        </div>
      </section>

      <footer className="bg-[#171916] px-6 pb-10 pt-8 text-white/45 lg:px-10">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 border-t border-white/10 pt-8 text-xs sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-3 text-white"><span className="brand-mark"><span/></span><strong className="font-mono tracking-[.12em]">REDWOOD</strong></div><p>Research infrastructure for thoughtful investors.</p><p>© 2026 Cortex Hubs</p></div>
      </footer>
    </main>
  );
}

type Point = { at: string; score: number; rating: string };
type ComponentReading = { key: string; label: string; description?: string; score: number; rating: string };
type Regime = { cycle_stage: string; label: string; direction: string; agreement_percent?: number | null;
  dispersion?: number | null; confidence: string; summary: string };
type Outlook = { calibrated: boolean; weights_are_probabilities: boolean;
  near_term?: { horizon: string; summary: string }; swing?: { horizon: string; summary: string };
  scenarios: { key: string; label: string; weight: number; driver: string; invalidation: string }[];
  improvement_conditions?: string[]; deterioration_conditions?: string[] };

export type SentimentDashboardData = {
  text: {
    cycle_stage: string; cycle_method: string;
    dashboard?: {
      near_term: { horizon: string; summary: string };
      swing: { horizon: string; summary: string };
      improvement_conditions: string[];
      deterioration_conditions: string[];
      scenario_details: Record<string, { driver: string; invalidation: string }>;
    };
  };
  overall?: { score: number; rating?: string; change_week?: number | null } | null;
  history?: Point[]; components?: ComponentReading[]; regime?: Regime; outlook?: Outlook;
};

const copy = {
  en: { cycle: 'Market psychology cycle', note: 'Interpretive overlay · not a timing signal', stage: 'Current stage',
    confidence: 'Model confidence', agreement: 'Component agreement', history: 'Composite history',
    components: 'Sentiment components', scenarios: 'Conditional scenarios', weights: 'Comparison weights, not probabilities',
    conditions: 'What changes the view', improve: 'Improvement signals', deteriorate: 'Deterioration signals',
    near: 'Near term', swing: 'Swing horizon', unavailable: 'Unavailable' },
  'zh-CN': { cycle: '市场心理周期', note: '解释性映射 · 不是择时信号', stage: '当前阶段', confidence: '模型置信度',
    agreement: '分量一致度', history: '综合指数历史', components: '情绪分量', scenarios: '条件情景',
    weights: '比较权重，并非概率', conditions: '观点变化条件', improve: '改善信号', deteriorate: '恶化信号',
    near: '短期', swing: '波段周期', unavailable: '暂无' },
  'zh-TW': { cycle: '市場心理週期', note: '解釋性映射 · 不是擇時訊號', stage: '目前階段', confidence: '模型信心',
    agreement: '分量一致度', history: '綜合指數歷史', components: '情緒分量', scenarios: '條件情境',
    weights: '比較權重，並非機率', conditions: '觀點變化條件', improve: '改善訊號', deteriorate: '惡化訊號',
    near: '短期', swing: '波段週期', unavailable: '暫無' },
} as const;

const labels: Record<string, [string, string, string]> = {
  disbelief: ['Early repair', '初步修复', '初步修復'], hope: ['Hope', '尝试修复', '嘗試修復'],
  optimism: ['Optimism', '乐观', '樂觀'], euphoria: ['Euphoria', '亢奋', '亢奮'],
  complacency: ['Complacency', '自满', '自滿'], anxiety: ['Anxiety', '焦虑', '焦慮'],
  denial: ['Risk reduction', '降低风险', '降低風險'], fear: ['Fear', '恐惧', '恐懼'],
  capitulation: ['Capitulation', '恐慌抛售', '恐慌拋售'],
  improving: ['Improving', '改善', '改善'], deteriorating: ['Deteriorating', '恶化', '惡化'],
  stable: ['Stable', '稳定', '穩定'], low: ['Limited', '有限', '有限'], moderate: ['Moderate', '中等', '中等'],
  market_momentum_sp500: ['Market momentum', '市场动能', '市場動能'],
  stock_price_strength: ['Price strength', '价格强度', '價格強度'],
  stock_price_breadth: ['Market breadth', '市场广度', '市場廣度'],
  put_call_options: ['Options demand', '期权需求', '選擇權需求'],
  market_volatility_vix: ['Market volatility', '市场波动', '市場波動'],
  junk_bond_demand: ['Credit appetite', '高收益债需求', '高收益債需求'],
  safe_haven_demand: ['Safe-haven demand', '避险需求', '避險需求'],
  downside_continuation: ['Downside continuation', '下行延续', '下行延續'],
  stabilization: ['Stabilization', '趋于稳定', '趨於穩定'],
  reflex_rebound: ['Reflex rebound', '短线反弹', '短線反彈'],
  weekly: ['Weekly change', '周度变化', '週度變化'],
  uncalibrated: ['Uncalibrated', '未经校准', '未經校準'],
  invalidation: ['Invalidation', '失效条件', '失效條件'],
};
type Label = (key: string, fallback?: string) => string;
const stageX: Record<string, number> = { disbelief: 70, hope: 130, optimism: 205, euphoria: 300,
  complacency: 365, anxiety: 430, denial: 495, fear: 555, capitulation: 615 };

function PsychologyCurve({ regime, label, stage, aria }: { regime: Regime; label: Label; stage: string; aria: string }) {
  const x = stageX[regime.cycle_stage] ?? 340;
  const y = regime.cycle_stage === 'euphoria' ? 38 : regime.cycle_stage === 'capitulation' ? 176 :
    regime.cycle_stage === 'fear' ? 195 : regime.cycle_stage === 'denial' ? 174 :
    regime.cycle_stage === 'anxiety' ? 125 : regime.cycle_stage === 'complacency' ? 82 :
    regime.cycle_stage === 'optimism' ? 78 : regime.cycle_stage === 'hope' ? 134 : 170;
  return <div className="overflow-hidden rounded-2xl border border-white/10 bg-[var(--night)] p-4 text-white sm:p-6">
    <svg viewBox="0 0 680 240" className="h-auto w-full" role="img" aria-label={aria}>
      <defs><linearGradient id="sentiment-cycle-gradient" x1="0" x2="1"><stop stopColor="#69a99a"/><stop offset=".46" stopColor="#d2b76c"/><stop offset=".72" stopColor="#b95643"/><stop offset="1" stopColor="#69a99a"/></linearGradient></defs>
      <path d="M30 180 C95 175 95 135 160 135 C220 135 220 48 300 38 C348 32 355 80 405 96 C455 112 463 185 520 194 C565 202 595 165 650 150" fill="none" stroke="url(#sentiment-cycle-gradient)" strokeWidth="6" strokeLinecap="round"/>
      <path d="M30 210H650" stroke="rgba(255,255,255,.16)" strokeDasharray="4 7"/>
      {Object.keys(stageX).map(name => <text key={name} x={stageX[name]} y={name === 'euphoria' ? 20 : 225} textAnchor="middle" fill="rgba(255,255,255,.55)" fontSize="10">{label(name)}</text>)}
      <line x1={x} x2={x} y1={y + 12} y2="208" stroke="#f2d4cb" strokeDasharray="3 5"/>
      <circle cx={x} cy={y} r="13" fill="#a63d2c" stroke="#fff8ef" strokeWidth="4"/>
      <rect x={Math.min(520, Math.max(8, x - 70))} y={Math.max(48, y - 43)} width="140" height="28" rx="14" fill="#fff8ef"/>
      <text x={Math.min(590, Math.max(78, x))} y={Math.max(66, y - 25)} textAnchor="middle" fill="#1b1c19" fontSize="11" fontWeight="700">{stage}</text>
    </svg>
  </div>;
}

function HistoryChart({ rows, title, unavailable }: { rows: Point[]; title: string; unavailable: string }) {
  if (rows.length < 2) return <p className="mt-4 text-sm text-muted-foreground">{unavailable}</p>;
  const points = rows.map((row, index) => `${20 + index * 620 / (rows.length - 1)},${190 - row.score * 1.6}`).join(' ');
  return <svg viewBox="0 0 660 220" className="mt-3 h-auto w-full" role="img" aria-label={title}>
    {[0, 25, 50, 75, 100].map(value => <g key={value}><line x1="20" x2="640" y1={190-value*1.6} y2={190-value*1.6} stroke="rgba(28,28,26,.1)"/><text x="0" y={194-value*1.6} fontSize="10" fill="#77736c">{value}</text></g>)}
    <polyline points={points} fill="none" stroke="#a63d2c" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round"/>
  </svg>;
}

export function SentimentDashboard({ data, locale }: { data: SentimentDashboardData; locale: 'en' | 'zh-CN' | 'zh-TW' }) {
  if (!data.overall || !data.regime || !data.outlook || data.regime.cycle_stage === 'insufficient_data') return null;
  const t = copy[locale];
  const language = { en: 0, 'zh-CN': 1, 'zh-TW': 2 }[locale];
  const label: Label = (key, fallback) => labels[key]?.[language] ?? fallback ?? key;
  const number = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });
  const localized = data.text.dashboard;
  const near = localized?.near_term ?? data.outlook.near_term;
  const swing = localized?.swing ?? data.outlook.swing;
  const signed = new Intl.NumberFormat(locale, { maximumFractionDigits: 1, signDisplay: 'exceptZero' });
  return <div className="space-y-10">
    <section className="grid gap-5 lg:grid-cols-[.36fr_.64fr]" aria-labelledby="psychology-cycle">
      <article className="flex min-h-72 flex-col justify-between rounded-2xl border bg-card p-6"><div><p className="font-mono text-xs uppercase tracking-[.16em] text-muted-foreground">{t.stage}</p><p className="mt-4 text-6xl font-semibold tracking-[-.06em]">{number.format(data.overall.score)}</p><p className="mt-2 text-xl font-medium text-primary">{data.text.cycle_stage}</p></div><dl className="grid grid-cols-2 gap-3 border-t pt-5 text-sm"><div><dt className="text-muted-foreground">{label('weekly')}</dt><dd className="mt-1 font-semibold">{data.overall.change_week == null ? t.unavailable : signed.format(data.overall.change_week)}</dd></div><div><dt className="text-muted-foreground">{t.confidence}</dt><dd className="mt-1 font-semibold capitalize">{label(data.regime.confidence)}</dd></div><div className="col-span-2"><dt className="text-muted-foreground">{t.agreement}</dt><dd className="mt-1 font-semibold">{data.regime.agreement_percent == null ? t.unavailable : `${number.format(data.regime.agreement_percent)}%`}</dd></div></dl></article>
      <article><div className="mb-3 flex flex-col items-start gap-2 sm:flex-row sm:items-end sm:justify-between"><div><h2 id="psychology-cycle" className="text-2xl font-semibold">{t.cycle}</h2><p className="mt-1 text-sm text-muted-foreground">{t.note}</p></div><span className="shrink-0 rounded-full border px-3 py-1 font-mono text-xs capitalize">{label(data.regime.direction)}</span></div><PsychologyCurve regime={data.regime} label={label} stage={data.text.cycle_stage} aria={t.cycle + ' · ' + data.text.cycle_stage}/></article>
    </section>
    <section className="grid gap-5 lg:grid-cols-[.58fr_.42fr]"><article className="rounded-2xl border bg-card p-5"><h2 className="text-xl font-semibold">{t.history}</h2><HistoryChart rows={data.history ?? []} title={t.history} unavailable={t.unavailable}/></article><article className="rounded-2xl border bg-card p-5"><h2 className="text-xl font-semibold">{t.stage}</h2><p className="mt-4 leading-7">{data.text.cycle_method}</p><div className="mt-5 grid gap-3">{near && <div className="rounded-xl bg-muted p-4"><span className="text-xs uppercase tracking-wider text-muted-foreground">{t.near} · {near.horizon}</span><p className="mt-2 text-sm leading-6">{near.summary}</p></div>}{swing && <div className="rounded-xl bg-muted p-4"><span className="text-xs uppercase tracking-wider text-muted-foreground">{t.swing} · {swing.horizon}</span><p className="mt-2 text-sm leading-6">{swing.summary}</p></div>}</div></article></section>
    <section aria-labelledby="sentiment-components"><div className="mb-4 flex items-end justify-between"><h2 id="sentiment-components" className="text-2xl font-semibold">{t.components}</h2><span className="font-mono text-xs text-muted-foreground">0 — 100</span></div><div className="grid gap-3 md:grid-cols-2">{(data.components ?? []).map(row => <article key={row.key} className="rounded-xl border bg-card p-4"><div className="flex items-start justify-between gap-4"><div><h3 className="font-semibold">{label(row.key, row.label)}</h3>{row.description && locale === 'en' && <p className="mt-1 text-sm text-muted-foreground">{row.description}</p>}</div><strong className="text-2xl">{number.format(row.score)}</strong></div><div className="mt-4 h-2 overflow-hidden rounded-full bg-muted"><i className="block h-full rounded-full bg-primary" style={{width: `${row.score}%`}}/></div></article>)}</div></section>
    {data.outlook.weights_are_probabilities === false && <section aria-labelledby="scenario-comparison" className="rounded-2xl border bg-card p-5 sm:p-7"><div className="flex flex-wrap items-end justify-between gap-3"><div><h2 id="scenario-comparison" className="text-2xl font-semibold">{t.scenarios}</h2><p className="mt-1 text-sm text-muted-foreground">{t.weights}</p></div><span className="rounded-full border px-3 py-1 font-mono text-xs">{label('uncalibrated')}</span></div><div className="mt-6 grid gap-5 lg:grid-cols-3">{data.outlook.scenarios.map(row => <article key={row.key}><div className="flex items-end justify-between gap-2"><h3 className="font-semibold">{label(row.key, row.label)}</h3><strong className="text-2xl">{number.format(row.weight)} / 100</strong></div><div className="my-3 h-2 overflow-hidden rounded-full bg-muted"><i className="block h-full rounded-full bg-primary" style={{width: `${row.weight}%`}}/></div><p className="text-sm leading-6">{localized?.scenario_details[row.key]?.driver ?? row.driver}</p><p className="mt-2 text-xs leading-5 text-muted-foreground">{label('invalidation')} · {localized?.scenario_details[row.key]?.invalidation ?? row.invalidation}</p></article>)}</div></section>}
    <section aria-labelledby="view-conditions"><h2 id="view-conditions" className="mb-4 text-2xl font-semibold">{t.conditions}</h2><div className="grid gap-4 md:grid-cols-2"><article className="rounded-xl border bg-card p-5"><h3 className="font-semibold text-[#3f7b6d]">{t.improve}</h3><ul className="mt-3 space-y-2 text-sm">{(localized?.improvement_conditions ?? data.outlook.improvement_conditions)?.map(item => <li key={item}>+ {item}</li>)}</ul></article><article className="rounded-xl border bg-card p-5"><h3 className="font-semibold text-primary">{t.deteriorate}</h3><ul className="mt-3 space-y-2 text-sm">{(localized?.deterioration_conditions ?? data.outlook.deterioration_conditions)?.map(item => <li key={item}>− {item}</li>)}</ul></article></div></section>
  </div>;
}

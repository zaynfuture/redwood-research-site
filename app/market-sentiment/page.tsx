'use client';

import { useEffect, useState } from 'react';
import { LanguageSelect, useLocale } from '@/components/locale-provider';
import { SentimentDashboard, type SentimentDashboardData } from '@/components/sentiment-dashboard';

const copy = {
  en: {
    title: 'U.S. Market Sentiment', home: 'Research home', profile: 'Volume profile', refresh: 'Refresh',
    loading: 'Loading market observations…', failed: 'Market sentiment is temporarily unavailable.',
    observations: 'Market observations', outlook: 'Five trading sessions', retrieved: 'Analysis time', cycle: 'Market psychology stage', preview: 'Test preview · fixed sample data', agreement: 'Component agreement', low: 'Limited evidence', moderate: 'Moderate evidence', scores: 'CNN scenario comparison', heuristic: 'Rule-based comparison points. These values do not estimate the likelihood of market moves.', drivers: 'CNN sentiment components', history: 'Recent Fear & Greed observations',
    observed: 'Observation', updated: 'Source update', comparisons: 'Comparison readings',
    previous_close: 'Previous close', one_week: 'One week', one_month: 'One month', one_year: 'One year',
    weekly: 'Weekly change', recent: 'Recent', stale: 'Stale', unavailable: 'Source unavailable',
    rights_unconfirmed: 'Source display permission pending', relief: 'Relief', consolidation: 'Consolidation',
    stress: 'Renewed stress', lead: 'Lead scenario', method: 'Method and uncertainty', missing: 'Unavailable',
    extreme_fear: 'Extreme fear', fear: 'Fear', neutral: 'Neutral', greed: 'Greed', extreme_greed: 'Extreme greed',
  },
  'zh-CN': {
    title: '美股市场情绪', home: '研究首页', profile: '成交量分布', refresh: '刷新',
    loading: '正在读取市场观测…', failed: '市场情绪分析暂时无法获取。',
    observations: '市场观测', outlook: '未来五个交易日', retrieved: '分析时间', cycle: '市场心理阶段', preview: '测试预览 · 固定样本数据', agreement: '分项一致度', low: '证据有限', moderate: '证据中等', scores: 'CNN 情景比较', heuristic: '分数仅供比较，未估计市场走势的发生概率。', drivers: 'CNN 情绪指标分项', history: '近期恐惧与贪婪读数',
    observed: '观测时间', updated: '来源更新时间', comparisons: '对比读数',
    previous_close: '前收盘', one_week: '一周前', one_month: '一个月前', one_year: '一年前',
    weekly: '周度变化', recent: '近期数据', stale: '数据已过期', unavailable: '来源暂不可用',
    rights_unconfirmed: '来源展示权限待确认', relief: '反弹修复', consolidation: '横盘整理',
    stress: '再度承压', lead: '主要情景', method: '方法与不确定性', missing: '暂无',
    extreme_fear: '极度恐惧', fear: '恐惧', neutral: '中性', greed: '贪婪', extreme_greed: '极度贪婪',
  },
  'zh-TW': {
    title: '美股市場情緒', home: '研究首頁', profile: '成交量分布', refresh: '重新整理',
    loading: '正在讀取市場觀測…', failed: '市場情緒分析暫時無法取得。',
    observations: '市場觀測', outlook: '未來五個交易日', retrieved: '分析時間', cycle: '市場心理階段', preview: '測試預覽 · 固定樣本資料', agreement: '分項一致度', low: '證據有限', moderate: '證據中等', scores: 'CNN 情境比較', heuristic: '分數僅供比較，未估計市場走勢的發生機率。', drivers: 'CNN 情緒指標分項', history: '近期恐懼與貪婪讀數',
    observed: '觀測時間', updated: '來源更新時間', comparisons: '比較讀數',
    previous_close: '前收盤', one_week: '一週前', one_month: '一個月前', one_year: '一年前',
    weekly: '週度變化', recent: '近期資料', stale: '資料已過期', unavailable: '來源暫時無法取得',
    rights_unconfirmed: '來源展示權限待確認', relief: '反彈回升', consolidation: '橫盤整理',
    stress: '再度承壓', lead: '主要情境', method: '方法與不確定性', missing: '暫無',
    extreme_fear: '極度恐懼', fear: '恐懼', neutral: '中性', greed: '貪婪', extreme_greed: '極度貪婪',
  },
};

const comparisons = ['previous_close', 'one_week', 'one_month', 'one_year'] as const;
type Scenario = 'relief' | 'consolidation' | 'stress';
type Observation = {
  id: string;
  source: string;
  source_url: string;
  status: 'recent' | 'stale' | 'unavailable' | 'rights_unconfirmed';
  value?: number;
  rating?: 'extreme_fear' | 'fear' | 'neutral' | 'greed' | 'extreme_greed';
  observed_at?: string;
  observation_date?: string;
  source_updated_at?: string;
  weekly_change?: number | null;
  comparisons?: Partial<Record<(typeof comparisons)[number], number>>;
  comparison_dates?: Partial<Record<(typeof comparisons)[number], string>>;
};
type Result = SentimentDashboardData & {
  schema_version: 1;
  demo?: boolean;
  locale: string;
  as_of: string;
  observations: Observation[];
  analysis: { scenario_ids: Scenario[]; lead_scenario_id?: Scenario };
  text: { outlook: string; method: string; cycle_stage: string; cycle_method: string; scenarios: Record<Scenario, string> };
};

export default function MarketSentiment() {
  const { locale } = useLocale();
  const t = copy[locale];
  const [requestVersion, refresh] = useState(0);
  const [result, setResult] = useState<Result>();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    document.title = `${t.title} | Redwood`;
    const controller = new AbortController();
    setResult(undefined);
    setFailed(false);
    async function load() {
      try {
        const response = await fetch(`/api/market-sentiment?lang=${locale}`, { signal: controller.signal });
        if (!response.ok) throw new Error();
        const data: Result = await response.json();
        if (data.schema_version !== 1 || data.locale !== locale || !Array.isArray(data.observations)) throw new Error();
        if (!controller.signal.aborted) setResult(data);
      } catch {
        if (!controller.signal.aborted) setFailed(true);
      }
    }
    void load();
    return () => controller.abort();
  }, [locale, requestVersion, t.title]);

  const numbers = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 });
  const signed = new Intl.NumberFormat(locale, { maximumFractionDigits: 2, signDisplay: 'exceptZero' });
  const dates = new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone: 'UTC' });
  const times = new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/New_York',
  });
  const day = (value?: string) => value ? dates.format(new Date(value)) : t.missing;
  const time = (value?: string) => value && Number.isFinite(Date.parse(value))
    ? `${times.format(new Date(value))} (ET)` : t.missing;

  return (
    <main className="mx-auto max-w-6xl space-y-10 px-6 py-8">
      <nav className="flex flex-col items-start gap-4 text-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-5"><a href="/">{t.home}</a><a href={`/volume-profile?lang=${locale}`}>{t.profile}</a></div>
        <LanguageSelect />
      </nav>
      <header className="flex flex-col items-start gap-4 border-b pb-5 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-semibold tracking-tight md:text-5xl">{t.title}</h1>
        <button className="button button-outline" onClick={() => refresh(value => value + 1)}>{t.refresh}</button>
      </header>
      {!result && <p role={failed ? 'alert' : 'status'}>{failed ? t.failed : t.loading}</p>}
      {result && (
        <>
          {result.demo && <p role="status" className="rounded-lg border bg-card p-3 text-sm">{t.preview}</p>}
          <SentimentDashboard data={result} locale={locale}/>
          <section aria-labelledby="sentiment-observations" className="space-y-4">
            <h2 id="sentiment-observations" className="text-2xl font-semibold">{t.observations}</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {result.observations.map(row => (
                <article key={row.id} className="space-y-3 rounded-xl border bg-card p-5">
                  <h3 className="font-semibold"><a className="underline" href={row.source_url}>{row.source}</a></h3>
                  <p className="text-sm text-muted-foreground">{t[row.status]}</p>
                  {row.value != null && <>
                    <p className="text-3xl font-semibold">{numbers.format(row.value)} {row.rating && <span className="text-base">{t[row.rating]}</span>}</p>
                    <dl className="space-y-1 text-sm">
                      <div><dt className="inline">{t.observed} · </dt><dd className="inline">{row.observed_at ? time(row.observed_at) : day(row.observation_date)}</dd></div>
                      <div><dt className="inline">{t.updated} · </dt><dd className="inline">{time(row.source_updated_at)}</dd></div>
                      <div><dt className="inline">{t.weekly} · </dt><dd className="inline">{row.weekly_change == null ? t.missing : signed.format(row.weekly_change)}</dd></div>
                    </dl>
                    <h4 className="text-sm font-medium">{t.comparisons}</h4>
                    <dl className="space-y-1 text-sm">
                      {comparisons.map(key => <div key={key} className="flex justify-between gap-2"><dt>{t[key]}</dt><dd>{row.comparisons?.[key] == null ? t.missing : numbers.format(row.comparisons[key])}{row.comparison_dates?.[key] && ` · ${day(row.comparison_dates[key])}`}</dd></div>)}
                    </dl>
                  </>}
                </article>
              ))}
            </div>
          </section>
          <section aria-labelledby="sentiment-outlook" className="space-y-4 rounded-xl border bg-card p-5">
            <h2 id="sentiment-outlook" className="text-2xl font-semibold">{t.outlook}</h2>
            <p>{result.text.outlook}</p>
            {result.analysis.scenario_ids.length > 0 && <ul className="grid gap-3 md:grid-cols-3">
              {result.analysis.scenario_ids.map(id => <li key={id} className="rounded-lg border p-4">
                <h3 className="mb-2 font-semibold">{t[id]}{id === result.analysis.lead_scenario_id && ` · ${t.lead}`}</h3>
                <p className="text-sm">{result.text.scenarios[id]}</p>
              </li>)}
            </ul>}
            <details className="text-sm text-muted-foreground"><summary>{t.method}</summary><p className="mt-2">{result.text.method}</p></details>
            <p className="text-sm text-muted-foreground">{t.retrieved} · {time(result.as_of)}</p>
          </section>
        </>
      )}
    </main>
  );
}

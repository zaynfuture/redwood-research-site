import type { ReactNode } from 'react';
import { LanguageSelect, useLocale } from '@/components/locale-provider';

const sections = ['framework', 'capabilities', 'cases', 'principles'] as const;

const labels = {
  en: { home: 'Redwood Research home', nav: 'Main navigation', links: ['Framework', 'Capabilities', 'Cases', 'Principles'] },
  'zh-CN': { home: 'Redwood Research 首页', nav: '主导航', links: ['研究框架', '平台能力', '案例', '产品原则'] },
  'zh-TW': { home: 'Redwood Research 首頁', nav: '主導覽', links: ['研究框架', '平台能力', '案例', '產品原則'] },
};

export function SiteHeader({ actions, home = false }: { actions: ReactNode; home?: boolean }) {
  const { locale } = useLocale();
  const copy = labels[locale];

  return (
    <header className="site-header">
      <div className="site-header-inner">
        <a className="site-header-brand" href={home ? '#top' : '/'} aria-label={copy.home}>
          <span className="site-header-mark" aria-hidden="true"><span /></span>
          <span>REDWOOD RESEARCH</span>
        </a>
        <nav className="site-header-links" aria-label={copy.nav}>
          {sections.map((section, index) => (
            <a href={`${home ? '' : '/'}#${section}`} key={section}>{copy.links[index]}</a>
          ))}
        </nav>
        <div className="site-header-actions">
          <LanguageSelect header />
          {actions}
        </div>
      </div>
    </header>
  );
}

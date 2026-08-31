import { ArrowRight } from 'lucide-react';

type WaitlistFormProps = {
  source: 'header' | 'footer';
  inverted?: boolean;
  locale?: 'en' | 'zh-CN' | 'zh-TW';
};

const templates = {
  en: { label: 'Join private beta', subject: 'Redwood private beta request', body: ['Hello Redwood team,','','I would like to request access to the Redwood private beta.','','Name:','Company (optional):','','What I am looking for:','','Best,'] },
  'zh-CN': { label: '申请私有测试', subject: '申请 Redwood 私有测试', body: ['Redwood 团队您好：','','我希望申请加入 Redwood 私有测试。','','姓名：','公司（可选）：','','我的研究需求：','','谢谢！'] },
  'zh-TW': { label: '申請私有測試', subject: '申請 Redwood 私有測試', body: ['Redwood 團隊您好：','','我希望申請加入 Redwood 私有測試。','','姓名：','公司（可選）：','','我的研究需求：','','謝謝！'] },
} as const;

export function WaitlistForm({ inverted = false, locale = 'en' }: WaitlistFormProps) {
  const template = templates[locale];
  const emailHref = `mailto:request@cortexhubs.com?subject=${encodeURIComponent(template.subject)}&body=${encodeURIComponent(template.body.join('\n'))}`;
  return (
    <a
      className={inverted ? 'button beta-trigger beta-trigger-inverted' : 'button button-outline'}
      href={emailHref}
      aria-label={template.label}
    >
      {template.label} <ArrowRight size={16} />
    </a>
  );
}

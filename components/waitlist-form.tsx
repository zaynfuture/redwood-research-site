import { ArrowRight } from 'lucide-react';

type WaitlistFormProps = {
  source: 'header' | 'footer';
  inverted?: boolean;
  locale?: 'en' | 'zh-CN' | 'zh-TW';
};

const templates = {
  en: { label: 'Join private beta', description: 'Join private beta — contact Zayn Zheng on LinkedIn' },
  'zh-CN': { label: '申请私有测试', description: '申请私有测试 — 在 LinkedIn 上联系 Zayn Zheng' },
  'zh-TW': { label: '申請私有測試', description: '申請私有測試 — 在 LinkedIn 上聯絡 Zayn Zheng' },
} as const;

export function WaitlistForm({ inverted = false, locale = 'en' }: WaitlistFormProps) {
  const template = templates[locale];
  return (
    <a
      className={inverted ? 'button beta-trigger beta-trigger-inverted' : 'button button-outline'}
      href="https://www.linkedin.com/company/redwoodresearch-cortexhubs/?viewAsMember=true"
      aria-label={template.description}
      title={template.description}
    >
      {template.label} <ArrowRight size={16} />
    </a>
  );
}

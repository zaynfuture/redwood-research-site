import Link from 'next/link';
import type { Metadata } from 'next';
import { ArrowRight, Blocks, BookOpenText, Bot, CheckCircle2, Database, LockKeyhole, MessagesSquare, Network, ShieldCheck } from 'lucide-react';
import { EnterpriseInquiryForm } from '@/components/enterprise-inquiry-form';

export const metadata: Metadata = {
  title: 'Redwood Enterprise - 深度投研系统集成',
  description: '面向企业的股票系统、内部文档、私有知识与 IM 工作流深度集成。具体费率详细咨询。',
  openGraph: { title: 'Redwood Enterprise - 深度投研系统集成', description: '股票系统、内部文档与 IM 工作流深度集成。', images: [] },
  twitter: { card: 'summary', title: 'Redwood Enterprise - 深度投研系统集成', description: '股票系统、内部文档与 IM 工作流深度集成。', images: [] },
};

const integrations = [
  {
    icon: Network,
    index: '01',
    title: '股票与投研系统集成',
    subtitle: 'Equity & research systems',
    description: '连接获准的行情、持仓、研究与风险系统，统一证券身份、指标口径和研究工作流。默认从只读接入开始，不代替人做投资决策，也不自动执行交易。',
    items: ['行情与证券数据接口', '持仓、风险与组合视图', '既有研究系统与分析流程', '定时及事件触发任务'],
  },
  {
    icon: BookOpenText,
    index: '02',
    title: '内部文档系统集成',
    subtitle: 'Documents & private knowledge',
    description: '把企业获准使用的研报、制度、会议记录和内部知识纳入可定位、可追溯的证据体系，并保留来源、版本、权限与使用边界。',
    items: ['内部文档库与云盘', '结构化知识与研究本体', '权限映射和来源追踪', '检索、引用与审计记录'],
  },
  {
    icon: MessagesSquare,
    index: '03',
    title: 'IM 与交付集成',
    subtitle: 'Messaging & delivery',
    description: '将研究摘要、风险提示和审批任务送达企业批准的 IM、邮件或工作流渠道；按团队要求配置审核、静默、重试和升级规则。',
    items: ['企业 IM 与协作渠道', '邮件与定时简报', '审批、告警与任务流', '交付状态和失败重试'],
  },
] as const;

const phases = [
  ['01', '发现与边界', '确认目标、现有系统、数据权利、用户范围与禁止事项。'],
  ['02', '方案与原型', '定义集成架构、证据链、安全模型和可验证的首个工作流。'],
  ['03', '实施与验收', '完成连接、权限、监控和业务验收，保留明确的人工复核点。'],
  ['04', '运行与迭代', '按约定维护数据源、研究流程、交付渠道和审计要求。'],
] as const;

export default function EnterprisePage() {
  return (
    <main className="enterprise-page">
      <nav className="enterprise-nav">
        <Link href="/" className="auth-brand"><span className="brand-mark"><span /></span><strong>REDWOOD</strong></Link>
        <div><Link href="/pricing" className="button button-ghost">会员方案</Link><a href="#enterprise-inquiry" className="button button-primary">详细咨询 <ArrowRight size={16} /></a></div>
      </nav>

      <header className="enterprise-hero">
        <div>
          <span className="section-index">ENTERPRISE / 深度定制</span>
          <h1>让研究系统适应你的<br /><span className="serif-italic text-primary">组织与边界。</span></h1>
        </div>
        <div className="enterprise-intro">
          <p>Redwood 企业版围绕现有股票系统、内部文档和协作渠道进行深度定制，而不是要求团队迁移到一套固定流程。</p>
          <div><ShieldCheck size={16} />只读优先 · 权限最小化 · 全程可审计</div>
        </div>
      </header>

      <section className="enterprise-integrations">
        {integrations.map(({ icon: Icon, index, title, subtitle, description, items }) => (
          <article key={index}>
            <div className="enterprise-card-head"><span>{index}</span><Icon size={23} /></div>
            <small>{subtitle}</small>
            <h2>{title}</h2>
            <p>{description}</p>
            <ul>{items.map((item) => <li key={item}><CheckCircle2 size={15} />{item}</li>)}</ul>
          </article>
        ))}
      </section>

      <section className="enterprise-boundary">
        <div>
          <span className="section-index">SECURITY BOUNDARY</span>
          <h2>定制不等于<br /><span className="serif-italic text-primary">放松边界。</span></h2>
        </div>
        <div className="boundary-grid">
          <div><LockKeyhole size={20} /><strong>身份与权限</strong><p>按用户、团队和数据源执行访问控制，敏感凭据不进入模型上下文。</p></div>
          <div><Database size={20} /><strong>数据与证据</strong><p>记录来源、版本、定位和使用权，让重要结论可以复核。</p></div>
          <div><Bot size={20} /><strong>Agent 与人工复核</strong><p>自动化负责发现和整理；投资判断、审批和高风险动作由人负责。</p></div>
          <div><Blocks size={20} /><strong>集成范围</strong><p>从最小可行的只读工作流开始，再依据验收结果逐步扩展。</p></div>
        </div>
      </section>

      <section className="enterprise-process">
        <div><span className="section-index">ENGAGEMENT MODEL</span><h2>从需求到运行，<br /><span className="serif-italic text-primary">逐步验收。</span></h2></div>
        <div className="process-list">{phases.map(([index, title, description]) => <article key={index}><span>{index}</span><div><h3>{title}</h3><p>{description}</p></div></article>)}</div>
      </section>

      <section id="enterprise-inquiry" className="enterprise-cta">
        <span className="section-index">PRICING / 具体费率详细咨询</span>
        <h2>费用取决于系统数量、数据范围、用户规模、安全要求与持续服务深度。</h2>
        <p>首次沟通将用于确认目标和边界；在方案范围清楚后，再提供实施阶段、周期与费用说明。</p>
        <EnterpriseInquiryForm />
      </section>

      <footer className="enterprise-footer"><span>© 2026 Cortex Hubs</span><span>Research support only · No order execution</span></footer>
    </main>
  );
}

'use client';

import { SyntheticEvent, useState } from 'react';
import { ArrowRight, CheckCircle2, LoaderCircle } from 'lucide-react';

export function EnterpriseInquiryForm() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [inquiryId, setInquiryId] = useState('');

  async function submit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError('');
    const form = event.currentTarget;
    const data = new FormData(form);
    const response = await fetch('/api/enterprise/inquiries', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        contact_name: data.get('contact_name'),
        work_email: data.get('work_email'),
        company: data.get('company'),
        role: data.get('role'),
        team_size: data.get('team_size'),
        timeline: data.get('timeline'),
        needs: data.getAll('needs'),
        message: data.get('message'),
        consent: data.get('consent') === 'yes',
      }),
    });
    const result = await response.json() as { inquiry_id?: string; error?: { message?: string } };
    if (!response.ok || !result.inquiry_id) {
      setError(result.error?.message ?? '暂时无法提交，请稍后重试。');
      setLoading(false);
      return;
    }
    setInquiryId(result.inquiry_id);
    setLoading(false);
    form.reset();
  }

  if (inquiryId) {
    return (
      <output className="inquiry-success">
        <CheckCircle2 size={32} />
        <h3>咨询需求已收到</h3>
        <p>我们会根据你的系统范围和集成目标进行初步评估。参考编号：<code>{inquiryId}</code></p>
        <button type="button" className="button button-outline" onClick={() => setInquiryId('')}>提交另一项需求</button>
      </output>
    );
  }

  return (
    <form className="enterprise-inquiry-form" onSubmit={submit}>
      <div className="inquiry-grid">
        <label><span>联系人 *</span><input name="contact_name" maxLength={120} required autoComplete="name" /></label>
        <label><span>工作邮箱 *</span><input name="work_email" type="email" maxLength={254} required autoComplete="email" /></label>
        <label><span>公司 / 机构 *</span><input name="company" maxLength={180} required autoComplete="organization" /></label>
        <label><span>职位</span><input name="role" maxLength={120} autoComplete="organization-title" /></label>
        <label><span>团队规模</span><select name="team_size" defaultValue=""><option value="">请选择</option><option value="1-10">1–10 人</option><option value="11-50">11–50 人</option><option value="51-200">51–200 人</option><option value="201-1000">201–1,000 人</option><option value="1000+">1,000 人以上</option></select></label>
        <label><span>计划时间</span><select name="timeline" defaultValue=""><option value="">请选择</option><option value="exploring">正在评估</option><option value="1-3_months">1–3 个月</option><option value="3-6_months">3–6 个月</option><option value="6+_months">6 个月以上</option></select></label>
      </div>
      <fieldset>
        <legend>希望集成的范围 *</legend>
        <div className="inquiry-options">
          <label><input type="checkbox" name="needs" value="equity_systems" /><span>股票、持仓或投研系统</span></label>
          <label><input type="checkbox" name="needs" value="internal_documents" /><span>内部文档与私有知识</span></label>
          <label><input type="checkbox" name="needs" value="im_delivery" /><span>IM、邮件与工作流</span></label>
          <label><input type="checkbox" name="needs" value="custom_research" /><span>定制研究框架</span></label>
        </div>
      </fieldset>
      <label className="inquiry-message"><span>需求说明 *</span><textarea name="message" minLength={10} maxLength={4000} rows={5} required placeholder="请简要说明现有系统、希望解决的问题、数据边界或验收目标。" /></label>
      <label className="inquiry-consent"><input type="checkbox" name="consent" value="yes" required /><span>同意 Redwood 使用上述信息评估并联系我讨论企业方案。</span></label>
      {error && <p className="auth-error" role="alert">{error}</p>}
      <button className="button button-primary inquiry-submit" disabled={loading}>{loading ? <LoaderCircle className="animate-spin" size={17} /> : <>提交咨询需求 <ArrowRight size={17} /></>}</button>
    </form>
  );
}

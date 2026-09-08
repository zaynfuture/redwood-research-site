import { CheckCircle2, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Redwood Membership',
  description: 'Individual research membership and custom enterprise engagements.',
  openGraph: { title: 'Redwood Membership', description: 'Individual research membership and custom enterprise engagements.', images: [] },
  twitter: { card: 'summary', title: 'Redwood Membership', description: 'Individual research membership and custom enterprise engagements.', images: [] },
};

export default function PricingPage() {
  return (
    <main className="standalone-page">
      <nav><Link href="/" className="auth-brand"><span className="brand-mark"><span /></span><strong>REDWOOD</strong></Link><Link href="/signin" className="button button-outline">Sign in</Link></nav>
      <section className="standalone-heading"><span className="section-index">MEMBERSHIP</span><h1>Choose your research <span className="serif-italic text-primary">depth.</span></h1><p>Individual access for recurring research. Enterprise engagements shaped around your team.</p></section>
      <section className="pricing-grid standalone-pricing">
        <article className="price-card price-card-featured"><div className="price-card-top"><span>Individual</span><span>01</span></div><strong>US$99 / month</strong><ul>{['1,000 chatbot calls each month','Monthly stock research selection','Monthly market outlook','Credit-card billing through Stripe'].map((feature)=><li key={feature}><CheckCircle2 size={16}/>{feature}</li>)}</ul><Link href="/signup" className="button button-primary">Create account <ArrowRight size={16}/></Link></article>
        <article className="price-card"><div className="price-card-top"><span>Enterprise</span><span>02</span></div><strong>Custom engagement</strong><ul>{['Equity, portfolio, and research-system integration','Internal documents and private knowledge integration','IM, email, and workflow delivery integration','Detailed pricing through consultation'].map((feature)=><li key={feature}><CheckCircle2 size={16}/>{feature}</li>)}</ul><Link href="/enterprise" className="button button-outline">Explore enterprise <ArrowRight size={16}/></Link></article>
      </section>
      <p className="pricing-disclosure">Research support only. No order execution. Subscription does not guarantee investment outcomes.</p>
    </main>
  );
}

import { CheckCircle2, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Redwood Research Access',
  description: 'Private-beta research access and custom enterprise engagements.',
  openGraph: { title: 'Redwood Research Access', description: 'Private-beta research access and custom enterprise engagements.', images: [] },
  twitter: { card: 'summary', title: 'Redwood Research Access', description: 'Private-beta research access and custom enterprise engagements.', images: [] },
};

export default function PricingPage() {
  return (
    <main className="standalone-page">
      <nav><Link href="/" className="auth-brand"><span className="brand-mark"><span /></span><strong>REDWOOD RESEARCH</strong></Link><Link href="/signin" className="button button-outline">Sign in</Link></nav>
      <section className="standalone-heading"><span className="section-index">ACCESS</span><h1>Research access, <span className="heading-accent text-primary">carefully scoped.</span></h1><p>Redwood Research is currently available through private beta and custom enterprise engagements.</p></section>
      <section className="pricing-grid standalone-pricing">
        <article className="price-card price-card-featured"><div className="price-card-top"><span>Private beta</span><span>01</span></div><strong>Invitation access</strong><ul>{['Evidence-led research workspace','Volume-profile and portfolio research tools','Visible data provenance and uncertainty','Human-reviewed product feedback loop'].map((feature)=><li key={feature}><CheckCircle2 size={16}/>{feature}</li>)}</ul><Link href="/#contact" className="button button-primary">Join the waitlist <ArrowRight size={16}/></Link></article>
        <article className="price-card"><div className="price-card-top"><span>Enterprise</span><span>02</span></div><strong>Custom engagement</strong><ul>{['Equity, portfolio, and research-system integration','Internal documents and private knowledge integration','IM, email, and workflow delivery integration','Scope and pricing through consultation'].map((feature)=><li key={feature}><CheckCircle2 size={16}/>{feature}</li>)}</ul><Link href="/enterprise" className="button button-outline">Explore enterprise <ArrowRight size={16}/></Link></article>
      </section>
      <p className="pricing-disclosure">Research support only. No order execution. Access does not guarantee investment outcomes.</p>
    </main>
  );
}

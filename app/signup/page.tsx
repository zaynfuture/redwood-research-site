import { AuthForm } from '@/components/auth-form';
import Link from 'next/link';

export default function SignUpPage() {
  return (
    <main className="auth-page">
      <Link href="/" className="auth-brand"><span className="brand-mark"><span /></span><strong>REDWOOD</strong></Link>
      <section>
        <span className="section-index">CREATE ACCOUNT</span>
        <h1>Begin with <span className="serif-italic text-primary">evidence.</span></h1>
        <p>Create an account, then activate the US$99 monthly individual plan.</p>
        <AuthForm mode="register" />
      </section>
      <p className="auth-disclosure">By continuing, you acknowledge that research output is informational and not investment advice.</p>
    </main>
  );
}

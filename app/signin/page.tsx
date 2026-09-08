import { AuthForm } from '@/components/auth-form';
import Link from 'next/link';

export default function SignInPage() {
  return (
    <main className="auth-page">
      <Link href="/" className="auth-brand"><span className="brand-mark"><span /></span><strong>REDWOOD</strong></Link>
      <section>
        <span className="section-index">MEMBER ACCESS</span>
        <h1>Welcome <span className="serif-italic text-primary">back.</span></h1>
        <p>Sign in to your private research workspace and chatbot.</p>
        <AuthForm mode="login" />
      </section>
      <p className="auth-disclosure">Research support only. Redwood does not execute orders.</p>
    </main>
  );
}

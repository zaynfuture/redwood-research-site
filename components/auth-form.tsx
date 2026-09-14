'use client';

import Link from 'next/link';
import { SyntheticEvent, useEffect, useRef, useState } from 'react';
import { ArrowRight, LoaderCircle } from 'lucide-react';

type TurnstileOptions = {
  sitekey: string;
  action: string;
  callback: (token: string) => void;
  'error-callback': () => void;
  'expired-callback': () => void;
  'timeout-callback': () => void;
};

type TurnstileApi = {
  render: (container: HTMLElement, options: TurnstileOptions) => string;
  remove: (widgetId: string) => void;
  reset: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

type TurnstileConfig = {
  provider: 'turnstile';
  site_key: string;
  action: 'login';
};

export function AuthForm({ mode }: { mode: 'login' | 'register' }) {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [turnstileConfig, setTurnstileConfig] =
    useState<TurnstileConfig | null>(null);
  const [turnstileToken, setTurnstileToken] = useState('');
  const turnstileContainer = useRef<HTMLDivElement>(null);
  const turnstileWidgetId = useRef<string | null>(null);
  const isRegister = mode === 'register';

  useEffect(() => {
    if (isRegister) return;
    const controller = new AbortController();
    void fetch('/api/auth/turnstile', { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error('captcha_unavailable');
        const config = (await response.json()) as TurnstileConfig;
        if (
          config.provider !== 'turnstile' ||
          !config.site_key ||
          config.action !== 'login'
        ) {
          throw new Error('captcha_invalid_config');
        }
        setTurnstileConfig(config);
      })
      .catch((caught: unknown) => {
        if (caught instanceof DOMException && caught.name === 'AbortError')
          return;
        setError('Human verification is temporarily unavailable.');
      });
    return () => controller.abort();
  }, [isRegister]);

  useEffect(() => {
    if (isRegister || !turnstileConfig || !turnstileContainer.current) return;
    const renderWidget = () => {
      if (
        !window.turnstile ||
        !turnstileContainer.current ||
        turnstileWidgetId.current
      )
        return;
      turnstileWidgetId.current = window.turnstile.render(
        turnstileContainer.current,
        {
          sitekey: turnstileConfig.site_key,
          action: turnstileConfig.action,
          callback: (token) => {
            setTurnstileToken(token);
            setError('');
          },
          'error-callback': () => {
            setTurnstileToken('');
            setError('Human verification failed. Please try again.');
          },
          'expired-callback': () => setTurnstileToken(''),
          'timeout-callback': () => setTurnstileToken(''),
        },
      );
    };

    let script = document.querySelector<HTMLScriptElement>(
      'script[data-redwood-turnstile]',
    );
    if (!script) {
      script = document.createElement('script');
      script.src =
        'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async = true;
      script.defer = true;
      script.dataset.redwoodTurnstile = 'true';
      document.head.appendChild(script);
    }
    if (window.turnstile) renderWidget();
    else script.addEventListener('load', renderWidget);
    const handleScriptError = () =>
      setError('Human verification is temporarily unavailable.');
    script.addEventListener('error', handleScriptError);

    return () => {
      script?.removeEventListener('load', renderWidget);
      script?.removeEventListener('error', handleScriptError);
      if (turnstileWidgetId.current && window.turnstile) {
        window.turnstile.remove(turnstileWidgetId.current);
        turnstileWidgetId.current = null;
      }
    };
  }, [isRegister, turnstileConfig]);

  function resetTurnstile() {
    setTurnstileToken('');
    if (turnstileWidgetId.current && window.turnstile) {
      window.turnstile.reset(turnstileWidgetId.current);
    }
  }

  async function submit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isRegister && !turnstileToken) {
      setError('Complete human verification before signing in.');
      return;
    }
    setLoading(true);
    setError('');
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email: form.get('email'),
          password: form.get('password'),
          ...(!isRegister && { turnstile_token: turnstileToken }),
        }),
      });
      const data = (await response.json()) as { error?: { message?: string } };
      if (!response.ok) {
        setError(data.error?.message ?? 'Unable to continue.');
        if (!isRegister) resetTurnstile();
        return;
      }
      window.location.assign('/dashboard');
    } catch {
      setError(
        'Unable to continue. Please check your connection and try again.',
      );
      if (!isRegister) resetTurnstile();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-panel">
      <form onSubmit={submit} className="auth-form">
        <label>
          <span>Email</span>
          <input
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="you@example.com"
          />
        </label>
        <label>
          <span>Password</span>
          <input
            name="password"
            type="password"
            minLength={12}
            maxLength={128}
            autoComplete={isRegister ? 'new-password' : 'current-password'}
            required
            placeholder="At least 12 characters"
          />
        </label>
        {!isRegister && (
          <div
            ref={turnstileContainer}
            className="turnstile-container"
            aria-label="Human verification"
          />
        )}
        {error && (
          <p className="auth-error" role="alert">
            {error}
          </p>
        )}
        <button
          className="button button-primary auth-submit"
          disabled={loading || (!isRegister && !turnstileToken)}
        >
          {loading ? (
            <LoaderCircle className="animate-spin" size={17} />
          ) : (
            <>
              {isRegister ? 'Create account' : 'Sign in'}{' '}
              <ArrowRight size={17} />
            </>
          )}
        </button>
      </form>
      {isRegister ? (
        <p className="auth-switch">
          Already have an account? <Link href="/signin">Sign in</Link>
        </p>
      ) : (
        <p className="auth-switch">
          Contact Redwood Research via{' '}
          <a href="https://www.linkedin.com/company/redwoodresearch-cortexhubs/?viewAsMember=true">
            Join private beta
          </a>{' '}
          to request a username and password.
        </p>
      )}
    </div>
  );
}

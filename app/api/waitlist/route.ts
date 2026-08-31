import { savePrivateBetaRequest } from '@/lib/waitlist';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function clean(value: unknown, maxLength: number) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      name?: unknown;
      email?: unknown;
      company?: unknown;
      message?: unknown;
      source?: unknown;
      fax?: unknown;
    };

    if (body.fax) {
      return Response.json({ ok: true }, { status: 201 });
    }

    const name = clean(body.name, 100);
    const email = clean(body.email, 254).toLowerCase();
    const company = clean(body.company, 160);
    const message = clean(body.message, 2000);
    const source = clean(body.source, 40) || 'website';

    if (!name) {
      return Response.json({ ok: false, error: 'Please enter your name.' }, { status: 400 });
    }
    if (!email || !EMAIL_PATTERN.test(email)) {
      return Response.json({ ok: false, error: 'Please enter a valid email address.' }, { status: 400 });
    }

    await savePrivateBetaRequest({ name, email, company, message, source });
    return Response.json({ ok: true, message: 'Thanks — your request has been received.' }, { status: 201 });
  } catch (error) {
    console.error(JSON.stringify({
      message: 'waitlist_signup_failed',
      error: error instanceof Error ? error.message : String(error),
    }));
    return Response.json({ ok: false, error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}

import { addWaitlistEmail } from '@/lib/waitlist';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      email?: unknown;
      source?: unknown;
      company?: unknown;
    };

    if (body.company) {
      return Response.json({ ok: true }, { status: 201 });
    }

    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const source = typeof body.source === 'string' ? body.source.slice(0, 40) : 'website';

    if (!email || email.length > 254 || !EMAIL_PATTERN.test(email)) {
      return Response.json({ ok: false, error: 'Please enter a valid email address.' }, { status: 400 });
    }

    const { created } = await addWaitlistEmail(email, source);
    return Response.json(
      { ok: true, message: created ? 'You’re on the list.' : 'You’re already on the list.' },
      { status: created ? 201 : 200 },
    );
  } catch (error) {
    console.error(JSON.stringify({
      message: 'waitlist_signup_failed',
      error: error instanceof Error ? error.message : String(error),
    }));
    return Response.json({ ok: false, error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}

import { env } from 'cloudflare:workers';

export async function addWaitlistEmail(email: string, source = 'website') {
  const result = await env.DB.prepare(
    `INSERT OR IGNORE INTO waitlist_signups (email, source)
     VALUES (?, ?)`,
  )
    .bind(email, source)
    .run();

  return { created: (result.meta.changes ?? 0) > 0 };
}

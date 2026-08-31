import { env } from 'cloudflare:workers';

type PrivateBetaRequest = {
  name: string;
  email: string;
  company: string;
  message: string;
  source: string;
};

export async function savePrivateBetaRequest(request: PrivateBetaRequest) {
  await env.DB.prepare(
    `INSERT INTO waitlist_signups
       (email, source, name, company, message, updated_at)
     VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(email) DO UPDATE SET
       source = excluded.source,
       name = excluded.name,
       company = excluded.company,
       message = excluded.message,
       updated_at = CURRENT_TIMESTAMP`,
  )
    .bind(request.email, request.source, request.name, request.company, request.message)
    .run();
}

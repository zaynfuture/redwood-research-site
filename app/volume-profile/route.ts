import { renderVolumeProfile } from '@/lib/volume-profile-document';

export function GET(request: Request): Response {
  void request;
  return new Response(renderVolumeProfile('en'), {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'content-language': 'en',
      'cache-control': 'public, max-age=300',
      'content-security-policy': "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'self'",
      'x-content-type-options': 'nosniff',
      'referrer-policy': 'no-referrer',
    },
  });
}

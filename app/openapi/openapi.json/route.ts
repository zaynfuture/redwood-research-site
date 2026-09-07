import { openApiDocument } from '@/lib/api/openapi';

export const dynamic = 'force-dynamic';

export function GET(): Response {
  return Response.json(openApiDocument, {
    headers: { 'cache-control': 'public, max-age=300', 'x-content-type-options': 'nosniff' },
  });
}

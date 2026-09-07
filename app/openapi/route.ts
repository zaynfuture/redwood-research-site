const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Redwood Research API</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.29.5/swagger-ui.css">
</head><body><div id="swagger-ui"></div>
<script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.29.5/swagger-ui-bundle.js"></script>
<script>SwaggerUIBundle({url:'/openapi/openapi.json',dom_id:'#swagger-ui',deepLinking:true,persistAuthorization:false,tryItOutEnabled:true});</script>
</body></html>`;

export function GET(): Response {
  return new Response(html, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'public, max-age=300',
      'content-security-policy': "default-src 'none'; style-src https://cdn.jsdelivr.net 'unsafe-inline'; script-src https://cdn.jsdelivr.net 'unsafe-inline'; connect-src 'self'; img-src data: https://validator.swagger.io; font-src https://cdn.jsdelivr.net",
      'referrer-policy': 'no-referrer',
      'x-content-type-options': 'nosniff',
      'x-frame-options': 'DENY',
    },
  });
}

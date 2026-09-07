export const openApiDocument = {
  openapi: '3.1.0',
  info: {
    title: 'Redwood Research API',
    version: '1.0.0',
    description: 'Authenticated research API. Responses contain final results only, never internal prompts or reasoning traces.',
  },
  servers: [{ url: 'https://redwoodresearch.cortexhubs.com/openapi' }],
  paths: {
    '/auth/login': {
      post: {
        summary: 'Log in with email and password',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginRequest' } } } },
        responses: { '200': { description: 'Access token issued' }, '401': { description: 'Invalid credentials' } },
      },
    },
    '/quota': {
      get: {
        summary: 'Get today’s API quota', security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Current limit, usage, and remaining calls' }, '401': { description: 'Unauthorized' } },
      },
    },
    '/query': {
      post: {
        summary: 'Submit text and receive the final research result', security: [{ bearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/QueryRequest' } } } },
        responses: { '200': { description: 'Final result' }, '401': { description: 'Unauthorized' }, '429': { description: 'Daily quota exhausted' } },
      },
    },
  },
  components: {
    securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer' } },
    schemas: {
      LoginRequest: { type: 'object', additionalProperties: false, required: ['email', 'password'], properties: { email: { type: 'string', format: 'email' }, password: { type: 'string', minLength: 12, maxLength: 128 }, turnstile_token: { type: 'string', maxLength: 2048, description: 'Required after repeated login attempts from one IP.' } } },
      QueryRequest: { type: 'object', additionalProperties: false, required: ['input'], properties: { input: { type: 'string', minLength: 1, maxLength: 8000 } } },
    },
  },
} as const;

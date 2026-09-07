// Canonical D1 schema. Production changes are applied only through migrations.
export const schema = {
  users: 'users',
  sessions: 'api_sessions',
  usage: 'daily_api_usage',
  loginAttempts: 'login_attempts',
} as const;

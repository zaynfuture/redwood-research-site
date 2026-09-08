// Canonical D1 schema. Production changes are applied only through migrations.
export const schema = {
  users: 'users',
  sessions: 'api_sessions',
  usage: 'daily_api_usage',
  loginAttempts: 'login_attempts',
  accountSessions: 'account_sessions',
  oauthStates: 'oauth_states',
  monthlyChatUsage: 'monthly_chat_usage',
  stripeEvents: 'stripe_events',
  monthlyResearch: 'monthly_research',
  enterpriseInquiries: 'enterprise_inquiries',
} as const;

import { requireAccountUser, error, json } from '@/lib/api/http';
import { chatEnabled, usageMonth } from '@/lib/auth/account';
import { monthlyChatQuota } from '@/lib/api/store';

export const dynamic = 'force-dynamic';

export async function GET(request: Request): Promise<Response> {
  const user = await requireAccountUser(request);
  if (!user) return error('unauthorized', 'Sign in required.', 401);
  const canChat = chatEnabled(user);
  const quota = canChat ? await monthlyChatQuota(user.id, usageMonth()) : { limit: 1000, used: 0, remaining: 0 };
  return json({ user, can_chat: canChat, quota, usage_month: usageMonth() });
}

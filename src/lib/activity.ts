import { supabase } from './supabase';

export const ACTION_LABELS: Record<string, string> = {
  upload_claims: 'Uploaded claims',
  generate_appeal: 'Generated appeal letter',
  view_holds: 'Viewed hold claims',
};

export async function logActivity(
  action: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    await supabase.from('activity_log').insert({
      user_id: session.user.id,
      action,
      metadata: metadata ?? null,
    });
  } catch {
    // fire-and-forget — never throw
  }
}

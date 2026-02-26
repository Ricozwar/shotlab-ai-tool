import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.warn('SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing – usage/limits disabled');
}

const supabase = url && serviceKey ? createClient(url, serviceKey) : null;

const TRIAL_DAYS = 7;
const IMAGES_PER_DAY = 50;
const REELS_PER_DAY = 3;

export interface UsageResult {
  imagesUsed: number;
  imagesLimit: number;
  reelsUsed: number;
  reelsLimit: number;
  trialEndsAt: string | null;
  trialEnded: boolean;
}

function todayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function ensureUser(userId: string, email: string | undefined): Promise<void> {
  if (!supabase) return;
  const { data } = await supabase.from('users').select('id').eq('id', userId).single();
  if (!data) {
    await supabase.from('users').insert({ id: userId, email: email ?? null });
  }
}

export async function getUsage(userId: string): Promise<UsageResult> {
  if (!supabase) {
    return {
      imagesUsed: 0,
      imagesLimit: IMAGES_PER_DAY,
      reelsUsed: 0,
      reelsLimit: REELS_PER_DAY,
      trialEndsAt: null,
      trialEnded: false,
    };
  }
  await ensureUser(userId, undefined);
  const { data: user } = await supabase.from('users').select('created_at').eq('id', userId).single();
  const created = user?.created_at ? new Date(user.created_at) : new Date();
  const trialEnd = new Date(created);
  trialEnd.setDate(trialEnd.getDate() + TRIAL_DAYS);
  const trialEnded = new Date() > trialEnd;

  const date = todayDate();
  const { data: row } = await supabase
    .from('daily_usage')
    .select('images_count, reels_count')
    .eq('user_id', userId)
    .eq('date', date)
    .single();

  const imagesUsed = row?.images_count ?? 0;
  const reelsUsed = row?.reels_count ?? 0;

  return {
    imagesUsed,
    imagesLimit: IMAGES_PER_DAY,
    reelsUsed,
    reelsLimit: REELS_PER_DAY,
    trialEndsAt: trialEnd.toISOString().slice(0, 10),
    trialEnded,
  };
}

export async function checkAndIncrementImages(userId: string): Promise<{ ok: boolean; error?: string }> {
  if (!supabase) return { ok: true };
  const usage = await getUsage(userId);
  if (usage.trialEnded) return { ok: false, error: 'Trial ended' };
  if (usage.imagesUsed >= usage.imagesLimit) return { ok: false, error: 'Daily image limit reached' };
  const date = todayDate();
  const { error } = await supabase.from('daily_usage').upsert(
    {
      user_id: userId,
      date,
      images_count: usage.imagesUsed + 1,
      reels_count: usage.reelsUsed,
    },
    { onConflict: 'user_id,date' }
  );
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function checkAndIncrementReels(userId: string): Promise<{ ok: boolean; error?: string }> {
  if (!supabase) return { ok: true };
  const usage = await getUsage(userId);
  if (usage.trialEnded) return { ok: false, error: 'Trial ended' };
  if (usage.reelsUsed >= usage.reelsLimit) return { ok: false, error: 'Daily reel limit reached' };
  const date = todayDate();
  const { error } = await supabase.from('daily_usage').upsert(
    {
      user_id: userId,
      date,
      images_count: usage.imagesUsed,
      reels_count: usage.reelsUsed + 1,
    },
    { onConflict: 'user_id,date' }
  );
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

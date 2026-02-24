const REEL_DAILY_LIMIT = 3;
const STORAGE_KEY = 'nanostudio_reel_usage';

function getTodayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

export function getReelUsageToday(): { used: number; limit: number; date: string } {
  const today = getTodayDateString();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { used: 0, limit: REEL_DAILY_LIMIT, date: today };
    const data = JSON.parse(raw) as { date: string; used: number };
    if (data.date !== today) return { used: 0, limit: REEL_DAILY_LIMIT, date: today };
    return { used: data.used, limit: REEL_DAILY_LIMIT, date: today };
  } catch {
    return { used: 0, limit: REEL_DAILY_LIMIT, date: today };
  }
}

export function incrementReelUsage(): void {
  const today = getTodayDateString();
  const current = getReelUsageToday();
  const used = current.date === today ? current.used + 1 : 1;
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ date: today, used }));
}

export function canGenerateReel(): boolean {
  return getReelUsageToday().used < REEL_DAILY_LIMIT;
}

import { ServerCaptura } from "../types";

export interface StreakInfo {
  streak: number;
  history: { date: string; hasEntry: boolean }[];
}

export function calculateStreak(entries: ServerCaptura[]): StreakInfo {
  if (!entries || entries.length === 0) {
    const history = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setUTCDate(d.getUTCDate() - i);
      history.push({ date: d.toISOString().split('T')[0], hasEntry: false });
    }
    return { streak: 0, history };
  }

  // Extract dates in YYYY-MM-DD UTC
  const entryDates = new Set(
    entries.map(e => new Date(e.timestamp).toISOString().split('T')[0])
  );

  let streak = 0;
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  const yesterday = new Date(today);
  yesterday.setUTCDate(today.getUTCDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  let currentDate = new Date(today);

  // if no entry today, check from yesterday
  if (!entryDates.has(todayStr)) {
    currentDate = new Date(yesterday);
  }

  // calculate streak backwards
  while (true) {
    const dateStr = currentDate.toISOString().split('T')[0];
    if (entryDates.has(dateStr)) {
      streak++;
      currentDate.setUTCDate(currentDate.getUTCDate() - 1);
    } else {
      break;
    }
  }

  // Generate 30 day history
  const history = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    history.push({ date: dateStr, hasEntry: entryDates.has(dateStr) });
  }

  return { streak, history };
}

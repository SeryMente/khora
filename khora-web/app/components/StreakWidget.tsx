import { useEffect, useState } from 'react';
import { calculateStreak, StreakInfo } from '@/lib/utils/streak';

export function StreakWidget() {
  const [streakInfo, setStreakInfo] = useState<StreakInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function fetchStreak() {
      try {
        const res = await fetch('/api/capturas', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          const info = calculateStreak(data.capturas);
          if (mounted) setStreakInfo(info);
        } else {
          console.error("Failed to fetch capturas");
          if (mounted) setError(true);
        }
      } catch (err) {
        console.error("Error fetching capturas:", err);
        if (mounted) setError(true);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    fetchStreak();
    return () => { mounted = false; };
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-4 bg-[#112A4F] border border-[#1F3C6A] rounded-2xl w-full max-w-sm">
        <div className="animate-pulse flex space-x-4">
          <div className="flex-1 space-y-4 py-1">
            <div className="h-4 bg-cora-silver/20 rounded w-3/4 mx-auto"></div>
            <div className="flex gap-1 justify-center">
              {Array.from({length: 30}).map((_, i) => (
                <div key={i} className="w-2 h-2 rounded-sm bg-cora-silver/10"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !streakInfo) return null;

  return (
    <div className="flex flex-col items-center justify-center p-4 bg-[#112A4F] border border-[#1F3C6A] rounded-2xl w-full max-w-sm shadow-xl hover:border-[#3FA7FF]/50 transition-colors duration-300">
      <h3 className="text-lg font-bold text-cora-surface tracking-tight mb-2 flex items-center gap-2">
        <span>🔥</span> Racha: {streakInfo.streak} {streakInfo.streak === 1 ? 'día' : 'días'}
      </h3>

      <div className="flex flex-wrap gap-1 justify-center mt-2 max-w-[280px]">
        {streakInfo.history.map((day, idx) => (
          <div
            key={idx}
            title={day.date}
            className={`w-3 h-3 rounded-sm transition-all duration-300 ${
              day.hasEntry
                ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]'
                : 'bg-[#1F3C6A]/50'
            }`}
          />
        ))}
      </div>
      <p className="text-[10px] text-cora-silver font-mono tracking-widest uppercase opacity-40 mt-3 text-center">
        Últimos 30 días
      </p>
    </div>
  );
}

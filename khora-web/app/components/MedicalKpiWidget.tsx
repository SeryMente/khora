"use client";

import { useState, useEffect } from "react";

export function MedicalKpiWidget() {
  const [minutes, setMinutes] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState<{
    minutesToday: number;
    currentStreak: number;
    accumulatedMonth: number;
    goal: number;
  } | null>(null);

  const fetchStats = async () => {
    try {
      const res = await fetch("/api/kpi/minutes");
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!minutes) return;

    setIsLoading(true);
    try {
      const res = await fetch("/api/kpi/minutes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: new Date().toISOString().split("T")[0],
          minutes: parseInt(minutes, 10),
          category: "medical_interp",
        }),
      });

      if (res.ok) {
        setMinutes("");
        await fetchStats();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-[#112A4F] border border-[#1F3C6A] rounded-2xl p-6 shadow-2xl flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-cora-surface tracking-tight uppercase">Interpretación Médica</h3>
        {stats && (
          <div className="text-[10px] text-cora-silver font-mono uppercase tracking-widest bg-white/[0.03] px-2 py-1 rounded-sm border border-white/10">
            {stats.accumulatedMonth} / {stats.goal} min
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] text-cora-silver font-mono uppercase tracking-widest opacity-60">Hoy</span>
          <span className="text-2xl font-bold text-cora-surface">{stats ? stats.minutesToday : "..."}</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[10px] text-cora-silver font-mono uppercase tracking-widest opacity-60">Racha</span>
          <span className="text-2xl font-bold text-cora-surface">{stats ? stats.currentStreak : "..."}</span>
        </div>
      </div>

      {stats && stats.goal > 0 && (
        <div className="w-full bg-white/[0.03] rounded-full h-1.5 mt-2 overflow-hidden">
          <div
            className="bg-[#3FA7FF] h-1.5 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${Math.min(100, (stats.accumulatedMonth / stats.goal) * 100)}%` }}
          />
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex gap-2 mt-2">
        <input
          type="number"
          min="1"
          placeholder="Minutos"
          value={minutes}
          onChange={(e) => setMinutes(e.target.value)}
          disabled={isLoading}
          className="flex-1 bg-[#0B1F3B] border border-[#1F3C6A] rounded-lg px-3 py-2 text-sm text-cora-surface placeholder:text-cora-silver/30 outline-none focus:border-[#3FA7FF]/50 transition-colors"
        />
        <button
          type="submit"
          disabled={!minutes || isLoading}
          className="bg-[#3FA7FF]/10 text-[#3FA7FF] border border-[#3FA7FF]/20 hover:bg-[#3FA7FF]/20 hover:border-[#3FA7FF]/40 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg px-4 py-2 text-sm font-semibold transition-all"
        >
          {isLoading ? "..." : "Registrar"}
        </button>
      </form>
    </div>
  );
}

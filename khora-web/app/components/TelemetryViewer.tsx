"use client";

import { useEffect, useState } from "react";
import { Activity, Download } from "lucide-react";
import { telemetryDb, downloadTelemetryJSONL } from "@/lib/telemetry";
import { ITelemetryEvent } from "@/lib/telemetry-schema";

export function TelemetryViewer() {
  const [events, setEvents] = useState<ITelemetryEvent[]>([]);

  useEffect(() => {
    async function loadEvents() {
      try {
        const data = await telemetryDb.events.orderBy("timestamp").reverse().limit(50).toArray();
        setEvents(data);
      } catch (err) {
        console.error("Failed to load telemetry events", err);
      }
    }
    loadEvents();

    // Poll for new events every 5 seconds for simplicity, as Dexie observability
    // requires dexie-react-hooks which we don't have installed.
    const interval = setInterval(loadEvents, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="mt-8 border-t border-white/[0.05] pt-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-white flex items-center gap-2">
          <Activity className="w-5 h-5 text-green-400" />
          Telemetría Local (Web)
        </h2>
        <button
          onClick={downloadTelemetryJSONL}
          className="bg-white/10 hover:bg-white/20 text-white text-sm px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Download className="w-4 h-4" />
          Exportar JSONL
        </button>
      </div>

      <div className="bg-[#18181b] border border-white/[0.05] rounded-xl overflow-hidden">
        {events.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No hay eventos registrados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-300">
              <thead className="bg-white/[0.02] border-b border-white/[0.05] text-gray-400 uppercase text-xs">
                <tr>
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">Módulo</th>
                  <th className="px-4 py-3">Acción</th>
                  <th className="px-4 py-3">Severidad</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.02]">
                {events.map((evt, idx) => (
                  <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3 font-mono text-[11px] whitespace-nowrap">
                      {new Date(evt.timestamp).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 font-medium">{evt.moduleId}</td>
                    <td className="px-4 py-3">
                      <span className="bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded text-xs border border-blue-500/20">
                        {evt.action}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                        evt.severity === 'ERROR' || evt.severity === 'CRITICAL' ? 'text-red-400 bg-red-400/10' :
                        evt.severity === 'WARN' ? 'text-yellow-400 bg-yellow-400/10' :
                        'text-green-400 bg-green-400/10'
                      }`}>
                        {evt.severity}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <p className="text-xs text-gray-500 mt-3 text-center">
        Nota: La telemetría de la extensión (Harmonia) se almacena localmente en chrome.storage.local en el buffer circular independiente.
      </p>
    </div>
  );
}

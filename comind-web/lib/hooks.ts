import { useEffect, useState } from "react";
import { db, type LocalCaptura } from "./db";
import { syncCaptura, setupAutoSync } from "./sync";

export function useLocalCapturas() {
  const [capturas, setCapturas] = useState<LocalCaptura[]>([]);
  const [loading, setLoading] = useState(true);

  const loadCapturas = async () => {
    setLoading(true);
    try {
      const all = await db.capturas.orderBy("timestamp").reverse().toArray();
      setCapturas(all);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCapturas();
    setupAutoSync();

    // Escuchar cambios en la DB cada 500ms
    const interval = setInterval(loadCapturas, 500);
    return () => clearInterval(interval);
  }, []);

  // Setup de Background Sync
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker.ready.then(async (reg) => {
      // Intentar registrar sync
      if ("sync" in reg) {
        try {
          await (reg.sync as any).register("sync-capturas");
        } catch (error) {
          console.debug("Background Sync no disponible, usando online event");
        }
      }

      // Escuchar mensaje desde el service worker
      navigator.serviceWorker.addEventListener("message", (event) => {
        if (event.data.type === "SYNC_COMPLETED") {
          loadCapturas();
        }
      });
    });
  }, []);

  const addCaptura = async (texto: string): Promise<LocalCaptura> => {
    const captura: LocalCaptura = {
      id: crypto.randomUUID(),
      texto,
      timestamp: new Date().toISOString(),
      status: navigator.onLine ? "pending" : "offline",
    };

    await db.capturas.add(captura);
    await loadCapturas();

    // Intentar sincronizar inmediatamente si hay conexión
    if (navigator.onLine) {
      syncCaptura(captura);
    }

    return captura;
  };

  return { capturas, loading, addCaptura };
}

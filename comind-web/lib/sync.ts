import { db, type LocalCaptura } from "./db";

export async function syncCaptura(captura: LocalCaptura): Promise<boolean> {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!apiUrl) {
      console.error("NEXT_PUBLIC_API_URL no configurada");
      // Marcar como offline si no hay URL
      await db.capturas.update(captura.id, { status: "offline" });
      return false;
    }

    const response = await fetch(`${apiUrl}/capturar`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ texto: captura.texto }),
    });

    if (response.ok) {
      await db.capturas.update(captura.id, { status: "synced" });
      return true;
    }
    // Si falla la solicitud pero la red está disponible
    if (navigator.onLine) {
      return false;
    }
    // Si no hay red, marcar como offline
    await db.capturas.update(captura.id, { status: "offline" });
    return false;
  } catch (error) {
    console.error("Error al sincronizar captura:", error);
    // Marcar como offline si hay error de conexión
    if (!navigator.onLine) {
      await db.capturas.update(captura.id, { status: "offline" });
    }
    return false;
  }
}

export async function syncAllPending(): Promise<void> {
  const pending = await db.capturas
    .where("status")
    .anyOf(["pending", "offline"])
    .toArray();
  for (const captura of pending) {
    await syncCaptura(captura);
  }
}

export function setupAutoSync(): void {
  if (!globalThis.navigator) return;

  // Reintento al volver conexión
  window.addEventListener("online", () => {
    console.log("Conexión restaurada, sincronizando...");
    syncAllPending();
  });

  // Background Sync (solo en navegadores que lo soporten)
  if ("serviceWorker" in navigator && "SyncManager" in window) {
    navigator.serviceWorker.ready.then((reg) => {
      if ("sync" in reg) {
        ((reg as any).sync.register("sync-capturas") as Promise<void>).catch(
          (error) => {
            console.log("Background Sync no disponible:", error);
          }
        );
      }
    });
  }
}

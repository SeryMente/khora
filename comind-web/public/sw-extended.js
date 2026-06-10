// Manejador para Background Sync
if (typeof self !== "undefined" && "addEventListener" in self) {
  self.addEventListener("sync", async (event) => {
    if (event.tag === "sync-capturas") {
      event.waitUntil(
        (async () => {
          try {
            // Abre IndexedDB y sincroniza pendientes
            const request = indexedDB.open("CapturaDB", 1);

            request.onsuccess = async () => {
              const db = request.result;
              const store = db
                .transaction("capturas", "readonly")
                .objectStore("capturas");
              const pendingRequest = store.getAll();

              pendingRequest.onsuccess = async () => {
                const capturas = pendingRequest.result;
                const pending = capturas.filter(
                  (c) =>
                    c.status === "pending" ||
                    (c.status === "offline" &&
                      navigator.onLine === true)
                );

                const apiUrl = process.env.NEXT_PUBLIC_API_URL;
                if (!apiUrl) return;

                for (const captura of pending) {
                  try {
                    const response = await fetch(`${apiUrl}/capturar`, {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                      },
                      body: JSON.stringify({ texto: captura.texto }),
                    });

                    if (response.ok) {
                      const updateRequest = db
                        .transaction("capturas", "readwrite")
                        .objectStore("capturas")
                        .put({ ...captura, status: "synced" });

                      updateRequest.onerror = () => {
                        console.error("Error actualizando captura:", updateRequest.error);
                      };
                    }
                  } catch (error) {
                    console.error(
                      "Error sincronizando captura:",
                      error
                    );
                  }
                }
              };
            };

            request.onerror = () => {
              console.error("Error abriendo IndexedDB:", request.error);
            };
          } catch (error) {
            console.error("Error en sync event:", error);
          }
        })()
      );
    }
  });
}

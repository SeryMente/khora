// @l0 L0-002 · @req UI-REVIEW/MCP · Herramienta khora_ui_review
//
// Devuelve la interfaz de Khora renderizada en HTML, alimentada con el corpus
// real del operador. Permite que un modelo sin navegador vea la UI que su
// contenido produce: densidad de la bandeja, desbordamiento de titulos largos,
// comodidad de lectura de un dictado extenso, incidentes visibles.
//
// POR QUE NO renderToStaticMarkup
// En el App Router, importar un componente "use client" desde un modulo de
// servidor entrega una referencia de cliente, no la funcion: renderizarla a
// mano falla. Por eso esta herramienta delega en la ruta /ui-review/<pantalla>/
// estatico, que Next si sabe renderizar en servidor, y le indica que use datos
// reales mediante una clave interna derivada del secreto del MCP.
//
// AUTORIZACION
// Se invoca unicamente desde /api/mcp, que ya valida el Bearer OAuth con scope
// `volcados:read`. No concede acceso a nada que el llamante no pudiera obtener
// con `khora_leer_volcado`. Es de solo lectura y no ejecuta acciones.

import { createHmac, timingSafeEqual } from "node:crypto";
import { SCREENS, getAllScenariosForScreen } from "@/lib/ui-review/registry";
import type { ScreenId } from "@/lib/ui-review/types";
import { obtenerMetaProyeccion } from "./ui-review-proyeccion";

/** Clave interna de proceso: autoriza a la ruta estatica a usar datos reales. */
export function claveProyeccionReal(): string {
  const secreto =
    process.env.MCP_JWT_SECRET ||
    process.env.EP_BOOTSTRAP_JWT_SECRET ||
    process.env.AUTH_SECRET ||
    "";
  if (secreto.length < 16) {
    throw new Error("No hay secreto suficiente para derivar la clave de proyeccion");
  }
  const ventana = Math.floor(Date.now() / 300000); // rota cada 5 minutos
  return createHmac("sha256", secreto).update(`ui-review-real:${ventana}`).digest("hex").slice(0, 40);
}

/** Acepta la ventana actual y la anterior, para no fallar en el borde. */
export function validarClaveProyeccion(recibida: string | null): boolean {
  if (!recibida) return false;
  const secreto =
    process.env.MCP_JWT_SECRET ||
    process.env.EP_BOOTSTRAP_JWT_SECRET ||
    process.env.AUTH_SECRET ||
    "";
  if (secreto.length < 16) return false;
  const ahora = Math.floor(Date.now() / 300000);
  for (const v of [ahora, ahora - 1]) {
    const esperada = createHmac("sha256", secreto).update(`ui-review-real:${v}`).digest("hex").slice(0, 40);
    const a = Buffer.from(esperada);
    const b = Buffer.from(recibida);
    if (a.length === b.length && timingSafeEqual(a, b)) return true;
  }
  return false;
}

function esPantallaValida(v: string): v is ScreenId {
  return (SCREENS as string[]).includes(v);
}

function origenCanonico(): string {
  const explicito = process.env.EP_CANONICAL_URL?.replace(/\/api\/ep$/, "").replace(/\/$/, "");
  if (explicito) return explicito;
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  return "http://localhost:3000";
}

export async function toolKhoraUiReview(args: {
  pantalla?: string;
  volcado?: string;
  solo_metadatos?: boolean;
}) {
  const meta = await obtenerMetaProyeccion();

  if (args.solo_metadatos || !args.pantalla) {
    return {
      pantallas_disponibles: SCREENS,
      escenarios_por_pantalla: Object.fromEntries(
        SCREENS.map((s) => [s, getAllScenariosForScreen(s).map((e) => e.scenario)])
      ),
      forma_del_corpus: meta,
      nota:
        "Llama de nuevo con `pantalla` para recibir la interfaz renderizada con datos reales. " +
        "Usa `volcado` (folio o UUID) para fijar cual se muestra abierto.",
    };
  }

  const pantalla = args.pantalla.trim().toLowerCase();
  if (!esPantallaValida(pantalla)) {
    return { error: "pantalla_invalida", recibido: args.pantalla, pantallas_disponibles: SCREENS };
  }

  const url = new URL(`${origenCanonico()}/ui-review/${pantalla}/estatico`);
  url.searchParams.set("fuente", "real");
  url.searchParams.set("k", claveProyeccionReal());
  if (args.volcado) url.searchParams.set("volcado", args.volcado);

  let html: string;
  try {
    const res = await fetch(url.toString(), { cache: "no-store" });
    if (!res.ok) {
      return { error: "fallo_de_render", pantalla, http: res.status };
    }
    html = await res.text();
  } catch (e: any) {
    return { error: "fallo_de_render", pantalla, detalle: String(e?.message || e).slice(0, 300) };
  }

  const escenarios = getAllScenariosForScreen(pantalla);
  const uiIds = Array.from(new Set(escenarios.flatMap((e) => e.ui_ids))).sort();

  return {
    pantalla,
    fuente: "corpus_real",
    forma_del_corpus: meta,
    ui_ids: uiIds,
    advertencia:
      "Retrato de solo lectura: los controles se muestran pero no responden. " +
      "Los componentes son identicos a los de produccion.",
    html,
  };
}

# @l0 L0-002 · @req ING-05/REQ-1 · @acr ACR-1.1,ACR-1.2 · @ua —
import os
from typing import Any

from khora_kernel.api import SolicitudLLM
from khora_kernel.proveedores.openai import ProveedorOpenAICompatible


def fsum(memoria: Any) -> None:
    # 1. Recuperar todas las comunidades vigentes ordenadas por level ASC
    comunidades = memoria.get_comunidades_vigentes()

    # Proveedor con MOD-CON
    proveedor = ProveedorOpenAICompatible(
        api_url=os.getenv("LLM_CHEAP_API_URL"),
        api_key=os.getenv("LLM_CHEAP_API_KEY"),
        model=os.getenv("LLM_CHEAP_MODEL")
    )

    for com in comunidades:
        cid = com["community_id"]
        level = com["level"]

        # 2. Contexto estructural
        contexto = memoria.get_comunidad_contexto(cid)

        # 3. Construir prompt
        prompt = f"Resume la comunidad {cid} de nivel {level}. Contexto estructural:\n"

        # Si es nivel hoja (o encontramos nodos), agregar información de las entidades y relaciones
        # Si es nivel raíz (o encontramos hijos), agregar los resúmenes de las hijas
        hojas: set[str] = set()
        relaciones_hojas: set[str] = set()
        hijos: set[tuple[str, str]] = set()

        for ctx in contexto:
            if ctx.get("origen_id") and ctx.get("destino_id"):
                origen = ctx.get("origen_desc") or ctx.get("origen_id")
                destino = ctx.get("destino_desc") or ctx.get("destino_id")
                relacion = ctx.get("relacion_interna")
                if relacion:
                    relaciones_hojas.add(f"- {origen} -> [{relacion}] -> {destino}")
                if isinstance(origen, str):
                    hojas.add(origen)
                if isinstance(destino, str):
                    hojas.add(destino)

            if ctx.get("child_id"):
                hijos.add((str(ctx["child_id"]), str(ctx.get("child_summary") or "Sin resumen")))

        if hojas:
            prompt += "Miembros y relaciones de la comunidad:\n"
            if relaciones_hojas:
                prompt += "\n".join(relaciones_hojas) + "\n"
            else:
                prompt += "Miembros: " + ", ".join(list(hojas)[:20]) + "...\n" # Acotar

        if hijos:
            prompt += "Subcomunidades (hijos) y sus resúmenes:\n"
            for h_id, h_sum in hijos:
                prompt += f"--- Subcomunidad {h_id} ---\n{h_sum}\n"

        if not hojas and not hijos:
            prompt += "Comunidad vacía o sin información relevante.\n"

        # 4. Llamar al proveedor
        solicitud = SolicitudLLM(
            prompt=prompt,
            sistema="Eres un experto sumarizador de grafos de conocimiento. Genera un resumen conciso de las comunidades y sus miembros/subcomunidades.",
            formato_estricto=None,
            metadata={"temperature": 0.0},
        )

        respuesta = proveedor.generar(solicitud)

        # 5. Persistir en la propiedad summary
        memoria.set_resumen_comunidad(cid, respuesta.texto)

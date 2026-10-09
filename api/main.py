# @l0 L0-002-R · @req API-00/REQ-1,REQ-2,REQ-3,REQ-CHAT,DEPLOY-01/REQ-1,DEPLOY-01/REQ-2,DEPLOY-01/REQ-3,ING-03/REQ-1,GRAFO-01/REQ-1 · @acr ACR-1.1,ACR-1.2,ACR-2.1,ACR-3.1 · @ua UA-03,UA-04,UA-05,UA-06
import os
import uuid
import datetime
import traceback
import asyncio
import json
import urllib.request
from typing import List, Optional
from fastapi import FastAPI, Depends, HTTPException, Header, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, model_validator
import logging
from contextlib import asynccontextmanager

from neo4j import GraphDatabase

try:
    from khora_kernel.poblacion import ingestar
    from khora_kernel.api import ObjetoDeInformacion, Provenance
except ImportError:
    pass


neo4j_driver = None
neo4j_config = {}

def _is_identity_constraint_conflict(error: Exception) -> bool:
    detail = str(error).lower()
    return (
        ("constraint" in detail or "already exists" in detail or "unique" in detail)
        and any(key in detail for key in ("io_id", "canonical_key", "informationobject"))
    )


def _same_ingesta_provenance_tuple(
    existing,
    volcado_id: str,
    version: int,
    sha256: str,
) -> bool:
    if not existing:
        return False
    try:
        return (
            existing["v"] == str(volcado_id)
            and int(existing["ver"]) == int(version)
            and str(existing["s"]).lower() == str(sha256).lower()
        )
    except (KeyError, TypeError, ValueError):
        return False


GRAPH_HEALTH_DEFECT_KEYS = (
    "typed_overlap",
    "missing_temporal_nodes",
    "missing_temporal_edges",
    "unreachable_entities",
    "active_membership_to_invalid_community",
    "eligible_without_active_community",
    "active_communities_without_members",
)


def _graph_health_payload(checks: dict) -> dict:
    defects = {key: checks.get(key) for key in GRAPH_HEALTH_DEFECT_KEYS}
    ok = all(isinstance(value, int) and value == 0 for value in defects.values())
    return {"ok": ok, "defects": defects, **checks}

@asynccontextmanager
async def lifespan(app: FastAPI):
    global neo4j_driver
    missing_vars = []

    uri = os.getenv("NEO4J_URI")
    user = os.getenv("NEO4J_USER")
    password = os.getenv("NEO4J_PASSWORD")

    if not uri:
        missing_vars.append("NEO4J_URI")
    if not user:
        missing_vars.append("NEO4J_USER")
    if not password:
        missing_vars.append("NEO4J_PASSWORD")

    if missing_vars:
        raise RuntimeError(f"Missing required Neo4j environment variables: {', '.join(missing_vars)}")

    if "aura" in uri.lower() and not uri.startswith("neo4j+s://"):
        logging.info("Forcing neo4j+s:// scheme for AuraDB connection")
        uri = uri.replace("neo4j://", "neo4j+s://").replace("bolt://", "neo4j+s://")

    try:
        neo4j_config.update({"uri": uri, "user": user, "password": password})
        neo4j_driver = GraphDatabase.driver(uri, auth=(user, password))
        # Test connection early
        neo4j_driver.verify_connectivity()
    except Exception as e:
        # We fail fast here if Neo4j is unreachable during startup.
        raise RuntimeError(f"Neo4j connection failed on startup: {e}")

    yield

    if neo4j_driver:
        neo4j_driver.close()

app = FastAPI(title="Khora API Bridge", lifespan=lifespan)

origins = []
if "KHORA_WEB_ORIGIN" in os.environ:
    origins.append(os.environ["KHORA_WEB_ORIGIN"])
else:
    # REQ-3: CORS restricted exclusively to KHORA_WEB_ORIGIN
    logging.warning("KHORA_WEB_ORIGIN not set, no CORS origins allowed")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins if origins else [], # Restrict CORS strictly
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def security_middleware(request: Request, call_next):
    # Exclude OPTIONS (CORS preflight) and healthcheck endpoints
    if request.method == "OPTIONS" or request.url.path in ["/health", "/api/v1/salud", "/api/v1/salud/grafo"]:
        return await call_next(request)

    x_khora_key = request.headers.get("X-Khora-Key")
    expected_key = os.getenv("KHORA_API_KEY")

    if not expected_key or x_khora_key != expected_key:
        from fastapi.responses import JSONResponse
        return JSONResponse(status_code=401, content={"detail": "unauthorized"})

    return await call_next(request)



def _emit_service_event(correlation_id: str, method: str, route: str, status_code: int, duration_ms: int) -> None:
    key = os.getenv("KHORA_API_KEY")
    if not key:
        return
    target_base = os.getenv("KHORA_WEB_ORIGIN", "https://khora-web.vercel.app").rstrip("/")
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    payload = [{
        "event_uuid": str(uuid.uuid4()),
        "schema_version": "2.0",
        "event_name": "SERVICE_HTTP",
        "phase": "autorizacion" if status_code in (401, 403) else "manejo",
        "severity": "ERROR" if status_code >= 500 else ("WARN" if status_code >= 400 else "INFO"),
        "outcome": "FAILURE" if status_code >= 400 else "SUCCESS",
        "component": "fastapi-bridge",
        "correlation_id": correlation_id,
        "causation_id": None,
        "attempt_id": None,
        "sequence": None,
        "session_id": None,
        "release_sha": os.getenv("VERCEL_GIT_COMMIT_SHA") or os.getenv("GIT_SHA"),
        "client_time": now,
        "server_time": now,
        "duration_ms": duration_ms,
        "metrics": {"status_code": status_code, "method": method, "route": route},
        "reason_code": ("HTTP_" + str(status_code)) if status_code >= 400 else None,
        "privacy_class": "SYSTEM_AUDIT",
    }]
    try:
        request = urllib.request.Request(
            target_base + "/api/eventos",
            data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
            method="POST",
            headers={"Content-Type": "application/json", "X-Khora-Key": key},
        )
        with urllib.request.urlopen(request, timeout=2) as response:
            response.read(32)
    except Exception as exc:
        logging.warning("FastAPI observability delivery failed: %s", type(exc).__name__)


@app.middleware("http")
async def observability_middleware(request: Request, call_next):
    if request.method == "OPTIONS":
        return await call_next(request)
    correlation_id = request.headers.get("X-Khora-Correlation-Id") or str(uuid.uuid4())
    started = datetime.datetime.now(datetime.timezone.utc)
    try:
        response = await call_next(request)
    except Exception:
        duration_ms = int((datetime.datetime.now(datetime.timezone.utc) - started).total_seconds() * 1000)
        asyncio.create_task(asyncio.to_thread(_emit_service_event, correlation_id, request.method, request.url.path, 500, duration_ms))
        raise

    response.headers["X-Khora-Correlation-Id"] = correlation_id

    if hasattr(response, "body_iterator") and response.body_iterator is not None:
        original_iterator = response.body_iterator

        async def observed_stream():
            try:
                async for chunk in original_iterator:
                    yield chunk
            except Exception:
                duration_ms = int((datetime.datetime.now(datetime.timezone.utc) - started).total_seconds() * 1000)
                await asyncio.to_thread(_emit_service_event, correlation_id, request.method, request.url.path, 500, duration_ms)
                raise
            else:
                duration_ms = int((datetime.datetime.now(datetime.timezone.utc) - started).total_seconds() * 1000)
                await asyncio.to_thread(_emit_service_event, correlation_id, request.method, request.url.path, response.status_code, duration_ms)

        response.body_iterator = observed_stream()
        return response

    duration_ms = int((datetime.datetime.now(datetime.timezone.utc) - started).total_seconds() * 1000)
    asyncio.create_task(asyncio.to_thread(_emit_service_event, correlation_id, request.method, request.url.path, response.status_code, duration_ms))
    return response

# Keep verify_key around just in case endpoints depend on it explicitly via Depends,
# though the middleware handles it globally now.
async def verify_key(x_khora_key: str = Header(default=None)):
    pass

class IngestaRequest(BaseModel):
    texto: Optional[str] = None
    archivo_base64: Optional[str] = None
    mime: Optional[str] = None
    provenance: Optional[dict] = None

    @model_validator(mode="after")
    def check_exclusivo(self):
        tiene_texto = bool(self.texto)
        tiene_archivo = bool(self.archivo_base64 and self.mime)
        if not tiene_texto and not tiene_archivo:
            raise ValueError("Se requiere texto o archivo_base64+mime")
        if tiene_texto and tiene_archivo:
            raise ValueError("texto y archivo_base64 son mutuamente excluyentes")
        return self

    @model_validator(mode="after")
    def check_procedencia(self):
        import hashlib
        import re
        prov = self.provenance or {}
        faltantes = [c for c in ("volcado_id", "version", "sha256") if prov.get(c) in (None, "")]
        if faltantes:
            raise ValueError("procedencia incompleta: faltan " + ", ".join(faltantes))
        if not re.fullmatch(r"[0-9a-fA-F-]{36}", str(prov["volcado_id"])):
            raise ValueError("volcado_id no es un UUID de 36 caracteres")
        try:
            version_num = int(prov["version"])
        except (TypeError, ValueError):
            raise ValueError("version no es un entero")
        if version_num < 1:
            raise ValueError("version debe ser >= 1")
        sha_declarado = str(prov["sha256"]).lower()
        if not re.fullmatch(r"[0-9a-f]{64}", sha_declarado):
            raise ValueError("sha256 no es un digest hexadecimal de 64 caracteres")
        if self.texto is not None:
            sha_real = hashlib.sha256(self.texto.encode("utf-8")).hexdigest()
            if sha_real != sha_declarado:
                raise ValueError("sha256 no coincide con el texto recibido")
        elif self.archivo_base64:
            import base64
            try:
                payload = base64.b64decode(self.archivo_base64, validate=True)
            except Exception as exc:
                raise ValueError(f"archivo_base64 inválido: {exc}")
            sha_real = hashlib.sha256(payload).hexdigest()
            if sha_real != sha_declarado:
                raise ValueError("sha256 no coincide con el archivo recibido")
        return self


@app.post("/api/v1/ingesta", dependencies=[Depends(verify_key)])
async def endpoint_ingesta(req: IngestaRequest):
    if not neo4j_driver:
        raise HTTPException(status_code=503, detail="Database not available")

    try:
        # Import dynamically here to avoid strict import dependencies if they break
        from khora_kernel.motor import Neo4jMemoriaOrganizada
        from khora_kernel.proveedores import ProveedorOpenAICompatible

        memoria = Neo4jMemoriaOrganizada(neo4j_config["uri"], neo4j_config["user"], neo4j_config["password"])
        puerto_llm = ProveedorOpenAICompatible()
        puerto_embeddings = ProveedorOpenAICompatible()

        prov_dict = req.provenance or {}
        prov = Provenance(
            origen=prov_dict.get("origen", "api"),
            driver=prov_dict.get("driver", "fastapi"),
            timestamp=prov_dict.get("timestamp", datetime.datetime.utcnow().isoformat() + "Z"),
            event_time=prov_dict.get("event_time"),
            capture_time=prov_dict.get("capture_time"),
            custody=prov_dict.get("custody"),
        )

        prov_terna = req.provenance or {}
        clave_version = "khora:volcado:" + str(prov_terna["volcado_id"]) + ":v" + str(int(prov_terna["version"]))
        objeto_id = str(uuid.uuid5(uuid.NAMESPACE_URL, clave_version))

        version_terna = int(prov_terna["version"])
        sha_terna = str(prov_terna["sha256"]).lower()
        with neo4j_driver.session() as session:
            existente = session.run("MATCH (io:InformationObject {io_id:$io}) RETURN io.volcado_id AS v, io.version AS ver, io.sha256 AS s", io=objeto_id).single()
        if existente:
            if existente["v"] == str(prov_terna["volcado_id"]) and existente["ver"] == version_terna and existente["s"] == sha_terna:
                return {"io_id": objeto_id, "counters": {"create": 0, "update": 0, "ignore": 0}, "ts": datetime.datetime.utcnow().isoformat() + "Z", "idempotent": True}
            raise Exception(f"Conflicto terna io_id={objeto_id}")

        texto_final = req.texto
        if not texto_final and req.archivo_base64:
             texto_final = f"Archivo base64 ({req.mime})"

        metadata = {
            "volcado_id": str(prov_terna["volcado_id"]),
            "version": str(int(prov_terna["version"])),
            "sha256": str(prov_terna["sha256"]).lower(),
            "clave_version": clave_version,
        }
        if req.archivo_base64:
            metadata["payload_uri"] = f"data:{req.mime};base64,{req.archivo_base64[:20]}..."

        raw_payload = None
        if req.archivo_base64:
            import base64
            raw_payload = base64.b64decode(req.archivo_base64)
        objeto = ObjetoDeInformacion(
            id=objeto_id,
            texto=texto_final,
            provenance=prov,
            metadata=metadata,
            raw_payload=raw_payload,
            source_schema=req.mime,
        )

        from khora_kernel.psi import on_node_upserted
        pipeline_result = {}
        def _post_commit(io_id, mem, ts):
            nonlocal pipeline_result
            pipeline_result = on_node_upserted(io_id, mem, ts, puerto_llm)
            return pipeline_result

        try:
            acta = ingestar(
                objeto=objeto,
                memoria=memoria,
                puerto_llm=puerto_llm,
                puerto_embeddings=puerto_embeddings,
                on_upsert=_post_commit,
            )
        except Exception as write_error:
            # Dos solicitudes de la misma terna pueden superar el precheck a la vez.
            # Solo se considera idempotente el perdedor si una lectura posterior
            # demuestra que existe el mismo io_id con la misma terna inmutable.
            if not _is_identity_constraint_conflict(write_error):
                raise

            with neo4j_driver.session() as session:
                existente_concurrente = session.run(
                    "MATCH (io:InformationObject {io_id:$io}) "
                    "RETURN io.volcado_id AS v, io.version AS ver, io.sha256 AS s",
                    io=objeto_id,
                ).single()

            if not existente_concurrente:
                raise

            misma_terna = _same_ingesta_provenance_tuple(
                existente_concurrente,
                str(prov_terna["volcado_id"]),
                version_terna,
                sha_terna,
            )
            if not misma_terna:
                raise HTTPException(
                    status_code=409,
                    detail={
                        "error": "conflicto de procedencia en carrera de ingesta",
                        "volcado_id": str(prov_terna["volcado_id"]),
                        "version": version_terna,
                    },
                )

            return {
                "io_id": objeto_id,
                "counters": {"create": 0, "update": 0, "ignore": 0},
                "ts": datetime.datetime.now(datetime.timezone.utc).isoformat(),
                "idempotent": True,
            }

        return {
            "io_id": objeto.id,
            "counters": {
                "create": acta.ideas_novedosas,
                "update": acta.matices,
                "ignore": acta.ideas_repetidas
            },
            "triples_escritos": acta.triples_escritos,
            "needs_review": acta.needs_review,
            "ts": acta.timestamp,
            "graph_revision": pipeline_result.get("graph_revision") or memoria.get_graph_revision(),
            "pipeline": pipeline_result
        }
    except HTTPException:
        raise
    except Exception as e:
        if type(e).__name__ in ("HuerfanosDetectadosError", "IngestaFallidaError"):
            detail_payload = {"error": "ingesta revertida", "causa": str(e)}
            if hasattr(e, "huerfanos"):
                detail_payload["huerfanos"] = e.huerfanos
            raise HTTPException(status_code=409, detail=detail_payload)

        logging.error(f"Ingest error: {traceback.format_exc()}")
        if isinstance(e, ImportError):
            raise HTTPException(status_code=503, detail={"error": "motor no disponible", "causa": str(e)})
        raise HTTPException(status_code=500, detail=str(e))


class ConsultaRequest(BaseModel):
    pregunta: str
    contexto: Optional[str] = None


@app.post("/api/v1/consulta", dependencies=[Depends(verify_key)])
async def endpoint_consulta(req: ConsultaRequest):
    if not neo4j_driver:
        raise HTTPException(status_code=503, detail="Database not available")

    try:
        from khora_kernel.motor import Neo4jMemoriaOrganizada
        from khora_kernel.proveedores import ProveedorOpenAICompatible
        from khora_kernel.consulta.retriever import RetrieverGraphRAG
        from khora_kernel.api import ContextoDeVisibilidad
    except ImportError as e:
        raise HTTPException(status_code=503, detail={"error": "motor no disponible", "causa": str(e)})

    try:
        memoria = Neo4jMemoriaOrganizada(neo4j_config["uri"], neo4j_config["user"], neo4j_config["password"])
        puerto_embeddings = ProveedorOpenAICompatible()

        retriever = RetrieverGraphRAG(memoria_grafo=memoria, puerto_embeddings=puerto_embeddings)

        contexto_str = req.contexto if req.contexto else "privado"
        try:
            contexto = ContextoDeVisibilidad(contexto_str)
        except ValueError:
            contexto = ContextoDeVisibilidad.PRIVADO

        resultado = retriever.consultar(pregunta=req.pregunta, contexto=contexto)

        from puentes.unificador import UnificadorAlLeer
        # Initialize driver properly if injected
        unificador = UnificadorAlLeer(neo4j_driver)

        subgrafo_nodos = [{"id": n.id, "etiqueta": n.etiqueta} for n in resultado.subgrafo.nodos]
        subgrafo_aristas = [{"origen": a.origen, "destino": a.destino, "relacion": a.relacion} for a in resultado.subgrafo.aristas]
        fragmentos = [{"id": f.id, "texto": f.texto, "visibilidad": f.visibilidad.value} for f in resultado.fragmentos]
        subgrafo_dict = {"nodos": subgrafo_nodos, "aristas": subgrafo_aristas}
        subgrafo_unificado = unificador.aplicar_puentes_a_subgrafo(subgrafo_dict)


        return {
            "fragmentos": fragmentos,
            "subgrafo": {
                "nodos": subgrafo_unificado["nodos"],
                "aristas": subgrafo_unificado["aristas"]
            },
            "suficiencia": resultado.suficiencia.value,
            "resumenes_incluidos": resultado.resumenes_incluidos,
            "degradacion_declarada": resultado.degradacion_declarada
        }
    except Exception as e:
        logging.error(f"Consulta error: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))


class MensajeChat(BaseModel):
    rol: str
    contenido: str


class ChatRequest(BaseModel):
    mensajes: List[MensajeChat]
    perfil: str
    modelo_override: Optional[str] = None


@app.post("/api/v1/chat", dependencies=[Depends(verify_key)])
async def endpoint_chat(req: ChatRequest):
    import json
    import urllib.error
    from khora_kernel.proveedores import (
        PerfilLLMNoConfiguradoError,
        crear_proveedor_por_perfil,
        extraer_segundos_reintento,
    )

    try:
        proveedor = crear_proveedor_por_perfil(req.perfil, modelo_override=req.modelo_override)
        mensajes_dict = [{"role": m.rol, "content": m.contenido} for m in req.mensajes]
        stream_iter = proveedor.generar_stream(mensajes_dict)
    except PerfilLLMNoConfiguradoError as e:
        raise HTTPException(
            status_code=503,
            detail={"error": "PERFIL_NO_CONFIGURADO", "perfil": e.perfil, "detalle": e.mensaje}
        )
    except urllib.error.HTTPError as e:
        error_body = ""
        try:
            error_body = e.read().decode("utf-8")
        except Exception:
            pass
        if e.code == 429:
            segundos = extraer_segundos_reintento(error_body, headers=e.headers)
            raise HTTPException(
                status_code=429,
                detail={"error": "RATE_LIMIT", "perfil": req.perfil, "reintentar_en_segundos": segundos}
            )
        raise HTTPException(
            status_code=502,
            detail={"error": "PROVEEDOR_ERROR", "perfil": req.perfil, "codigo": e.code, "mensaje": str(e)}
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={"error": "ERROR_INTERNO", "perfil": req.perfil, "mensaje": str(e)}
        )

    async def sse_event_generator():
        origen = f"llm:{req.perfil}:{proveedor.llm_model}"
        try:
            for chunk in stream_iter:
                if isinstance(chunk, dict) and "usage" in chunk:
                    payload_usage = {"tipo": "usage", "usage": chunk["usage"]}
                    yield f"data: {json.dumps(payload_usage, ensure_ascii=False)}\n\n"
                elif isinstance(chunk, str):
                    payload = {"tipo": "chunk", "texto": chunk, "origen": origen}
                    yield f"data: {json.dumps(payload, ensure_ascii=False)}\n\n"

            payload_fin = {"tipo": "fin"}
            yield f"data: {json.dumps(payload_fin, ensure_ascii=False)}\n\n"
        except urllib.error.HTTPError as e:
            error_body = ""
            try:
                error_body = e.read().decode("utf-8")
            except Exception:
                pass
            if e.code == 429:
                segundos = extraer_segundos_reintento(error_body, headers=e.headers)
                payload_err = {"tipo": "error", "error": "RATE_LIMIT", "perfil": req.perfil, "reintentar_en_segundos": segundos}
            else:
                payload_err = {"tipo": "error", "error": "PROVEEDOR_ERROR", "perfil": req.perfil, "codigo": e.code}
            yield f"data: {json.dumps(payload_err, ensure_ascii=False)}\n\n"
        except Exception as e:
            payload_err = {"tipo": "error", "error": "ERROR_INTERNO", "perfil": req.perfil, "mensaje": str(e)}
            yield f"data: {json.dumps(payload_err, ensure_ascii=False)}\n\n"

    return StreamingResponse(sse_event_generator(), media_type="text/event-stream")


@app.get("/health")
@app.get("/api/v1/salud")
async def endpoint_salud():
    if not neo4j_driver:
        return {"ok": False, "neo4j": False, "detail": "driver is none"}

    try:
        # 1 query trivial Neo4j real
        with neo4j_driver.session() as session:
            result = session.run("RETURN 1 AS num")
            record = result.single()
            if record and record["num"] == 1:
                return {"ok": True, "neo4j": True}
            else:
                return {"ok": False, "neo4j": False}
    except Exception as e:
        return {"ok": False, "neo4j": False, "detail": str(e)}


class OlvidoRequest(BaseModel):
    io_id: str


@app.get("/api/v1/salud/grafo", dependencies=[Depends(verify_key)])
async def endpoint_salud_grafo():
    if not neo4j_driver:
        raise HTTPException(status_code=503, detail="Database not available")
    try:
        from khora_kernel.motor import Neo4jMemoriaOrganizada
        memoria = Neo4jMemoriaOrganizada(neo4j_config["uri"], neo4j_config["user"], neo4j_config["password"])
        payload = _graph_health_payload(memoria.salud_grafo())
        if not payload["ok"]:
            raise HTTPException(status_code=409, detail=payload)
        return payload
    except HTTPException:
        raise
    except Exception as exc:
        logging.error("Graph health error: %s", traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(exc))


@app.post("/api/v1/olvidar", dependencies=[Depends(verify_key)])
async def endpoint_olvidar(req: OlvidoRequest):
    if not neo4j_driver:
        raise HTTPException(status_code=503, detail="Database not available")
    try:
        from khora_kernel.motor import Neo4jMemoriaOrganizada
        from khora_kernel.proveedores import ProveedorOpenAICompatible
        from khora_kernel.psi import on_node_upserted
        memoria = Neo4jMemoriaOrganizada(neo4j_config["uri"], neo4j_config["user"], neo4j_config["password"])
        acta = memoria.olvidar(req.io_id)
        ts = datetime.datetime.now(datetime.timezone.utc).isoformat()
        provider = ProveedorOpenAICompatible()
        pipeline = on_node_upserted("forget:" + req.io_id, memoria, ts, provider)
        return {"ok": True, "io_id": req.io_id, "forget_fingerprint": acta, "pipeline": pipeline}
    except Exception as exc:
        logging.error("Forget error: %s", traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(exc))

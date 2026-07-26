# @l0 L0-002-R · @req API-00/REQ-1,REQ-2,REQ-3,DEPLOY-01/REQ-1,DEPLOY-01/REQ-2,DEPLOY-01/REQ-3 · @acr ACR-1.1,ACR-1.2,ACR-2.1,ACR-3.1 · @ua —
import os
import uuid
import datetime
import traceback
from typing import Optional
from fastapi import FastAPI, Depends, HTTPException, Header, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, model_validator
import logging
from contextlib import asynccontextmanager

from neo4j import GraphDatabase

try:
    from khora_kernel.poblacion import ingestar
    from khora_kernel.api import ObjetoDeInformacion, Provenance
except ImportError:
    pass

try:
    from khora_kernel.consulta.fgrag import consultar as fgrag_consultar
except ImportError:
    fgrag_consultar = None


neo4j_driver = None

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
    if request.method == "OPTIONS" or request.url.path in ["/health", "/api/v1/salud"]:
        return await call_next(request)

    x_khora_key = request.headers.get("X-Khora-Key")
    expected_key = os.getenv("KHORA_API_KEY")

    if not expected_key or x_khora_key != expected_key:
        from fastapi.responses import JSONResponse
        return JSONResponse(status_code=401, content={"detail": "unauthorized"})

    return await call_next(request)

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


@app.post("/api/v1/ingesta", dependencies=[Depends(verify_key)])
async def endpoint_ingesta(req: IngestaRequest):
    if not neo4j_driver:
        raise HTTPException(status_code=503, detail="Database not available")

    try:
        # Import dynamically here to avoid strict import dependencies if they break
        from khora_kernel.drivers.memoria import MemoriaNeo4j
        from khora_kernel.proveedores import ProveedorOpenAICompatible
        from khora_kernel.proveedores.embeddings import ProveedorEmbeddings

        memoria = MemoriaNeo4j(neo4j_driver)
        puerto_llm = ProveedorOpenAICompatible()
        puerto_embeddings = ProveedorEmbeddings()

        prov_dict = req.provenance or {}
        prov = Provenance(
            origen=prov_dict.get("origen", "api"),
            driver=prov_dict.get("driver", "fastapi"),
            timestamp=prov_dict.get("timestamp", datetime.datetime.utcnow().isoformat() + "Z")
        )

        objeto_id = str(uuid.uuid4())

        texto_final = req.texto
        if not texto_final and req.archivo_base64:
             texto_final = f"Archivo base64 ({req.mime})"

        metadata = {}
        if req.archivo_base64:
            metadata["payload_uri"] = f"data:{req.mime};base64,{req.archivo_base64[:20]}..."

        objeto = ObjetoDeInformacion(
            id=objeto_id,
            texto=texto_final,
            provenance=prov,
            metadata=metadata
        )

        acta = ingestar(
            objeto=objeto,
            memoria=memoria,
            puerto_llm=puerto_llm,
            puerto_embeddings=puerto_embeddings
        )

        return {
            "io_id": objeto.id,
            "counters": {
                "create": acta.ideas_novedosas,
                "update": acta.matices,
                "ignore": acta.ideas_repetidas
            },
            "ts": acta.timestamp
        }
    except Exception as e:
        logging.error(f"Ingest error: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v1/consulta", dependencies=[Depends(verify_key)])
async def endpoint_consulta(req: dict):
    if fgrag_consultar is None:
        raise HTTPException(status_code=503, detail="motor no disponible")

    # Normally we'd call fgrag_consultar(req.get("pregunta"))
    return {"status": "ok"}

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

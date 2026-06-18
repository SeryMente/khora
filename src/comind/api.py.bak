from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from comind import inbox, store

app = FastAPI(title="CoMind API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class CaptureRequest(BaseModel):
    texto: str


class CaptureResponse(BaseModel):
    ok: bool
    id: str | None = None


class CapturaItem(BaseModel):
    id: str
    texto: str
    timestamp: str


class CapturasResponse(BaseModel):
    capturas: list[CapturaItem]


@app.post("/capturar", response_model=CaptureResponse)
def capturar(request: CaptureRequest) -> CaptureResponse:
    capture = inbox.add(request.texto, source="web")
    return CaptureResponse(ok=True, id=capture.id)


@app.get("/capturas", response_model=CapturasResponse)
def obtener_capturas() -> CapturasResponse:
    capturas = store.fetch_all_captures()
    # Ordenar de más reciente a más antigua
    capturas_sorted = sorted(capturas, key=lambda c: c.timestamp, reverse=True)
    items = [
        CapturaItem(
            id=c.id,
            texto=c.text,
            timestamp=c.timestamp.isoformat(),
        )
        for c in capturas_sorted
    ]
    return CapturasResponse(capturas=items)

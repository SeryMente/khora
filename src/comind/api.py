from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from comind import inbox


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


@app.post("/capturar", response_model=CaptureResponse)
def capturar(request: CaptureRequest) -> CaptureResponse:
    capture = inbox.add(request.texto, source="web")
    return CaptureResponse(ok=True, id=capture.id)

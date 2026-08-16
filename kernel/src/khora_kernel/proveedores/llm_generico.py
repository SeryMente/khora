# @l0 L0-002-R · @req KA-00/REQ-2 · @acr ACR-2.1
import json
import os
import urllib.error
import urllib.request
from datetime import datetime
from typing import Any, Dict, List, Optional

from khora_kernel.api import (
    Provenance,
    RespuestaLLM,
    SolicitudLLM,
)


class ProveedorLLMGenerico:
    def __init__(self, api_url: Optional[str] = None, api_key: Optional[str] = None, model: Optional[str] = None):
        self.base_url = api_url or os.environ.get("KHORA_LLM_BASE_URL", "").rstrip("/")
        self.api_key = api_key or os.environ.get("KHORA_LLM_API_KEY", "")
        self.llm_model = model or os.environ.get("KHORA_LLM_MODEL", "")
        self.embeddings_base_url = os.environ.get("KHORA_EMBEDDINGS_BASE_URL", "").rstrip("/")
        self.embeddings_api_key = os.environ.get("KHORA_EMBEDDINGS_API_KEY", "")
        self.embeddings_model = os.environ.get("KHORA_EMBEDDINGS_MODEL", "")
        self.timeout = int(os.environ.get("KHORA_LLM_TIMEOUT", "60"))  # D3

    def generar(self, solicitud: SolicitudLLM) -> RespuestaLLM:
        url = f"{self.base_url}/chat/completions"
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}",
        }

        messages: List[Dict[str, Any]] = []
        if solicitud.sistema:
            messages.append({"role": "system", "content": solicitud.sistema})

        if solicitud.imagenes_base64:
            content_list: List[Dict[str, Any]] = [{"type": "text", "text": solicitud.prompt}]
            for img_b64 in solicitud.imagenes_base64:
                url_str = img_b64 if img_b64.startswith("data:image") or img_b64.startswith("http") else f"data:image/jpeg;base64,{img_b64}"
                content_list.append({"type": "image_url", "image_url": {"url": url_str}})
            messages.append({"role": "user", "content": content_list})
        else:
            messages.append({"role": "user", "content": solicitud.prompt})

        data = {
            "model": self.llm_model,
            "messages": messages,
            "temperature": solicitud.metadata.get("temperature", 0.0),
        }

        req = urllib.request.Request(
            url,
            data=json.dumps(data).encode("utf-8"),
            headers=headers,
            method="POST",
        )

        try:
            with urllib.request.urlopen(req, timeout=self.timeout) as response:
                resp_data = json.loads(response.read().decode("utf-8"))

                if "choices" in resp_data and len(resp_data["choices"]) > 0:
                    content = resp_data["choices"][0]["message"]["content"]
                else:
                    content = ""

                if solicitud.formato_estricto:
                    content = content.strip()
                    if content not in solicitud.formato_estricto:
                        encontrado = False
                        for opcion in solicitud.formato_estricto:
                            if opcion.lower() in content.lower():
                                content = opcion
                                encontrado = True
                                break
                        if not encontrado:
                            content = solicitud.formato_estricto[0]

                from datetime import timezone
                prov = Provenance(
                    origen=f"llm:{self.llm_model}",
                    driver="proveedor_llm_generico",
                    timestamp=datetime.now(timezone.utc).isoformat(),
                )
                return RespuestaLLM(texto=content, modelo=self.llm_model, provenance=prov)
        except urllib.error.URLError as e:
            raise RuntimeError(f"Error de conexión con LLM: {e}")

    def incrustar(self, textos: list[str]) -> list[list[float]]:
        base_url = (
            os.environ.get("KHORA_EMBEDDINGS_BASE_URL", "").rstrip("/")
            or self.embeddings_base_url
            or self.base_url
        )
        api_key = (
            os.environ.get("KHORA_EMBEDDINGS_API_KEY", "")
            or self.embeddings_api_key
            or self.api_key
        )

        url = f"{base_url}/embeddings"
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
        }

        data = {
            "model": self.embeddings_model,
            "input": textos,
        }

        req = urllib.request.Request(
            url,
            data=json.dumps(data).encode("utf-8"),
            headers=headers,
            method="POST",
        )

        try:
            with urllib.request.urlopen(req, timeout=self.timeout) as response:
                resp_data = json.loads(response.read().decode("utf-8"))

                if "data" in resp_data:
                    embeddings = [item["embedding"] for item in sorted(resp_data["data"], key=lambda x: x.get("index", 0))]
                    return embeddings
                return []
        except urllib.error.URLError as e:
            raise RuntimeError(f"Error de conexión con Embeddings: {e}")

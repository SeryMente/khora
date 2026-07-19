import json
import os
import urllib.error
import urllib.request
from datetime import datetime

from khora_kernel.api import (
    Provenance,
    RespuestaLLM,
    SolicitudLLM,
)


class ProveedorOpenAICompatible:
    def __init__(self):
        self.base_url = os.environ.get("KHORA_LLM_BASE_URL", "").rstrip("/")
        self.llm_model = os.environ.get("KHORA_LLM_MODEL", "")
        self.api_key = os.environ.get("KHORA_LLM_API_KEY", "")
        self.embeddings_model = os.environ.get("KHORA_EMBEDDINGS_MODEL", "")
        self.timeout = int(os.environ.get("KHORA_LLM_TIMEOUT", "60"))  # D3

    def generar(self, solicitud: SolicitudLLM) -> RespuestaLLM:
        url = f"{self.base_url}/chat/completions"
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}",
        }

        messages = []
        if solicitud.sistema:
            messages.append({"role": "system", "content": solicitud.sistema})
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

                # Acceder al contenido del primer choice (D4)
                if "choices" in resp_data and len(resp_data["choices"]) > 0:
                    content = resp_data["choices"][0]["message"]["content"]
                else:
                    content = ""

                # Parseo estricto del texto (D2)
                if solicitud.formato_estricto:
                    content = content.strip()
                    # Si no coincide exactamente, iteramos para ver si contiene alguna de las opciones
                    if content not in solicitud.formato_estricto:
                        encontrado = False
                        for opcion in solicitud.formato_estricto:
                            if opcion.lower() in content.lower():
                                content = opcion
                                encontrado = True
                                break
                        if not encontrado:
                            # Fallback D4
                            content = solicitud.formato_estricto[0]

                prov = Provenance(
                    origen=f"llm:{self.llm_model}",
                    driver="proveedor_openai_compatible",
                    timestamp=datetime.utcnow().isoformat() + "Z",
                )
                return RespuestaLLM(texto=content, modelo=self.llm_model, provenance=prov)
        except urllib.error.URLError as e:
            raise RuntimeError(f"Error de conexión con LLM: {e}")

    def incrustar(self, textos: list[str]) -> list[list[float]]:
        url = f"{self.base_url}/embeddings"
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}",
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
                    # Ordenar por índice por si acaso y extraer embedding
                    embeddings = [item["embedding"] for item in sorted(resp_data["data"], key=lambda x: x["index"])]
                    return embeddings
                return []
        except urllib.error.URLError as e:
            raise RuntimeError(f"Error de conexión con Embeddings: {e}")

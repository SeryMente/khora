# @l0 L0-002-R · @req KA-00/REQ-CHAT · @acr ACR-2.1
import json
import os
import re
import urllib.error
import urllib.request
from datetime import datetime
from typing import Any, Dict, Generator, List, Optional

from khora_kernel.api import (
    Provenance,
    RespuestaLLM,
    SolicitudLLM,
)


class PerfilLLMNoConfiguradoError(Exception):
    """Excepción lanzada cuando un perfil de proveedor LLM no existe o carece de variables requeridas."""

    def __init__(self, perfil: str, mensaje: str):
        super().__init__(f"Perfil '{perfil}': {mensaje}")
        self.perfil = perfil
        self.mensaje = mensaje


def extraer_segundos_reintento(error_body: str, headers: Any = None) -> Optional[float]:
    """Extrae el tiempo en segundos para reintentar una petición tras un error de límite de cuota (Rate Limit)."""
    if headers:
        retry_after = headers.get("Retry-After") or headers.get("retry-after")
        if retry_after:
            try:
                return float(retry_after)
            except (ValueError, TypeError):
                pass

    if error_body:
        match = re.search(r"try again in\s+(\d+(?:\.\d+)?)\s*(ms|s|m|min)?", error_body, re.IGNORECASE)
        if match:
            num = float(match.group(1))
            unit = (match.group(2) or "s").lower()
            if unit == "ms":
                return round(num / 1000.0, 2)
            elif unit in ("m", "min"):
                return round(num * 60.0, 2)
            return round(num, 2)

    return None


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

    def generar_stream(
        self,
        mensajes: List[Dict[str, Any]],
        temperature: float = 0.0
    ) -> Generator[Any, None, None]:
        """Envía una petición con stream=True y produce fragmentos de texto o diccionarios de métricas conforme se reciben."""
        url = f"{self.base_url}/chat/completions"
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}",
        }

        data = {
            "model": self.llm_model,
            "messages": mensajes,
            "temperature": temperature,
            "stream": True,
            "stream_options": {"include_usage": True},
        }

        req = urllib.request.Request(
            url,
            data=json.dumps(data).encode("utf-8"),
            headers=headers,
            method="POST",
        )

        try:
            response = urllib.request.urlopen(req, timeout=self.timeout)
        except urllib.error.HTTPError as e:
            raise e
        except urllib.error.URLError as e:
            raise RuntimeError(f"Error de conexión con LLM: {e}")

        def _read_chunks() -> Generator[Any, None, None]:
            try:
                for line in response:
                    line_str = line.decode("utf-8").strip()
                    if not line_str or line_str.startswith(":"):
                        continue
                    if line_str.startswith("data: "):
                        payload_str = line_str[6:].strip()
                        if payload_str == "[DONE]":
                            break
                        try:
                            payload = json.loads(payload_str)
                            choices = payload.get("choices", [])
                            if choices:
                                delta = choices[0].get("delta", {})
                                content = delta.get("content", "")
                                if content:
                                    yield content
                            if "usage" in payload and payload["usage"]:
                                yield {"usage": payload["usage"]}
                        except json.JSONDecodeError:
                            continue
            finally:
                response.close()

        return _read_chunks()

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


def crear_proveedor_por_perfil(
    nombre_perfil: str,
    modelo_override: Optional[str] = None
) -> ProveedorLLMGenerico:
    """
    Fábrica de proveedor LLM que resuelve la configuración según el perfil pedido.

    Soporta los perfiles explícitos: 'open_source', 'gemini', 'groq', 'default'.
    Prohibido el fallback silencioso a otro perfil si el pedido carece de variables.
    """
    if not nombre_perfil or not isinstance(nombre_perfil, str) or not nombre_perfil.strip():
        raise PerfilLLMNoConfiguradoError(str(nombre_perfil), "Nombre de perfil no proporcionado o inválido.")

    perfil_norm = nombre_perfil.strip().lower()

    if perfil_norm in ("default", "predeterminado"):
        base_url = os.environ.get("KHORA_LLM_BASE_URL", "").rstrip("/")
        api_key = os.environ.get("KHORA_LLM_API_KEY", "")
        model = os.environ.get("KHORA_LLM_MODEL", "")
    else:
        prefix = f"KHORA_PERFIL_{perfil_norm.upper()}_"
        base_url = os.environ.get(f"{prefix}BASE_URL", "").rstrip("/")
        api_key = os.environ.get(f"{prefix}API_KEY", "")
        model = os.environ.get(f"{prefix}MODEL", "")

    if modelo_override and isinstance(modelo_override, str) and modelo_override.strip():
        model = modelo_override.strip()

    faltantes = []
    if not base_url:
        faltantes.append("BASE_URL")
    if not api_key:
        faltantes.append("API_KEY")
    if not model:
        faltantes.append("MODEL")

    if faltantes:
        raise PerfilLLMNoConfiguradoError(
            perfil_norm,
            f"Faltan variables requeridas en el perfil '{perfil_norm}': {', '.join(faltantes)}"
        )

    return ProveedorLLMGenerico(api_url=base_url, api_key=api_key, model=model)

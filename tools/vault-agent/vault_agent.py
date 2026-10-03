# @l0 L0-002-R · @req KA-00/REQ-1 · @acr ACR-2.1
"""Agente local de capacidad para la bóveda canónica de Khora Web.

No contiene la llave maestra en el repositorio. La llave se inscribe una sola vez
y queda protegida con Windows DPAPI para el usuario actual. Cada ejecución posterior
requiere un token efímero emitido por Cora Web y validado en su endpoint canónico.
"""

from __future__ import annotations

import argparse
import base64
import getpass
import hashlib
import hmac
import json
import os
import re
import subprocess
import sys
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

try:
    import win32crypt
except ImportError as exc:
    raise SystemExit("Falta pywin32. Ejecuta este agente con el Python del entorno Khora.") from exc

from cryptography.hazmat.primitives import hashes, padding
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC

TOKEN_RE = re.compile(r"^[A-Za-z0-9_-]{43}$")
CORA_CANONICAL_URL = "https://khora-web.vercel.app"
STATE_PATH = Path(os.environ.get("LOCALAPPDATA", str(Path.home()))) / "Khora" / "state" / "vault-agent-master.dpapi.json"
DEFAULT_VAULT_PATH = Path(__file__).resolve().parents[2] / "secrets" / "env-vault.enc.json"
PBKDF2_ITERATIONS = 200_000
TOKEN_SCOPE = "canonical-vault"


class VaultAgentError(RuntimeError):
    pass


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def parse_utc(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def b64decode(value: str) -> bytes:
    return base64.b64decode(value.encode("ascii"), validate=True)


def derive_key(master: str, salt: bytes) -> bytes:
    kdf = PBKDF2HMAC(algorithm=hashes.SHA256(), length=64, salt=salt, iterations=PBKDF2_ITERATIONS)
    return kdf.derive(master.encode("utf-8"))


def decrypt_entry(entry: dict[str, str], key: bytes) -> str:
    iv = base64.b64decode(entry["nonce"])
    cipher = base64.b64decode(entry["cipher"])
    tag = base64.b64decode(entry["tag"])
    expected = hmac.new(key[32:], iv + cipher, hashlib.sha256).digest()
    if not hmac.compare_digest(tag, expected):
        raise VaultAgentError("Llave de bóveda inválida o entrada manipulada.")
    decryptor = Cipher(algorithms.AES(key[:32]), modes.CBC(iv)).decryptor()
    padded = decryptor.update(cipher) + decryptor.finalize()
    unpadder = padding.PKCS7(algorithms.AES.block_size).unpadder()
    plain = unpadder.update(padded) + unpadder.finalize()
    return plain.decode("utf-8")


def load_vault(path: Path) -> dict[str, Any]:
    if not path.exists():
        raise VaultAgentError(f"No existe la bóveda canónica: {path}")
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise VaultAgentError("No se pudo leer la bóveda canónica.") from exc
    if not isinstance(value, dict) or not isinstance(value.get("salt"), str) or not isinstance(value.get("entries"), dict):
        raise VaultAgentError("Formato de bóveda canónica inválido.")
    return value


def protect_master(master: str) -> None:
    if len(master) < 8:
        raise VaultAgentError("La llave maestra debe tener al menos 8 caracteres.")
    description, blob = win32crypt.CryptProtectData(
        master.encode("utf-8"),
        "Cora canonical vault agent",
        None,
        None,
        None,
        0,
    )
    _ = description
    STATE_PATH.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "version": 1,
        "createdAtUtc": utc_now().isoformat(),
        "protectedMaster": base64.b64encode(blob).decode("ascii"),
        "scope": TOKEN_SCOPE,
    }
    tmp = STATE_PATH.with_suffix(".tmp")
    tmp.write_text(json.dumps(payload, separators=(",", ":")), encoding="utf-8")
    tmp.replace(STATE_PATH)


def load_master() -> str:
    if not STATE_PATH.exists():
        raise VaultAgentError(
            "El agente aún no está inscrito. Ejecuta una sola vez: "
            "python tools\\vault-agent\\vault_agent.py enroll"
        )
    try:
        payload = json.loads(STATE_PATH.read_text(encoding="utf-8"))
        blob = base64.b64decode(str(payload["protectedMaster"]), validate=True)
        _, data = win32crypt.CryptUnprotectData(blob, None, None, None, 0)
        master = data.decode("utf-8")
    except (OSError, KeyError, ValueError, TypeError) as exc:
        raise VaultAgentError("No se pudo recuperar la llave maestra protegida por DPAPI.") from exc
    if not master:
        raise VaultAgentError("La llave maestra protegida está vacía.")
    return master


def canonical_origin(value: str) -> str:
    value = value.rstrip("/")
    if not value.startswith("https://"):
        raise VaultAgentError("Cora Web debe usar HTTPS.")
    return value


def parse_token_from_args(args: argparse.Namespace) -> str:
    if getattr(args, "token_stdin", False):
        token = sys.stdin.readline().strip()
    else:
        token = getattr(args, "token", "") or ""
    if not TOKEN_RE.fullmatch(token):
        raise VaultAgentError("Token de Cora inválido.")
    return token


def introspect(token: str, cora_url: str = CORA_CANONICAL_URL) -> dict[str, Any]:
    url = canonical_origin(cora_url) + "/api/security/vault-agent/introspect"
    request = urllib.request.Request(
        url,
        headers={
            "Authorization": f"Bearer {token}",
            "Accept": "application/json",
            "Cache-Control": "no-store",
            "User-Agent": "cora-vault-agent/1",
        },
        method="GET",
    )
    try:
        with urllib.request.urlopen(request, timeout=15) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        code = "introspection_failed"
        try:
            body = json.loads(exc.read().decode("utf-8"))
            candidate = body.get("error")
            if isinstance(candidate, str):
                code = candidate
        except Exception:
            pass
        raise VaultAgentError(f"Cora Web rechazó la capacidad: {code}.") from exc
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as exc:
        raise VaultAgentError("No se pudo contactar a Cora Web para validar la capacidad.") from exc

    if not isinstance(payload, dict) or payload.get("ok") is not True:
        raise VaultAgentError("Cora Web devolvió una respuesta de capacidad inválida.")
    if payload.get("scope") != TOKEN_SCOPE:
        raise VaultAgentError("La capacidad no contiene el ámbito de la bóveda canónica.")
    if payload.get("audience") != canonical_origin(cora_url):
        raise VaultAgentError("La capacidad no pertenece al origen canónico de Cora Web.")
    expires = parse_utc(str(payload["expiresAt"]))
    if expires <= utc_now():
        raise VaultAgentError("La capacidad de bóveda ha expirado.")
    return payload


def unlock_environment(names: list[str] | None, vault_path: Path) -> dict[str, str]:
    vault = load_vault(vault_path)
    entries = vault["entries"]
    requested = names or list(entries.keys())
    missing = [name for name in requested if name not in entries]
    if missing:
        raise VaultAgentError("Variables ausentes en bóveda: " + ", ".join(missing))
    master = load_master()
    key = derive_key(master, b64decode(str(vault["salt"])))
    env: dict[str, str] = {}
    for name in requested:
        env[name] = decrypt_entry(entries[name], key)
    return env


def enroll(vault_path: Path) -> None:
    if STATE_PATH.exists():
        raise VaultAgentError("El agente ya está inscrito. Usa clear para eliminar la inscripción antes de reemplazarla.")
    master = getpass.getpass("Llave maestra de la bóveda (solo esta vez): ")
    if len(master) < 8:
        raise VaultAgentError("La llave maestra debe tener al menos 8 caracteres.")
    vault = load_vault(vault_path)
    entries = vault["entries"]
    if not entries:
        raise VaultAgentError("La bóveda está vacía; no se puede validar la inscripción.")
    key = derive_key(master, b64decode(str(vault["salt"])))
    first_name = next(iter(entries))
    decrypt_entry(entries[first_name], key)
    protect_master(master)
    print("CORA_VAULT_AGENT_ENROLLED")
    print("DPAPI_SCOPE=Windows-current-user")
    print("MASTER_PLAINTEXT_PERSISTED=no")


def run_command(token: str, command: list[str], names: list[str] | None, vault_path: Path, cora_url: str) -> int:
    if not command:
        raise VaultAgentError("Falta el comando hijo después de --.")
    introspect(token, cora_url)
    env = os.environ.copy()
    env.update(unlock_environment(names, vault_path))
    process = subprocess.run(command, env=env)
    return int(process.returncode)


def run_shell(token: str, names: list[str] | None, vault_path: Path, cora_url: str) -> int:
    introspect(token, cora_url)
    env = os.environ.copy()
    env.update(unlock_environment(names, vault_path))
    return int(subprocess.call(["cmd.exe"], env=env))


def revoke(token: str, cora_url: str) -> None:
    introspect(token, cora_url)
    url = canonical_origin(cora_url) + "/api/security/vault-agent/token"
    request = urllib.request.Request(
        url,
        headers={
            "Authorization": f"Bearer {token}",
            "Accept": "application/json",
            "Cache-Control": "no-store",
        },
        method="DELETE",
    )
    # DELETE requires the Cora browser session, so the bearer capability alone is
    # intentionally not accepted by the server. This command therefore remains a
    # harmless compatibility hook and reports the canonical web control as source.
    raise VaultAgentError("La revocación se realiza desde Cora Web; no se ejecutó ningún cambio local.")


def clear() -> None:
    try:
        STATE_PATH.unlink()
    except FileNotFoundError:
        pass
    print("CORA_VAULT_AGENT_LOCAL_CLEAR")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Agente local de acceso temporal a la bóveda canónica de Cora.")
    sub = parser.add_subparsers(dest="action", required=True)

    p_enroll = sub.add_parser("enroll")
    p_enroll.add_argument("--vault", default=str(DEFAULT_VAULT_PATH))

    for action in ("run", "shell", "status"):
        parser_action = sub.add_parser(action)
        token_group = parser_action.add_mutually_exclusive_group(required=True)
        token_group.add_argument("--token")
        token_group.add_argument("--token-stdin", action="store_true")
        parser_action.add_argument("--cora-url", default=CORA_CANONICAL_URL)
        parser_action.add_argument("--vault", default=str(DEFAULT_VAULT_PATH))
        parser_action.add_argument("--names", nargs="*", default=None)
        if action == "run":
            parser_action.add_argument("command", nargs=argparse.REMAINDER)

    p_revoke = sub.add_parser("revoke")
    token_group = p_revoke.add_mutually_exclusive_group(required=True)
    token_group.add_argument("--token")
    token_group.add_argument("--token-stdin", action="store_true")
    p_revoke.add_argument("--cora-url", default=CORA_CANONICAL_URL)

    sub.add_parser("clear")
    return parser


def main() -> int:
    args = build_parser().parse_args()
    if args.action == "enroll":
        enroll(Path(args.vault))
        return 0
    if args.action == "clear":
        clear()
        return 0

    token = parse_token_from_args(args)
    if args.action == "status":
        payload = introspect(token, args.cora_url)
        print(json.dumps({
            "valid": True,
            "expiresAt": payload["expiresAt"],
            "scope": payload["scope"],
            "audience": payload["audience"],
        }, ensure_ascii=False))
        return 0
    if args.action == "run":
        command = list(args.command)
        if command and command[0] == "--":
            command = command[1:]
        return run_command(token, command, args.names, Path(args.vault), args.cora_url)
    if args.action == "shell":
        return run_shell(token, args.names, Path(args.vault), args.cora_url)
    if args.action == "revoke":
        revoke(token, args.cora_url)
        return 0
    raise VaultAgentError("Acción no soportada.")


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except VaultAgentError as exc:
        print(f"CORA_VAULT_AGENT_ERROR: {exc}", file=sys.stderr)
        raise SystemExit(2)

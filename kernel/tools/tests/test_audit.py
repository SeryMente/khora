# @l0 L0-002-R · @req KA-00/REQ-1 · @acr ACR-1.1
import os
import subprocess


def test_khora_audit_cli():
    env = os.environ.copy()
    env["PYTHONPATH"] = f"{os.getcwd()}:{os.getcwd()}/kernel/src"
    result = subprocess.run(
        ["python", "kernel/tools/khora_audit.py"],
        capture_output=True,
        text=True,
        env=env
    )
    assert "[RESULTADO] Auditoría superada exitosamente." in result.stdout
    assert result.returncode == 0

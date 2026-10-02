#!/usr/bin/env python3
"""Run the EpisTwin PersonalQA evaluation with real configured judge profiles."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import subprocess
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from khora_kernel.api import SolicitudLLM
from khora_kernel.epistwin_audit import run_multi_judge
from khora_kernel.personalqa_loader import PersonalQALoader
from khora_kernel.proveedores import crear_proveedor_por_perfil


def _git_sha() -> str | None:
    try:
        return subprocess.check_output(
            ["git", "rev-parse", "HEAD"],
            text=True,
            stderr=subprocess.DEVNULL,
        ).strip()
    except (OSError, subprocess.CalledProcessError):
        return None


def _source_sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _judge_from_provider(provider: Any):
    def judge(question: str, et_answer: str, target_answer: str) -> dict[str, Any]:
        prompt = (
            "Evalúa una respuesta de EpisTwin contra la respuesta objetivo. "
            "Debes razonar primero y después emitir un Likert entero 1..5. "
            "1-2 = Negative, 3 = Neutral, 4-5 = Positive. "
            "No inventes hechos externos al caso. "
            "Devuelve JSON con reasoning y likert.\\n\\n"
            f"QUESTION:\\n{question}\\n\\n"
            f"EPIS_TWIN_ANSWER:\\n{et_answer}\\n\\n"
            f"TARGET_ANSWER:\\n{target_answer}\\n"
        )
        response = provider.generar(
            SolicitudLLM(
                prompt=prompt,
                sistema=(
                    "Eres juez independiente de evaluación EpisTwin. "
                    "Razona antes de puntuar y no uses conocimiento fuera del caso."
                ),
                formato_estricto=None,
                metadata={"temperature": 0.0, "role": "PersonalQA-Judge"},
            )
        )
        raw = response.texto.strip()
        fence = chr(96) * 3
        raw = raw.replace(fence + "json", "").replace(fence, "").strip()
        data = json.loads(raw)
        reasoning = str(data.get("reasoning") or "").strip()
        score = int(data.get("likert", 0))
        if not reasoning:
            raise ValueError("El juez no devolvió reasoning")
        if score not in range(1, 6):
            raise ValueError(f"Likert inválido: {score}")
        return {"reasoning": reasoning, "likert": score}

    return judge


def _case_rows(data: dict[str, Any], limit: int | None) -> list[dict[str, str]]:
    return [
        {
            "id": str(qa["id"]),
            "q": str(qa["question"]),
            "a_et": str(qa["et_answer"]),
            "a_target": str(qa["target_answer"]),
        }
        for qa in data["qa_pairs"][:limit]
    ]


def main() -> int:
    parser = argparse.ArgumentParser(
        description="EpisTwin PersonalQA real multi-judge runner"
    )
    parser.add_argument(
        "--judges",
        default=os.environ.get("KHORA_EPIS_TWIN_JUDGES", ""),
        help="Perfiles separados por coma, por ejemplo groq,gemini",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=None,
        help="Limita casos para una corrida exploratoria",
    )
    parser.add_argument(
        "--output",
        default="data/epistwin/personalqa-evaluation.json",
        help="Artefacto JSON de salida",
    )
    args = parser.parse_args()

    judge_names = [
        name.strip().lower()
        for name in args.judges.split(",")
        if name.strip()
    ]
    judge_names = list(dict.fromkeys(judge_names))
    if len(judge_names) < 2:
        raise SystemExit(
            "PersonalQA requiere al menos dos perfiles de juez reales. "
            "Configure KHORA_EPIS_TWIN_JUDGES=perfil1,perfil2,...; no se usa fallback."
        )

    loader = PersonalQALoader()
    data = loader.load_and_validate()
    dataset_path = loader.dataset_path.resolve()

    providers = {
        name: crear_proveedor_por_perfil(name)
        for name in judge_names
    }
    judges = {
        name: _judge_from_provider(provider)
        for name, provider in providers.items()
    }

    evaluation = run_multi_judge(_case_rows(data, args.limit), judges)
    git_sha = _git_sha()
    source_sha = _source_sha256(dataset_path)

    record = {
        "benchmark": "PersonalQA-71-100",
        "case_count": len(evaluation["cases"]),
        "total_cases_available": len(data["qa_pairs"]),
        "t_global": data["t_global"],
        "source_path": str(dataset_path),
        "source_sha256": source_sha,
        "git_sha": git_sha,
        "judges": judge_names,
        "evaluation": evaluation,
        "generated_at": datetime.now(UTC).isoformat(),
        "status": "complete",
        "ground_truth_note": (
            "PersonalQA es sintético/autor-authored según el canon EpisTwin; "
            "esta corrida no constituye ground truth autobiográfico independiente."
        ),
    }

    canonical = json.dumps(
        record,
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
    )
    record["record_sha256"] = hashlib.sha256(
        canonical.encode("utf-8")
    ).hexdigest()

    destination = Path(args.output)
    destination.parent.mkdir(parents=True, exist_ok=True)
    temporary = destination.with_suffix(destination.suffix + ".tmp")
    temporary.write_text(
        json.dumps(record, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    temporary.replace(destination)

    print(
        f"PERSONALQA_EVAL_OK cases={len(evaluation['cases'])} "
        f"judges={len(judge_names)}"
    )
    print(f"ARTIFACT={destination}")
    print(f"RECORD_SHA256={record['record_sha256']}")
    print(f"SOURCE_SHA256={source_sha}")
    print(f"GIT_SHA={git_sha or 'unknown'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

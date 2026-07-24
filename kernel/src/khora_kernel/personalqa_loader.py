# @l0 L0-002-R · @req KA-00/REQ-2 · @acr ACR-2.1
import json
from pathlib import Path
from typing import Any, Dict, Optional


class PersonalQAValidationError(Exception):
    pass


class PersonalQALoader:
    def __init__(self, dataset_path: Optional[str] = None):
        if dataset_path is None:
            self.dataset_path = Path(__file__).parent / "data" / "personalqa.json"
        else:
            self.dataset_path = Path(dataset_path)

    def load_and_validate(self) -> Dict[str, Any]:
        with open(self.dataset_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        self._validate(data)
        return data

    def _validate(self, data: Dict[str, Any]):
        # Validate T_global
        if data.get("t_global") != "2025-09-01 13:00":
            raise PersonalQAValidationError(
                "t_global must be exactly '2025-09-01 13:00'"
            )

        # Validate Information Objects
        info_objects = data.get("information_objects", [])
        if len(info_objects) != 71:
            raise PersonalQAValidationError(
                f"Expected exactly 71 information objects, got {len(info_objects)}"
            )

        # Validate Sources Distribution
        sources = {
            "Events": 0,
            "Images": 0,
            "Notes": 0,
            "Docs": 0,
            "Calls": 0,
            "Alarms": 0,
            "Contacts": 0,
        }
        for obj in info_objects:
            source = obj.get("source")
            if source in sources:
                sources[source] += 1
            else:
                raise PersonalQAValidationError(f"Unknown source: {source}")

        expected_sources = {
            "Events": 20,
            "Images": 15,
            "Notes": 15,
            "Docs": 9,
            "Calls": 6,
            "Alarms": 4,
            "Contacts": 2,
        }
        if sources != expected_sources:
            raise PersonalQAValidationError(
                f"Source distribution mismatch. Expected {expected_sources}, got {sources}"
            )

        # Validate QA Pairs
        qa_pairs = data.get("qa_pairs", [])
        if len(qa_pairs) != 100:
            raise PersonalQAValidationError(
                f"Expected exactly 100 QA pairs, got {len(qa_pairs)}"
            )

        # Validate QA App distribution
        apps_distribution = {1: 0, 2: 0, 3: 0, 4: 0}
        valid_dimensions = {"Temporal", "Cross-Source", "Fact Retrieval"}

        for qa in qa_pairs:
            apps = qa.get("involved_apps")
            if apps in apps_distribution:
                apps_distribution[apps] += 1
            else:
                raise PersonalQAValidationError(
                    f"Invalid involved_apps: {apps}. Must be between 1 and 4."
                )

            dims = qa.get("dimensions", [])
            for dim in dims:
                if dim not in valid_dimensions:
                    raise PersonalQAValidationError(
                        f"Invalid dimension label: {dim}. Must be one of {valid_dimensions}"
                    )

        expected_apps = {1: 63, 2: 32, 3: 4, 4: 1}
        if apps_distribution != expected_apps:
            raise PersonalQAValidationError(
                f"QA app distribution mismatch. Expected {expected_apps}, got {apps_distribution}"
            )

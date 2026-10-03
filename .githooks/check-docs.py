#!/usr/bin/env python3
"""Version complète générique IA-first (QUA-011/QUA-015).
Lit .drwil/ia-first.json pour s'adapter aux couches/préfixes.
"""
import json
import re
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
try:
    import cadrage  # type: ignore
except Exception:
    cadrage = None

_DEFAULT_CONFIG = {
  "layers": ["backend", "frontend", "portal"],
  "contractPrefixes": ["SEC", "QUA"],
  "dirs": {
    "projects": "docs/projets",
    "intentions": "docs/intentions",
    "recettes": "docs/recettes",
    "contracts": "docs/contrats.md",
    "index": "docs/projets/en-attente.md"
  },
  "layerPrefixes": ["app", "tests", "src", "scripts"],
  "codePrefixes": ["scripts", ".githooks", "e2e"],
  "extraCodeFiles": [],
  "extraCodeGlobs": ["docker-compose*.yml"],
  "ciFiles": [".gitlab-ci.yml"]
}

def load_config(root: Path) -> dict:
    cfg_path = root / ".drwil" / "ia-first.json"
    if cfg_path.exists():
        try:
            return json.loads(cfg_path.read_text(encoding="utf-8"))
        except Exception:
            pass
    return dict(_DEFAULT_CONFIG)

#!/usr/bin/env python3
"""Grammaire du bloc `cadrage` (version complète générique)."""
from __future__ import annotations

import fnmatch
import json
import re
from pathlib import Path

_DEFAULT_CONFIG = {
  "layers": ["backend", "frontend", "portal"],
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

_BLOC_RE = re.compile(r"<!--[ \t]*cadrage[ \t]*\n(.*?)-->", re.S)
_ENTREE_RE = re.compile(r"-[ \t]+(\S+)")
_JOKERS = set("*?[")

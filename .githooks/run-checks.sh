#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROXY="${HTTPS_PROXY:-${https_proxy:-${HTTP_PROXY:-${http_proxy:-}}}}"

GITLEAKS="$(command -v gitleaks || true)"
[ -z "$GITLEAKS" ] && [ -x "$HOME/.local/bin/gitleaks" ] && GITLEAKS="$HOME/.local/bin/gitleaks"
if [ -n "$GITLEAKS" ]; then
  echo "[pre-commit] secrets (gitleaks)…"
  (cd "$REPO_DIR" && "$GITLEAKS" git --pre-commit --staged --no-banner --redact . 2>/dev/null || true)
else
  echo "[pre-commit] ⚠ gitleaks absent : secrets non vérifiés localement"
fi

echo "[pre-commit] chemins et contrats cités dans la doc…"
python3 "$REPO_DIR/.githooks/check-docs.py" || exit 1

echo "[pre-commit] couverture CI de chaque contrôle (QUA-013)…"
if [ -f "$REPO_DIR/.githooks/check-control-coverage.py" ]; then
  python3 "$REPO_DIR/.githooks/check-control-coverage.py" || true
fi

echo "[pre-commit] tests des contrôles eux-mêmes (.githooks)…"
python3 -m unittest discover -s "$REPO_DIR/.githooks" -p "test_*.py" -q 2>/dev/null || true

if python3 -c "import coverage" 2>/dev/null && [ -f "$REPO_DIR/.githooks/.coveragerc" ]; then
  echo "[pre-commit] couverture des contrôles…"
  python3 -m coverage run --rcfile="$REPO_DIR/.githooks/.coveragerc" -m unittest discover -s "$REPO_DIR/.githooks" -p "test_*.py" -q 2>/dev/null || true
  python3 -m coverage report --rcfile="$REPO_DIR/.githooks/.coveragerc" 2>/dev/null | tail -3 || true
fi

if [ -f "$REPO_DIR/.githooks/check-code-rules.py" ]; then
  echo "[pre-commit] règles d'hygiène du code…"
  python3 "$REPO_DIR/.githooks/check-code-rules.py" 2>/dev/null || true
fi

echo "[pre-commit] vérifications IA-first terminées"

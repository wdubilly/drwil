#!/bin/sh
# Launcher of the Gemini hooks outside Windows (written by `init` into .gemini/settings.json).
# $1: exit code when node is missing (2 refuses the action, 1 only warns); the rest: node's arguments.
# Without node in the PATH of the assistant, say so and what to do instead of a bare "command not found".
code=$1
shift
command -v node >/dev/null 2>&1 || { echo 'drwil: node not found in the PATH of this assistant. Restart it from a shell where which node answers.' >&2; exit "$code"; }
exec node "$@"

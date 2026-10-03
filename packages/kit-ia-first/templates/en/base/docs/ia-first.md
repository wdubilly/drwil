# "AI first" architecture — overview

As of {{date}}. This document explains how this repository is built to be changed by agents.

## Principles
- Single entry point: `AGENTS.md`
- One piece of information, one source
- Invariants are tooled when possible
- Checks live in git (`.githooks/`), run on commit and in CI, independent of the AI tool and the OS

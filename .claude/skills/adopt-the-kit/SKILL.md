---
name: drwil-adopt
description: Make the kit live on an existing project after `apply` — fill in the layer AGENTS.md files, declare the stack's checks, propose the catalog's contracts one by one (each choice stays a decision of the requester). Use when adopting the kit or resuming an ongoing adoption.
---

Recipe: `docs/recipes/adopt-the-kit.md` (steps: re-read the stack, fill in
the layer `AGENTS.md` files, declare the checks, propose the contracts
from `docs/contracts-catalog.md` one by one). An adopted contract migrates
from the catalog to the registry (`docs/contracts.md`), with its check
actually wired up.
Verify: `node .githooks/run-checks.mjs` at every step, one commit per
subject.

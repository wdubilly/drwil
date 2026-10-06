# Recipe: adopt the kit on an existing project

Goal: after `apply` (stack and layers detected, mechanics installed,
nothing overwritten), make the kit live on a project that already has
code. Every choice below is a **`[decision]`**: propose, never decide in
the requester's place (`AGENTS.md`, Conduct section).

1. **Re-read the detected stack** (`.drwil/ia-first.json`): layers, tools,
   CI. Correct it if `apply` got it wrong.
2. **Fill in the layer `AGENTS.md` files** (one per `layers` entry):
   Context, Test pitfalls, Layer contracts, Style and recipes, Verify —
   from the existing code, not generalities.
3. **Declare the stack's checks** in `.drwil/ia-first.json` → `checks`
   (lint, typecheck, tests, build…): each with a `name` and a `run`, run by
   `node .githooks/run-checks.mjs` and at commit time.
4. **Propose the catalog's contracts** (`docs/contracts-catalog.md`) one by
   one, with their typical check: the requester keeps the `[decision]` to
   adopt each or not. An adopted contract: its catalog line becomes a section (`## ID — title`, Rule, Scope, Source of truth, Proof, Reason, Check and/or Manual) moved from the
   catalog to the project's registry (`docs/contracts.md`), with its check
   actually wired up (not a promise):
   - `catalog:QUA-001` (file size): `.githooks/check-file-size.mjs` is
     already shipped by the kit (opt-in) — only needs declaring in
     `checks` with the root and ceiling chosen by the requester.
   - `catalog:QUA-014` (contrast): copy
     `templates/common/optional/front-quality/` (see its README) if a
     front end is detected, then declare its two checks.
   - `catalog:QUA-004` (coverage) and `catalog:QUA-020` (e2e): adopt in
     that order — a low declared threshold first so as not to block a
     project that is just starting, raised as you go, then automated e2e
     on critical paths as proof of real behavioral coverage.
   - The catalog's other lines have no ready-made script: propose the
     detected stack's usual tool (lint, typecheck, coverage…).
5. **Verify**: `node .githooks/run-checks.mjs` green, then one commit per
   subject (layer filled in, check declared, contract adopted) — never a
   catch-all commit.

Out of scope: rewriting the existing code to bring it up to standard —
that's `docs/recipes/refactor-without-breaking.md`, run next, contract by
contract.

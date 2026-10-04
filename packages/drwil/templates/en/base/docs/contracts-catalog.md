# Catalog of contracts to adopt

Common **generic** contracts, not installed by default (only the baseline
of `docs/contracts.md` is). `catalog:` prefix: prevents an ID not yet
adopted from being taken for a gap in the registry (same mechanism as for
an ID from another repo). A project adopting a line copies it **without
this prefix** into the `docs/contracts.md` table, adapted to its stack,
then removes it from here once active (no duplicate between catalog and
registry). See `docs/recipes/adopt-the-kit.md` for the adoption process.

Contracts very specific to a business domain (e.g. an HR document format, a
protocol specific to a partner) are **not** in this catalog: they are
written as they come, directly in the project's registry, following the
model of the lines below.

| ID | Rule | Scope | Typical check (to adapt to the stack) |
|---|---|---|---|
| catalog:SEC-001 | Every route declares the permission it requires; default deny if nothing is declared. | API routes | script listing routes without a declared permission |
| catalog:SEC-002 | The front hides a forbidden action, the backend always re-validates it: no authorization decision relies on the front alone. | backend | integration test: direct call bypassing the front, with a role lacking the right |
| catalog:SEC-009 | Every incoming piece of data (request, uploaded file, webhook) is validated/sanitized at the boundary, never used as-is. | API entry points | systematic validation schema (e.g. zod, pydantic) on every route |
| catalog:SEC-011 | Personal data: minimized, access-restricted, never in clear in a log or an AI output. | the whole repo | human review + grep of known fields in logs (partial proof, to document as such) |
| catalog:QUA-001 | A code file does not exceed a line-count ceiling; a file already above it at adoption time is capped at its current size (can only shrink). | project source code | `.githooks/check-file-size.mjs` (shipped by the kit, opt-in — see `docs/recipes/refactor-without-breaking.md`) |
| catalog:QUA-004 | Test coverage does not drop below a declared threshold. | project source code | coverage report of the stack's test tool, threshold in CI |
| catalog:QUA-005 | Strict typing enabled, no unjustified `any`/dynamic type. | project source code | the stack's compiler/typechecker strict mode |
| catalog:QUA-006 | A pure-logic module (no side effect) has its test file right next to it. | project source code | lint rule or dedicated script depending on the stack |
| catalog:QUA-007 | Lint tolerates no warning. | project source code | the stack's lint in strict mode (zero warning tolerated) |
| catalog:QUA-014 | Text/background contrast per RGAA 4.1 / WCAG AA (4.5:1, 3:1 for large text), light and dark. | front-end screens | `.githooks/check-colors.mjs` (to create), `.githooks/check-contrast.mjs` (to create) — copied from `templates/common/optional/front-quality/` in the kit package, see its README |

Contracts very specific to run-box-v2 (HR documents, SSH bridge, isolated
portal, Elasticsearch, ERMv2…) are not reproduced here: they served as
**examples** during the kit's design, not a model to install.

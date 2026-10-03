# Contracts (single source of invariants)

Each invariant has a unique ID. Do not copy them elsewhere: cite the ID.

## SEC-001 — Scope of permissions
**Rule**: Access rights are decided by the backend.
**Scope**: All exposed routes.
**Source of truth**: Backend code (authorization layer).
**Proof**: Authorization tests.
**Reason**: Defense in depth.

## QUA-013 — A check that did not run has not passed
**Rule**: A check that did not run is not a passed check.
**Scope**: Every check listed in the verifications.
**Source of truth**: `.githooks/run-checks.mjs` and its run history.
**Proof**: Output of the relevant check, read.
**Reason**: Prevent claims without execution.

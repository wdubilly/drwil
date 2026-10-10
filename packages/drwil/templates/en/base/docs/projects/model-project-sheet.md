# Project: short title

**Status**: scoped on YYYY-MM-DD — lot 1 in progress.
**Risk**: MEDIUM

(status: "scoped on …", "lot 1 in progress"…; a card that is not a
project (kit mechanics): "reference — …", never offered for launch;
"done on YYYY-MM-DD" only when condensing it: a card carrying it cannot
stay — `docs/projects/journal.md`, then deletion.)

(risk level, `docs/ia-first.md` section 7: LOW has no sheet — attach to
`docs/projects/routine-maintenance.md`; MEDIUM: sheet + scope; HIGH: also a
Decisions section and the related contracts cited. A scope touching
`.githooks/`, CI or `.drwil/` requires HIGH; it can only be raised.)

<!-- cadrage
fichiers:
  - backend/app/routers/example.py
  - frontend/src/components/Example*
-->

(`cadrage` block: one path or pattern per line, under `fichiers:`; covers
the code files this project touches, for the scoping reminder —
`docs/ia-first.md`, section 7. A pattern that's too broad, `**` or
`scripts/*`, is refused: name the file or use a pattern spanning at least
two folders.)

## 1. Need

(what the project must produce, for whom, and why now)

## 2. Out of scope

(what this project does not cover, to prevent an agent from extending it on
its own)

## 3. Constraints

(technical, business, scheduling)

## 4. Decisions

(decided by the requester, dated)

## 5. Points to decide

- [decision] ...

## 6. Lots

- **Lot 1 — title** [AI|human]: content. Exit criterion: what proves the
  lot is done (green tests, a passing check...).

## 7. Resuming work

- **Last state** (YYYY-MM-DD): ...
- **Uncommitted work**: ...
- **Next step**: [AI|human|decision] ...

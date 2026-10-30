# 3. Invariants are tooled, not merely stated

Section 3 of the "IA first" description, read on its own. The summary,
`docs/ia-first.md`, gives the file of every section.

`docs/contracts.md` lists the project's contracts. Each has a normative
rule, a scope, a source of truth (the code that implements it), a proof and
a reason.

The design rule is explicit in that registry: **"a contract that matters is
machine-checked; a human proof is flagged as such: it's the next check to
tool up"**. The repo therefore distinguishes three things too often
presented as one:

| What it is | Example | Where it's checked |
|---|---|---|
| Tooled invariant | QUA-011 (cited paths and contracts) | `.githooks/check-docs.mjs` |
| Tooled invariant, partial proof | a contract only part of which is machine-provable | its "Proof" column, limit named |
| Assumed human rule | a review convention | `docs/contracts.md`, "Out of registry" section |

This is what tells apart an IA-first architecture from a merely
well-documented repo: the repo **announces** what it doesn't check, instead
of letting people believe everything is.

The baseline of `docs/contracts.md` is deliberately minimal (green from day
one, with no stack assumption). `docs/contracts-catalog.md` lists common
generic contracts, not installed by default: a project adopts them one by
one, with `docs/recipes/adopt-the-kit.md` (or the `adopt-the-kit` skill),
each adoption staying a decision of the requester. A new project, with no code
yet, gets no layer at `init`: the same recipe starts by scoping it (need,
first version, stack and layers, first business rules, risk), then declares
its layers with `drwil init --layers`.

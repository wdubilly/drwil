# Intention : les tests de run-checks ne doivent pas exiger gitleaks

**Statut** : proposée le 2026-11-02 — constat du chantier `hooks-sans-dependance-au-shell`.

## Besoin

Sur une machine sans `gitleaks` dans le `PATH`, `.githooks/run-checks.test.mjs` échoue en partie ; le
pre-commit et le pre-push qui le rejouent sont alors bloqués pour une raison sans rapport avec le changement.

## Existant (relevé le 2026-11-02)

- Avec `gitleaks` retiré du `PATH` (le reste inchangé), `node --test .githooks/run-checks.test.mjs` : 32 tests, 18 passent,
  14 échouent ; avec lui, 32 sur 32.
- La CI installe `gitleaks` à une version fixée avant de jouer les tests (`.github/workflows/ia-first.yml`).
- Le contrôle de secrets lui-même (`.githooks/run-checks.mjs`) a besoin de `gitleaks` : seuls ses tests devraient pouvoir s'en passer.

## Questions à trancher

- [décision] Les tests doivent-ils substituer un faux `gitleaks`, sauter ceux qui exigent le vrai (et le dire), ou
  garder l'exigence et la documenter dans `INSTALL.md` ?
- [question] Les 14 échecs viennent-ils tous de `gitleaks` ? À confirmer test par test avant de choisir.

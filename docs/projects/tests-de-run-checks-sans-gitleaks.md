# Projet : les tests de run-checks passent sans gitleaks, grâce à un faux gitleaks

**Statut** : cadré le 2026-11-06.
**Risque** : HIGH
**Maturité** : prêt
**Intention** : `docs/intentions/tests-de-run-checks-sans-gitleaks.md`

<!-- scope
files:
  - .githooks/run-checks.test.mjs
  - docs/contracts.md
  - .drwil/ia-first.json
  - docs/intentions/tests-de-run-checks-sans-gitleaks.md
  - docs/projects/pending.md
  - docs/projects/journal.md
-->

## 1. Besoin

Sur une machine sans `gitleaks` (l'outil qui cherche les secrets dans le code), les tests de
`.githooks/run-checks.test.mjs` échouent, et le pre-commit et le pre-push qui les rejouent bloquent
pour une raison sans rapport avec le changement.

Reproduit le 2026-11-06, `gitleaks` retiré du `PATH` : 14 tests en échec (QUA-013, QUA-126, QUA-127,
QUA-134, QUA-136, QUA-140, QUA-141, QUA-152, QUA-208 et le test « racine du projet »). Leur sortie
porte 13 fois « non exécuté : secrets (gitleaks) (gitleaks absent) » ; le lien du 14e reste à établir
au lot 1. Ces tests éprouvent l'adaptateur `run-checks`, pas le contrôle de secrets : le vrai gitleaks
est éprouvé par `.githooks/engine.test.mjs`.

## Critères d'acceptation

- Les tests de `.githooks/run-checks.test.mjs` passent à l'identique avec ou sans `gitleaks` sur la
  machine : un faux `gitleaks`, placé par le test dans le `PATH` de chaque passe, répond « aucun
  secret » ; un test le prouve en jouant une passe avec un `PATH` sans aucun `gitleaks` — contrat à
  créer

## 2. Hors périmètre

- Le contrôle de secrets lui-même (`.githooks/engine.mjs`) et ses tests (`.githooks/engine.test.mjs`) :
  ils exigent toujours le vrai `gitleaks`, et `gitleaks` absent reste « non exécuté », jamais « passé »
  (QUA-013).
- Les autres fichiers de test qui dépendraient de `gitleaks` : à relever au lot 1. S'il y en a, ce sont
  des limites, soumises à l'humain avant VERIFY.

## 3. Contraintes

- Cause avant correctif : le lot 1 établit d'abord la cause du 14e échec. Si ce n'est pas `gitleaks`,
  c'est un autre défaut, traité hors de cette fiche.
- Le faux `gitleaks` vit dans le dossier temporaire du test, jamais dans le dépôt, et ne masque pas un
  vrai `gitleaks` pour `.githooks/engine.test.mjs`.
- Le `HOME` temporaire est déjà là pour qu'un `gitleaks` de `~/.local/bin` ne s'invite pas : le faux
  passe par le `PATH` de la passe.

## 4. Décisions

- 2026-11-06 : un faux gitleaks dans les tests, plutôt que sauter ces tests ou documenter l'exigence.

## 5. Points à trancher

Aucun.

## 6. Increments

- **Lot 1 — faux gitleaks** [IA] : cause du 14e échec, faux `gitleaks` dans `passe()`, test sans
  `gitleaks`, contrat. Critère de sortie : `node --test .githooks/run-checks.test.mjs` vert avec et sans
  `gitleaks` dans le `PATH`, `GOVERNANCE: PASS`.

## 7. Reprise

- **Dernier état** (2026-11-06) : cadré, échecs reproduits (sortie non versionnée), rien de réalisé.
- **Prochaine étape** : [IA] lot 1.

# Projet : `drwil verify` joue ses contrôles en parallèle

**Statut** : cadré le 2026-10-25.
**Risque** : HIGH
**Maturité** : prêt
**Intention** : `docs/intentions/suivi-ci-et-contexte.md`

<!-- scope
files:
  - packages/drwil/src/verify.ts
  - packages/drwil/test/kit.test.mjs
  - packages/drwil/templates/common/base/.githooks/engine.mjs
  - .githooks/engine.mjs
  - .githooks/engine.test.mjs
  - docs/contracts.md
  - .drwil/ia-first.json
  - packages/drwil/CHANGELOG.md
  - docs/intentions/suivi-ci-et-contexte.md
  - docs/projects/pending.md
  - docs/projects/journal.md
-->

## 1. Besoin

`drwil verify` joue les contrôles cités par le registre l'un après l'autre
(`packages/drwil/src/verify.ts`, `c.run`), alors que `run-checks` les lance
déjà en parallèle quand le réglage `parallel` est actif (QUA-119, moteur
`startParallel`). Sur ce dépôt, la passe de `verify` dure donc la somme de
tous ses contrôles. À lancer après `docs/projects/duree-par-controle.md`,
dont les chiffres diront le gain attendu.

## Critères d'acceptation

(le contrat est à créer au lancement, avec son champ **Origine** ; ID
à attribuer à ce moment-là dans le registre.)

- Avec le réglage `parallel`, `drwil verify` lance en parallèle les contrôles
  qui le permettent et rend le même verdict, contrat par contrat, qu'une
  passe en série — contrat à créer

## 2. Hors périmètre

- Reprendre le verdict d'un contrôle déjà joué par `run-checks` :
  `docs/projects/verify-reprend-run-checks.md`.
- Rejouer seulement les échecs : `docs/projects/verify-rejoue-les-echecs.md`.
- Activer `parallel` par défaut chez les projets : il reste un réglage.

## 3. Contraintes

- Même limite de parallélisme que `run-checks` (moitié des cœurs, deux au
  moins), pour ne pas casser les tests de durée lancés par un contrôle.
- Un contrôle cité par plusieurs contrats n'est joué qu'une fois (le cache
  actuel de `verify` est gardé).
- L'ordre des raisons dans la preuve reste celui d'une passe en série.

## 4. Décisions

(validées par le demandeur le 2026-10-25)

1. `verify` suit le réglage `parallel` du projet, comme `run-checks` : sans
   lui, la passe reste en série.

## 5. Points à trancher

- Aucun : tout est tranché.

## 6. Increments

- **Lot 1 — passe parallèle** [IA] : `verify` lance les `runAsync` par `startParallel` quand le réglage `parallel` est actif et lit les résultats dans l'ordre du registre ; test qui compare, contrat par contrat, le verdict parallèle et le verdict en série ; mesure avant / après sur ce dépôt, consignée au journal ; contrat au registre et son contrôle `tests-qua-<id>` ; ligne « Unreleased » du changelog. Critère de sortie : `node .githooks/run-checks.mjs` OK, `drwil verify --agent` PASS.

## 7. Reprise

- **Dernier état** (2026-10-25) : cadré, prêt à lancer.
- **Travail non commité** : aucun.
- **Prochaine étape** : [humain] lancer le chantier (`/drwil-start`).

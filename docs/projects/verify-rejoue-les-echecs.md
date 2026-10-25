# Projet : après un FAIL, `drwil verify` rejoue d'abord les seuls échecs

**Statut** : cadré le 2026-10-25.
**Risque** : HIGH
**Maturité** : prêt
**Intention** : `docs/intentions/suivi-ci-et-contexte.md`

<!-- scope
files:
  - packages/drwil/src/verify.ts
  - packages/drwil/src/agent.ts
  - packages/drwil/src/evidence.ts
  - packages/drwil/bin/drwil.js
  - packages/drwil/test/kit.test.mjs
  - packages/drwil/test/cycle.test.mjs
  - packages/drwil/templates/common/base/.githooks/state.mjs
  - .githooks/state.mjs
  - .githooks/state.test.mjs
  - docs/contracts.md
  - .drwil/ia-first.json
  - packages/drwil/README.md
  - packages/drwil/CHANGELOG.md
  - docs/intentions/suivi-ci-et-contexte.md
  - docs/projects/pending.md
  - docs/projects/journal.md
-->

## 1. Besoin

Après un FAIL, corriger un seul contrat oblige à relancer une passe complète
de `drwil verify` (les 127 contrats, couverture comprise) pour savoir si la
correction tient. Le 2026-10-25, six passes de `verify --evidence` ont pris
25 à 30 min d'un chantier de 45 min ; une ou deux auraient suffi. Il faut
pouvoir itérer sur les seuls contrats en échec, puis ne faire la passe
complète qu'une fois, pour le verdict.

## Critères d'acceptation

(le contrat est à créer au lancement, avec son champ **Origine** ; ID
à attribuer à ce moment-là dans le registre.)

- `drwil verify` sait rejouer les seuls contrats qui n'étaient pas PASS ou
  ATTESTED à la dernière preuve ; ce verdict partiel le dit, n'est jamais
  `GOVERNANCE: PASS` et ne vaut jamais preuve de clôture — contrat à créer

## 2. Hors périmètre

- Reprendre le verdict d'un contrôle déjà joué par `run-checks` :
  `docs/projects/verify-reprend-run-checks.md`.
- Paralléliser la passe : `docs/projects/journal.md`.
- Changer la règle de VERIFY : clore exige toujours une passe complète
  `verify --evidence` en PASS ou ATTESTED.

## 3. Contraintes

- S'appuie sur l'option `only` qui sert déjà à `drwil attest`
  (`packages/drwil/src/attest.ts`) : un même chemin de code, pas un second.
- Sans preuve précédente lisible, l'option le dit et ne rejoue rien.
- QUA-013 (un contrôle non exécuté n'est pas passé) : les contrats que
  `--failed` ne rejoue pas ne sont pas jugés, d'où un verdict partiel qui ne
  vaut jamais PASS.

## 4. Décisions

(validées par le demandeur le 2026-10-25)

1. Nom de l'option : `drwil verify --failed` (`--agent` compris).
2. Un verdict partiel n'écrit pas de preuve dans `.drwil/evidence/` : seule
   une passe complète en écrit.
3. Le rappel de l'état en VERIFY propose `--failed` après un FAIL, puis la
   passe complète.

## 5. Points à trancher

- Aucun : tout est tranché.

## 6. Increments

- **Lot 1 — option `--failed`** [IA] : lecture de la dernière preuve, `only` sur les contrats non PASS/ATTESTED, verdict partiel qui le dit, jamais `GOVERNANCE: PASS`, aucune preuve écrite ; sans preuve lisible, le dire ; tests ; README du paquet ; contrat au registre et son contrôle `tests-qua-<id>` ; ligne « Unreleased » du changelog.
- **Lot 2 — rappel de VERIFY** [IA] : après un FAIL, le rappel de l'état propose `--failed`, puis la passe complète ; tests de `.githooks/state.mjs`. Critère de sortie : `node .githooks/run-checks.mjs` OK, `drwil verify --agent` PASS.

## 7. Reprise

- **Dernier état** (2026-10-25) : cadré, prêt à lancer.
- **Travail non commité** : aucun.
- **Prochaine étape** : [humain] lancer le chantier (`/drwil-start`).

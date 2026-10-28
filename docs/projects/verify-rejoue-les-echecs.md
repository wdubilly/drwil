# Projet : après un FAIL, `drwil verify` rejoue d'abord les seuls échecs

**Statut** : cadré le 2026-10-25, recadré le 2026-10-26 (QUA-141 et QUA-152 faits).
**Risque** : HIGH
**Maturité** : prêt
**Intention** : `docs/intentions/suivi-ci-et-contexte.md`

<!-- scope
files:
  - packages/drwil/src/verify.ts
  - packages/drwil/src/agent.ts
  - packages/drwil/src/evidence.ts
  - packages/drwil/bin/drwil.js
  - packages/drwil/src/cli-verify.ts
  - packages/drwil/src/failed.ts
  - packages/drwil/src/verdict.ts
  - packages/drwil/src/verify-types.ts
  - .githooks/state-context-texts.mjs
  - packages/drwil/templates/common/base/.githooks/state-context-texts.mjs
  - docs/architecture.md
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

Après un FAIL, corriger un contrat oblige à relancer une passe de
`drwil verify` pour savoir si la correction tient. Le 2026-10-25, six passes
de `verify --evidence` ont pris 25 à 30 min d'un chantier de 45 min. Sur les
25 et 26 octobre, 17 des 40 passes de `verify` étaient en FAIL, dont plusieurs
séries de 4 d'affilée avec 5 à 14 contrats en échec.

Depuis, QUA-141 (reprise d'un verdict contrôle par contrôle) fait déjà
reprendre à `verify` sans `--evidence` tout contrôle « ok » dont les fichiers
n'ont pas changé : seuls 7 contrôles de 139 ne sont jamais repris
(`reuse: false` ou `"tree"`), et les contrôles en échec sont déjà rejoués. Ce
qui reste : pendant les itérations, ne jouer que les contrats qui n'étaient pas
PASS ou ATTESTED à la dernière preuve, sans rejouer ces 7 contrôles ni juger
les durables et les garanties, puis ne faire la passe complète qu'une fois,
pour le verdict. Le gain en temps n'est pas mesuré (les preuves ne consignent
pas les durées) : le lot 1 le chiffre avant de livrer.

## Critères d'acceptation

(le contrat est à créer au lancement, avec son champ **Origine** ; ID
à attribuer à ce moment-là dans le registre.)

- `drwil verify --failed` rejoue les seuls contrats qui n'étaient pas PASS ou
  ATTESTED à la dernière preuve ; ce verdict partiel le dit, n'est jamais
  `GOVERNANCE: PASS` et ne vaut jamais preuve de clôture — contrat à créer
- Sans preuve précédente lisible, l'option le dit et ne rejoue rien
- Un contrat seulement en attente d'attestation (MANUAL) n'est pas un
  contrôle en échec : le verdict partiel le dit et renvoie à `drwil attest`
- Après un FAIL, le rappel de l'état en VERIFY propose `--failed`, puis la
  passe complète `verify --evidence`

## 2. Hors périmètre

- Reprendre le verdict d'un contrôle déjà joué par `run-checks` :
  `docs/projects/journal.md`.
- Paralléliser la passe : `docs/projects/journal.md`.
- Changer la règle de VERIFY : clore exige toujours une passe complète
  `verify --evidence` en PASS ou ATTESTED.

## 3. Contraintes

- S'appuie sur l'option `only` qui sert déjà à `drwil attest`
  (`packages/drwil/src/attest.ts`) : un même chemin de code, pas un second.
- Sans preuve précédente lisible, l'option le dit et ne rejoue rien.
- QUA-141 (reprise contrôle par contrôle) et QUA-152 (reprise au pre-push) sont
  faits : `--failed` s'y ajoute sans les modifier, et un verdict repris par
  contrôle reste distinct d'un contrat non rejoué par `--failed`.
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

- **Lot 1 — option `--failed`** [IA] : durée d'une passe complète et d'une passe `--failed` mesurées sur un cas réel et consignées au journal ; lecture de la dernière preuve, `only` sur les contrats non PASS/ATTESTED, verdict partiel qui le dit, jamais `GOVERNANCE: PASS`, aucune preuve écrite ; sans preuve lisible, le dire ; un contrat seulement MANUAL signalé comme tel ; tests ; README du paquet ; contrat au registre et son contrôle `tests-qua-<id>` ; ligne « Unreleased » du changelog.
- **Lot 2 — rappel de VERIFY** [IA] : après un FAIL, le rappel de l'état propose `--failed`, puis la passe complète ; tests de `.githooks/state.mjs`. Critère de sortie : `node .githooks/run-checks.mjs` OK, `drwil verify --agent` PASS.

## 7. Reprise

- **Dernier état** (2026-10-26) : recadré (QUA-141 et QUA-152 pris en compte), prêt à lancer.
- **Travail non commité** : aucun.
- **Prochaine étape** : [humain] lancer le chantier (`/drwil-start`).

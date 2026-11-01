# Projet : tests isolés des variables du pre-push

**Statut** : cadré le 2026-11-01.
**Risque** : HIGH
**Maturité** : prêt

<!-- scope
files:
  - packages/drwil/test/kit.test.mjs
  - .githooks/engine.test.mjs
  - .githooks/run-checks.test.mjs
  - docs/contracts.md
  - docs/contracts-catalog.md
  - docs/projects/kit-mechanics.md
  - .drwil/ia-first.json
-->

## 1. Besoin

Le hook pre-push exporte `DRWIL_PUSH_REFS`, `DRWIL_PUSH_TAGS_ONLY`, `DRWIL_PUSH_NO_BRANCH` et
`DRWIL_PUSH_REMOTE`, puis lance les contrôles. Un test qui joue le moteur ou `verify` dans son propre
processus, sans `env` explicite, hérite de ces variables et se croit au push (`runAt`). Constaté le
2026-11-01 : le push de la branche `workstream/controles-lents-verify-ci` est refusé par le test
le test du réglage `runAt` (`packages/drwil/test/kit.test.mjs`, « réserver le contrôle ne change pas son effet » : ERROR au lieu de ATTESTED) ;
le même test passe sans la variable et échoue avec `DRWIL_PUSH_REFS=refs/heads/x`. `.githooks/engine.test.mjs`
a le même défaut. Un contrôle qui échoue au push et passe au commit est mal calibré : il bloque le
chemin légitime de clôture sans rien protéger.

## Critères d'acceptation

- Aucun test du dépôt ne dépend des variables `DRWIL_PUSH_*` du processus qui le lance : le jeu complet
  passe aussi lancé avec elles posées — contrat à créer
- Un test qui lit ces variables les pose lui-même, par l'`env` de son lancement, jamais par l'héritage —
  contrat à créer

## 2. Hors périmètre

- Modifier le pre-push ou le moteur : seuls les tests sont corrigés.
- Le correctif de la clôture du chantier « contrôles lents » : il se pousse après celui-ci.

## 3. Contraintes

- QUA-057 (le lanceur retire les `GIT_*` de l'environnement des contrôles) est le précédent : même
  principe, étendu aux `DRWIL_PUSH_*` côté tests.
- Un correctif d'isolation ne retire ni ne relâche aucune assertion.
- Le correctif de `.githooks/engine.test.mjs` existe déjà dans l'arbre de travail (non commité) : le
  reprendre.

## 4. Décisions

Tranchées par le demandeur le 2026-11-01 : corriger le contrôle mal calibré (option 3), pas de
contournement du pre-push.

## 5. Points à trancher

- [IA] Isoler par `beforeEach` / `afterEach` sur `process.env` (déjà fait dans `.githooks/engine.test.mjs`) ou par
  un `env` explicite à chaque lancement : à fixer au lot 1 ; la preuve est le jeu complet lancé avec les
  variables posées.

## 6. Increments

- **Lot 1 — isolation des tests** [IA] : `packages/drwil/test/kit.test.mjs` (le test du réglage `runAt` et tout test dans le même cas),
  `.githooks/engine.test.mjs`, `.githooks/run-checks.test.mjs` si besoin ; contrat et sa déclaration. Critère de sortie :
  `DRWIL_PUSH_REFS=refs/heads/x node .githooks/run-checks.mjs` passe comme sans la variable.

## 7. Reprise

- **Dernier état** (2026-11-01) : cadré ; cause racine reproduite (test du réglage `runAt` : pass sans la variable, fail
  avec).
- **Travail non commité** : correctif de `.githooks/engine.test.mjs` ; attestation QUA-150
  (`.drwil/evidence/attestations/`) de la clôture « contrôles lents ».
- **Prochaine étape** : [décision] lancer par `/drwil-start`, branche `controles-lents-verify-ci` non
  fusionnée à traiter avant (le lancement exige un arbre propre et une branche fusionnée).

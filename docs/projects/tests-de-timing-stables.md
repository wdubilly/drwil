# Projet : les tests de timing ne dépendent plus de la charge de la machine

**Statut** : cadré le 2026-10-26.
**Risque** : HIGH
**Maturité** : prêt
**Intention** : `docs/intentions/tests-de-timing-instables.md`

<!-- scope
files:
  - packages/drwil/test/kit.test.mjs
  - .githooks/run-checks.test.mjs
  - .githooks/state.test.mjs
  - .githooks/create-release.test.mjs
  - .githooks/run-checks.mjs
  - packages/drwil/templates/common/base/.githooks/run-checks.mjs
  - docs/contracts.md
  - docs/intentions/tests-de-timing-instables.md
  - docs/projects/pending.md
  - docs/projects/journal.md
-->

## 1. Besoin

Le pre-push lance les contrôles en parallèle ; sous cette charge, des tests
qui mesurent une durée échouent sans qu'aucun code ne soit en cause (4 pushs
refusés sur 5, le 2026-10-26, alors que les mêmes tests passent hors hook).
Chaque refus coûte une passe complète (environ 3 minutes) et pousse à
relancer à l'aveugle. Un push ne doit plus dépendre de la charge, sans
désactiver ni contourner de contrôle (QUA-019, pas de contournement).

Périmètre : **tests du dépôt** (drwil-le-dépôt, QUA-018), plus le comptage
de l'avertissement dans `.githooks/run-checks.mjs` (point 5, élargi sur le oui du
demandeur le 2026-10-26) : seul ce hook du gabarit livré
(`packages/drwil/templates/`) est à modifier, avec sa copie installée.

## Critères d'acceptation

- Le test de budget de temps au commit (« budget de temps » du paquet)
  ne bloque plus : un dépassement est un **avertissement compté** dans le
  résumé de `run-checks`, la mesure `[budget-commit]` reste écrite ; son
  échec de contrôle (statut non nul des contrôles mesurés) reste bloquant
  — `QUA-127`
- Le test de QUA-136 (durée de chaque contrôle, trois plus lents au résumé)
  utilise des contrôles factices à durée imposée : son résultat ne dépend
  d'aucune mesure d'un contrôle réel — `QUA-136`
- [humain] Jugement humain : les autres tests du dépôt qui mesurent une durée sont
  recensés au journal, et chacun est rendu déterministe ou passé en
  indicateur, ou sa conservation est justifiée — `QUA-150`
- [humain] Jugement humain : cinq passes consécutives du pre-push sous charge
  (`taskset`, contrôles en parallèle) ne refusent plus aucun push pour un test
  de timing, résultat consigné au journal — `QUA-151`

## 2. Hors périmètre

- Le seuil de 1500 ms n'est ni relevé ni supprimé : il devient la limite
  d'un avertissement.
- La durée du pre-push (reprise des verdicts) :
  `docs/projects/pre-push-reprend-les-verdicts.md`.

## 3. Contraintes

- QUA-019 (pas de contournement) : aucun test n'est désactivé ni sauté ; un
  test passe en indicateur par décision du demandeur (point 1 ci-dessous).
- Un test déterministe ne réduit pas sa preuve : il vérifie le même
  comportement avec des durées imposées.
- Reproduire d'abord sous charge (`taskset`, plusieurs passages) pour
  établir la cause avant de corriger.

## 4. Décisions

(validées par le demandeur le 2026-10-26)

1. **Budget au commit** : indicateur (avertissement compté, non bloquant),
   plutôt que bloquant robuste ou seuil relevé.
2. **QUA-136** : contrôles factices à durée imposée (déterministe).
3. **Recensement** des autres tests mesurant une durée : dans le même
   chantier.

## Contrats modifiés

(déclarés sur le oui du demandeur le 2026-10-26)

- `.githooks/run-checks.test.mjs` — test de QUA-136 (durée de chaque
  contrôle) rendu indépendant de la charge.
- `.githooks/state.test.mjs` — mesure de durée retirée du test de
  `readStdinJson`.
- `.githooks/run-checks.mjs` — comptage d'un avertissement remonté par un
  test (budget au commit).

## 5. Points à trancher

- [IA] Mécanisme exact de l'« avertissement compté » pour un test du
  paquet (sortie reprise par `run-checks`, ou autre) : à établir au lot 1,
  sans nouveau contrat si un mécanisme existe.

## 6. Increments

- **Lot 1 — reproduire et corriger** [IA] : reproduire sous charge ;
  budget au commit en indicateur ; test de QUA-136 déterministe.
- **Lot 2 — recensement** [IA] : lister les tests qui mesurent une durée
  (`performance.now`, `Date.now`, comparaison de durées), corriger ou
  justifier ; mesure au journal. Critère de sortie :
  `node .githooks/run-checks.mjs` OK, `drwil verify --agent` PASS.

## 7. Reprise

- **Dernier état** (2026-10-26) : cadré, décisions 1 à 3 validées.
- **Travail non commité** : aucun.
- **Prochaine étape** : [humain] lancer le chantier (`/drwil-start`).

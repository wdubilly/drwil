# Projet : chaque contrôle dit combien de temps il a pris

**Statut** : cadré le 2026-10-25.
**Risque** : HIGH
**Maturité** : prêt
**Intention** : `docs/intentions/suivi-ci-et-contexte.md`

<!-- scope
files:
  - packages/drwil/templates/common/base/.githooks/engine.mjs
  - .githooks/engine.mjs
  - .githooks/engine.test.mjs
  - packages/drwil/templates/common/base/.githooks/run-checks.mjs
  - .githooks/run-checks.mjs
  - .githooks/run-checks.test.mjs
  - packages/drwil/src/verify.ts
  - packages/drwil/src/evidence.ts
  - packages/drwil/test/kit.test.mjs
  - docs/contracts.md
  - .drwil/ia-first.json
  - packages/drwil/CHANGELOG.md
  - docs/intentions/suivi-ci-et-contexte.md
  - docs/projects/pending.md
  - docs/projects/journal.md
-->

## 1. Besoin

`run-checks` et `drwil verify` ne disent pas combien de temps prend chacun de
leurs contrôles. Le 2026-10-25, un `verify --evidence` a pris ≈ 4 min 30 et
six passes ont pris 25 à 30 min d'un chantier de 45 min, sans qu'on puisse
dire lesquels des 121 contrôles coûtent le plus. Il faut cette mesure avant
de choisir quoi accélérer : c'est le premier des quatre chantiers sur la
durée des contrôles, les trois autres (`docs/projects/verify-en-parallele.md`,
`docs/projects/verify-rejoue-les-echecs.md`,
`docs/projects/verify-reprend-run-checks.md`) se jugeront sur ses chiffres.

## Critères d'acceptation

(le contrat est à créer au lancement, avec son champ **Origine** ; ID
à attribuer à ce moment-là dans le registre.)

- Chaque contrôle joué par `run-checks` ou par `drwil verify` a sa durée
  consignée dans le détail de la passe (`.drwil/evidence/run-checks.log` (si présent)) et
  dans la preuve de `verify` (`verify-*.json`) — contrat à créer
- Le résumé de `run-checks` nomme les trois contrôles les plus lents de la
  passe, avec leur durée — `QUA-126` modifié

## Contrats modifiés

- `QUA-126` — ancien critère : « `.githooks/run-checks.mjs` n'affiche en
  sortie que les contrôles en échec […] puis une ligne de résumé » — raison :
  la sortie nomme en plus les trois contrôles les plus lents, pour voir où va
  le temps sans ouvrir le détail (validé le 2026-10-25)

## 2. Hors périmètre

- Accélérer un contrôle : ce chantier mesure, il ne change aucun contrôle.
- Le reste de la sortie courte de `run-checks` : les échecs et le compte
  des avertissements (QUA-127) ne changent pas.
- La CI et le tableau de bord « Durée de la CI drwil » : ils pourront lire
  ces durées ensuite, sans être modifiés ici.

## 3. Contraintes

- Livré à tout projet (gabarit `packages/drwil/templates/common/base/`), donc
  en anglais dans le code, en français et en anglais dans les messages.
- Une durée mesurée sur une passe parallèle est celle du contrôle, pas sa
  part de la passe : le dire là où elle est consignée.

## 4. Décisions

(validées par le demandeur le 2026-10-25)

1. La durée est consignée en millisecondes entières, par contrôle, avec son
   statut ; un contrôle sauté (« non exécuté ») a une durée absente, jamais 0.
2. Le détail de `run-checks` liste les contrôles du plus lent au plus rapide
   en fin de fichier, en plus de l'ordre de la passe ; le résumé nomme les
   trois plus lents.

## 5. Points à trancher

- Aucun : tout est tranché.

## 6. Increments

- **Lot 1 — durée par contrôle** [IA] : le moteur (`.githooks/engine.mjs`, `run` et `runAsync`) mesure chaque contrôle ; `run-checks` consigne les durées au détail (liste du plus lent au plus rapide en fin de fichier) et nomme les trois plus lents dans son résumé ; `verify` les écrit dans sa preuve ; tests du moteur, de `run-checks` et de `verify` ; contrat au registre et son contrôle `tests-qua-<id>`, `QUA-126` mis à jour ; ligne « Unreleased » du changelog. Critère de sortie : `node .githooks/run-checks.mjs` OK, `drwil verify --agent` PASS.

## 7. Reprise

- **Dernier état** (2026-10-25) : cadré, prêt à lancer.
- **Travail non commité** : aucun.
- **Prochaine étape** : [humain] lancer le chantier (`/drwil-start`).

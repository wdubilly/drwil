# Projet : le coût d'un chantier se répartit entre production, vérification et gouvernance

**Statut** : cadré le 2026-11-13.
**Risque** : HIGH
**Maturité** : prêt
**Intention** : `docs/intentions/cout-par-activite.md`

<!-- scope
files:
  - packages/drwil/templates/common/base/.githooks/consumption.mjs
  - packages/drwil/templates/common/base/.githooks/consumption-log.mjs
  - packages/drwil/templates/common/base/.githooks/consumption-format.mjs
  - packages/drwil/templates/common/base/.githooks/consumption-texts.mjs
  - packages/drwil/templates/common/base/.githooks/consumption-split.mjs
  - packages/drwil/templates/common/base/.githooks/state-transitions.mjs
  - packages/drwil/templates/common/base/.githooks/state-history.mjs
  - packages/drwil/templates/common/base/.githooks/state-validate.mjs
  - packages/drwil/templates/common/base/.githooks/state-reopen.mjs
  - packages/drwil/templates/common/base/docs/recipes/track-consumption-per-increment.md
  - packages/drwil/templates/common/base/docs/projects/kit-mechanics.md
  - .githooks/consumption.mjs
  - .githooks/consumption-log.mjs
  - .githooks/consumption-format.mjs
  - .githooks/consumption-texts.mjs
  - .githooks/consumption-split.mjs
  - .githooks/state-transitions.mjs
  - .githooks/state-history.mjs
  - .githooks/state-validate.mjs
  - .githooks/state-reopen.mjs
  - .githooks/consumption.test.mjs
  - .githooks/state.test.mjs
  - .githooks/dashboard.test.mjs
  - packages/drwil/test/serve.test.mjs
  - docs/recipes/track-consumption-per-increment.md
  - docs/projects/kit-mechanics.md
  - docs/contracts.md
  - .drwil/ia-first.json
  - docs/architecture.md
  - docs/projects/pending.md
  - docs/projects/journal.md
  - packages/drwil/CHANGELOG.md
-->

## 1. Besoin

drwil ne produit pas que du code : il produit aussi des garanties. Avant de chercher à réduire la consommation, il
faut savoir ce qu'elle finance. `.drwil/usage.jsonl` n'a qu'un total par chantier (`support-gitlab-merge-auto` :
5 M tokens pondérés, 342 requêtes, 119 min ; `lancement-refuse-dit-pourquoi` : 3,2 M, 227 requêtes) : rien ne dit
quelle part est production, vérification ou gouvernance. Hypothèse à vérifier, pas à présumer : une part importante
finance la gouvernance et la fiabilité. On mesure d'abord, sur 10 chantiers, avant toute optimisation.

## Critères d'acceptation

- L'état de gouvernance garde l'horodatage de chaque transition du chantier en cours (activité, instant, réouverture
  marquée), du lancement jusqu'au retour en SCOPING ; un état antérieur sans cet historique reste valide — contrat à créer
- `node .githooks/consumption.mjs` répartit les requêtes du chantier par l'activité de l'état à leur instant :
  production = BUILD ; vérification = EVIDENCE et VERIFY ; gouvernance = SCOPING (branche de cadrage comprise),
  CLOSING et tout BUILD qui suit une réouverture ; une requête sans activité connue (historique absent, clone neuf)
  va dans une part « non attribuée », dite, jamais devinée — contrat à créer
- `--record <fiche>` écrit la répartition en nouveaux champs de la ligne de `.drwil/usage.jsonl` (tokens pondérés et
  requêtes par part), sans changer les champs existants ; le tableau de bord et `drwil serve` lisent les lignes
  anciennes et nouvelles sans erreur — contrat à créer
- Sous Copilot CLI, la même répartition est faite à partir des journaux lus par
  `docs/projects/consommation-copilot-cli.md` ; un champ d'horodatage absent de ces journaux donne la part « non
  attribuée », dite dans la recette — contrat à créer
- `node .githooks/consumption.mjs` dit combien de chantiers de `.drwil/usage.jsonl` sont répartis, sur les 10 attendus
  avant le bilan, et à partir de 10 donne la part moyenne de chaque activité ; aucun seuil, jamais un refus — contrat à créer
- La mesure reste non bloquante et ne lit que les champs de consommation, jamais un contenu de message — `QUA-042`

## Contrats modifiés

- `.githooks/consumption.mjs` — gardé à sa version de la branche (QUA-113) (validé le 2026-11-13)
- `.githooks/consumption-log.mjs` — gardé à sa version de la branche (QUA-113) (validé le 2026-11-13)
- `.githooks/consumption-format.mjs` — gardé à sa version de la branche (QUA-113) (validé le 2026-11-13)
- `.githooks/consumption-texts.mjs` — gardé à sa version de la branche (QUA-113) (validé le 2026-11-13)
- `.githooks/state-transitions.mjs` — gardé à sa version de la branche (QUA-113) (validé le 2026-11-13)
- `.githooks/state-validate.mjs` — gardé à sa version de la branche (QUA-113) (validé le 2026-11-13)
- `.githooks/state-reopen.mjs` — gardé à sa version de la branche (QUA-113) (validé le 2026-11-13)

## 2. Hors périmètre

- Une part « décisions humaines » distincte de la gouvernance : les sondages vivent dans les activités de l'état.
- Lignes par activité (`increment`) dans `.drwil/usage.jsonl` : écartées, la répartition est un champ de la ligne.
- Un seuil qui déclencherait une optimisation, ou toute optimisation : le bilan des 10 chantiers les décidera.
- Montrer la répartition dans le tableau de bord ou `drwil serve` : ils restent compatibles, sans vue neuve.
- Gemini, Codex et Cursor (`docs/intentions/consommation-autres-outils.md`).
- Les comparaisons d'efficacité entre chantiers et les notes qualitatives écartées par l'intention.

## 3. Contraintes

- **Dépend de `docs/projects/consommation-copilot-cli.md`** (lecteur des journaux de Copilot CLI) : placée juste
  après elle dans l'index, lancée après sa fusion.
- Reproduire d'abord : test de `.githooks/consumption.mjs` sur des journaux et un historique de transitions fictifs, en échec
  contre le code actuel.
- `.githooks/state-transitions.mjs` (200 lignes) est plein : l'historique va dans .githooks/state-history.mjs (neuf) ; la
  répartition dans .githooks/consumption-split.mjs (neuf).
- L'historique ne vit que dans le fichier d'état de gouvernance (non suivi), écrit par les commandes de l'état, jamais à la main ;
  une reprise sur un clone neuf (`state.mjs resume`) ne le reconstruit pas : la part « non attribuée » le dit.
- On édite le gabarit puis `npm run installer-depot` (QUA-018).

## 4. Décisions

- D1 (2026-11-13) : découpage par activité de l'état (production = BUILD ; vérification = EVIDENCE et VERIFY ;
  gouvernance = SCOPING et CLOSING, réouvertures), par l'horodatage des transitions croisé avec les requêtes —
  réponse du demandeur (question 1 de l'intention).
- D2 (2026-11-13) : la répartition s'écrit en nouveaux champs de la ligne de `.drwil/usage.jsonl`, rétrocompatible
  avec le tableau de bord — réponse du demandeur (question 2).
- D3 (2026-11-13) : mesure seule, bilan après 10 chantiers mesurés, pas de seuil — réponse du demandeur (question 3).
- D4 (2026-11-13) : Copilot CLI inclus dans ce chantier, après `docs/projects/consommation-copilot-cli.md` — réponse du
  demandeur (question 4).

## 5. Points à trancher

Aucun.

## 6. Increments

- **Lot 1 — historique des transitions** [IA] : test en échec d'abord ; .githooks/state-history.mjs (neuf), validation,
  réouverture marquée ; `npm run installer-depot`. Critère de sortie : tests de l'état verts.
- **Lot 2 — répartition et ligne** [IA] : .githooks/consumption-split.mjs (neuf) (Claude Code et Copilot CLI), nouveaux
  champs, compte vers le bilan, recette, rétrocompatibilité du tableau de bord et de `drwil serve` ; carte et
  `docs/projects/kit-mechanics.md`. Critère de sortie : `node .githooks/run-checks.mjs` sans échec,
  `drwil verify --agent` en `GOVERNANCE: PASS`.

## 7. Reprise

- **Dernier état** (2026-11-13) : cadrage terminé.
- **Prochaine étape** : [humain] `/drwil-start`, après la fusion de `docs/projects/consommation-copilot-cli.md`.

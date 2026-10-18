# Projet : un détour pour une correction intercalée (0.6.5, 4 sur 4)

**Statut** : cadré le 2026-10-18 (découpé de la clôture allégée).
**Risque** : HIGH
**Maturité** : prêt

<!-- scope
files:
  - packages/drwil/templates/common/base/.githooks/detour.mjs
  - .githooks/detour.mjs
  - .githooks/detour.test.mjs
  - packages/drwil/templates/common/base/.githooks/scope-gate.mjs
  - .githooks/scope-gate.mjs
  - .githooks/scope-gate.test.mjs
  - packages/drwil/templates/common/base/.githooks/state.mjs
  - packages/drwil/templates/common/base/.githooks/state-cli.mjs
  - packages/drwil/templates/common/base/.githooks/state-texts.mjs
  - .githooks/state.mjs
  - .githooks/state-cli.mjs
  - .githooks/state-texts.mjs
  - .githooks/state.test.mjs
  - packages/drwil/templates/common/base/docs/recipes/corriger-un-defaut.md
  - docs/recipes/corriger-un-defaut.md
  - packages/drwil/templates/common/base/AGENTS.md
  - AGENTS.md
  - packages/drwil/templates/common/base/docs/projects/kit-mechanics.md
  - packages/drwil/test/kit.test.mjs
  - docs/architecture.md
  - docs/contracts.md
  - .drwil/ia-first.json
  - outils/miroirs.json
  - packages/drwil/CHANGELOG.md
-->

(cadrage : la commande de détour (detour.mjs, à créer), la barrière de
périmètre qui la reconnaît, l'état qui enregistre le détour — gabarit et
copies du dépôt, avec leurs tests propres au dépôt — ; la recette
« corriger un défaut » et `AGENTS.md` ; la carte, le registre, les
contrôles, les miroirs et le changelog ; la fiche de mécanique livrée,
qui cadre la nouvelle commande dans chaque projet installé.)

## 1. Besoin

Point 8 de la clôture allégée (cadrage de la 0.6.5, journal du 2026-10-18, ajouté
le 2026-10-18 par le demandeur) : en plein chantier, un défaut préalable
hors du cadrage oblige l'agent à élargir un cadrage sans rapport ou à
s'arrêter ; il improvise alors stash, allers-retours de branche et retours
en cadrage à la main.

## Critères d'acceptation

- En plein chantier, l'agent ouvre seul un détour pour un défaut hors du
  cadrage : le travail en cours est mis de côté et restauré par l'outil
  (jamais perdu), la correction passe par sa propre branche partie de la
  branche principale, sa fiche courte (correction et son test), sa PR
  marquée « détour de <fiche> » au mode de fusion décidé au lancement, et
  son entrée de journal ; à la reprise, la branche du chantier part de la
  branche principale corrigée et l'état revient en BUILD sur la fiche
  d'origine. Un détour qui changerait un contrat existant, un hook, un
  seuil ou la barrière demande le oui de l'humain ; en file, le
  sous-agent s'arrête alors — `QUA-050`

## 2. Hors périmètre

- Le reste de la 0.6.5 : la date gardée et le feu vert de publication
  (fait, journal du 2026-10-18), l'ordre de la file (fait, journal du
  2026-10-18), la clôture outillée (fait, journal du 2026-10-18).

## 3. Contraintes

- Livré à tout projet (QUA-018, dépôt ou livrable : validé par le
  demandeur le 2026-10-18) : on édite le gabarit, puis
  `npm run installer-depot`.
- Le détour n'élargit jamais le cadrage de la fiche d'origine (QUA-019,
  pas de contournement) ; sa correction part de la branche principale
  (QUA-017, pas de travail direct sur la branche principale).
- L'état ne s'écrit jamais à la main : la commande passe par les fonctions
  de l'état.
- Hooks à 100 % de couverture (QUA-004) ; fichiers de code sous 400 lignes
  (QUA-001) : la commande de détour est un fichier à part.

## 4. Décisions

- **2026-10-18 — Un détour s'ouvre sans demander** (demandeur : « l'humain
  répondra forcément oui ») : le contrôle est à la fusion de sa PR, pas à
  son ouverture. Exception, sur recommandation de l'agent : un détour qui
  change les règles du jeu (contrat existant, hook, seuil, barrière)
  demande le oui de l'humain ; en file, le sous-agent mène seul un détour
  ordinaire et s'arrête sur l'exception.
- **2026-10-18 — Le travail en cours mis de côté par l'outil** (agent) :
  un stash nommé, enregistré dans l'état et restauré par la commande de
  reprise, jamais à la main ; la commande refuse de reprendre si la
  restauration échoue, sans rien perdre.
- **2026-10-18 — Une PR par fiche, le détour en dernier** (demandeur,
  sur recommandation de l'agent) : le plus neuf et le plus risqué, il
  profite de la clôture outillée.
- Contrats concernés : un contrat créé (le détour), QUA-019 (pas de
  contournement), QUA-017 (pas de travail direct sur la branche
  principale), QUA-018 (dépôt ou livrable), QUA-004 et QUA-001.

## 5. Points à trancher

Aucun.

## 6. Increments

- **Lot 1 — ouvrir et reprendre** [IA] : mise de côté, branche et fiche
  courte du détour, reprise qui restaure et revient en BUILD.
- **Lot 2 — la barrière** [IA] : le commit de la correction accepté sous
  sa fiche de détour ; l'exception (contrat, hook, seuil, barrière)
  détectée.
- **Lot 3 — la doc** [IA] : recette « corriger un défaut » et `AGENTS.md`.
  Critère de sortie de chaque lot : `node .githooks/run-checks.mjs` vert ;
  du chantier : `drwil verify --agent` en `GOVERNANCE: PASS`, et sa
  clôture faite avec la commande de clôture.

## 7. Reprise

- **Dernier état** (2026-10-18) : lots 1 à 3 faits ; chantier relancé
  par l'humain (BUILD). Le correctif des tests de détour (identité git
  locale au dépôt temporaire, absente en CI) est commité : cause
  reproduite avec un `HOME` vide (les trois mêmes échecs qu'en CI), 9
  tests verts avec le correctif.
- **Prochaine étape** : [IA] CI de la PR 160 entièrement verte, puis
  verify, clôture et fusion automatique.

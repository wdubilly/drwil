# Projet : programmer la fusion automatique avant de revenir en CADRAGE

**Statut** : cadré le 2026-10-10 — lot 1 à lancer.
**Risque** : HIGH

<!-- cadrage
fichiers:
  - .githooks/etat.mjs
  - packages/drwil/templates/common/base/.githooks/etat.mjs
  - .claude/skills/lancer-un-chantier/SKILL.md
  - packages/drwil/templates/fr/tools/claude/.claude/skills/lancer-un-chantier/SKILL.md
  - packages/drwil/templates/en/tools/claude/.claude/skills/start-a-chantier/SKILL.md
-->

(cadrage : la ligne du contexte qui rappelle la fusion autorisée et la
consigne du skill de lancement, côté dépôt et côté gabarit — QUA-018
(périmètre explicite : dépôt drwil vs livrable gabarit).)

## 1. Besoin

Constaté le 2026-10-10 sur la PR #29 : en CLOTURE, l'agent a lancé
`gh pr merge --auto` juste après le push de la clôture, avant que GitHub
ait calculé si la PR était fusionnable ; GitHub a refusé (« Pull Request
is not mergeable »). Les commandes étant chaînées sans condition, l'agent
est revenu en CADRAGE quand même, ce qui a effacé l'autorisation de l'état ;
la fusion a été reprogrammée à la main.

Intention : la consigne dit l'ordre sûr — attendre que la PR soit
fusionnable, programmer la fusion, **vérifier** qu'elle est acceptée, et
seulement ensuite revenir en CADRAGE ; en cas d'échec, rester en CLOTURE
et le signaler.

## 2. Hors périmètre

- Un contrôle mécanique (refuser le retour en CADRAGE tant que la fusion
  n'est pas programmée) : la fusion vit sur GitHub, hors de l'état local.

## 3. Contraintes

- La consigne doit apparaître là où l'agent la relit : la ligne « Fusion
  automatique autorisée » du contexte (`.githooks/etat.mjs`), affichée à
  chaque relecture de l'état, et le skill de lancement.

## 4. Décisions

- **2026-10-10 — Inscrire l'ordre sûr dans la consigne** : retenu par le
  demandeur (« inscris-le dans la consigne du skill si c'est important »).
  [décision utilisateur]

## Contrats concernés

- **QUA-015** — Chantiers exploitables à froid : l'ordre ne dépend pas de
  la mémoire de l'agent.

## 5. Points à trancher

(aucun)

## 6. Lots

- **Lot 1 — ordre sûr** [IA] : ligne du contexte (fr, en) et skill de
  lancement (dépôt, gabarit fr et en). Critère de sortie : le contexte
  affiché en CLOTURE avec fusion autorisée dit d'attendre la PR
  fusionnable, de vérifier la programmation et de ne revenir en CADRAGE
  qu'ensuite ; contrôles et CI verts.

## 7. Reprise

- **Dernier état** (2026-10-10) : fiche cadrée, rien de réalisé.
- **Travail non commité** : la fiche.
- **Prochaine étape** : [humain] `/drwil-lancer`.

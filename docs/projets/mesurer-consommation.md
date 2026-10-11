# Projet : mesurer la consommation de tokens par chantier, sans saisie

**Statut** : cadré le 2026-10-11 — 3 décisions à trancher avant le lot 1.
**Risque** : MEDIUM

<!-- cadrage
fichiers:
  - outils/consommation.mjs
  - outils/consommation.test.mjs
  - outils/miroirs.json
-->

(cadrage : ce dépôt d'abord — QUA-018 (périmètre explicite : dépôt drwil
vs livrable gabarit) : un outil propre au dépôt, éprouvé ici ; la recette
et le tableau de bord livrés ne changent qu'au moment de livrer, dans un
chantier à part.)

## 1. Besoin

Vague 3 (« mesurer ») de la feuille de route, décidée le 2026-10-11 :
l'objectif d'une fabrique de logiciels de qualité **qui baisse la
consommation de tokens** n'a aujourd'hui aucune mesure. `.drwil/usage.jsonl`
est rempli à la main (3 lignes, la dernière du 2026-10-04) ; aucune
économie ne peut être prouvée, ni aucun coupe-circuit posé
(`docs/intentions/fabrique-autonome.md`, brique 5).

Constaté le 2026-10-11 : les journaux de session de Claude Code
(`~/.claude/projects/<dossier du projet>/*.jsonl`) portent, pour chaque
réponse de l'agent, les tokens (entrée, sortie, cache lu, cache écrit), le
modèle, l'horodatage **et la branche git**. Une branche
`chantier/<fiche>` par chantier suffit donc à attribuer la consommation
sans rien saisir. Premier relevé, à la main, sur la journée du
2026-10-11 : le cache lu (contexte relu à chaque échange) pèse environ
250 millions de tokens contre moins d'un million en sortie — la longueur
des sessions, et non le code écrit, est le premier poste à mesurer.

## 2. Hors périmètre

- Les autres outils (Codex, Copilot, Cursor, Gemini) : un lecteur par
  outil, plus tard ; la recette actuelle (saisie) reste leur voie.
- Un coupe-circuit (budget qui arrête un agent) : il se décidera sur les
  chiffres, avec la fabrique autonome.
- Le coût en euros : les tarifs changent ; on mesure des tokens par
  catégorie, la conversion reste un calcul de lecture.

## 3. Contraintes

- **Données personnelles et secrets** : les journaux de session
  contiennent toute la conversation. L'outil ne lit que les champs de
  consommation (`usage`, modèle, horodatage, branche) et n'affiche ni
  n'écrit jamais un contenu de message.
- Une requête comptée une fois : les journaux répètent une même réponse
  (plusieurs blocs) ; dédoublonnage par identifiant de requête.
- Rien de mesuré n'est inventé : journaux absents ou illisibles,
  « non mesuré », jamais zéro (QUA-013).
- Le travail fait sur la branche principale (cadrages) est compté à part,
  jamais réparti au jugé.

## 4. Décisions

- **2026-10-11 — Mesurer avant de construire** : une vague « mesurer »
  avant les restructurations. [décision utilisateur]

## Contrats concernés

- **QUA-013** — Contrôle non exécuté n'est pas passé : absence de journal
  = non mesuré.
- **QUA-018** — Périmètre explicite : dépôt drwil vs livrable gabarit.

## 5. Points à trancher

- [décision] **Où va la mesure** : (a) rapport à la demande seulement
  (`node outils/consommation.mjs`, à créer) ; (b) en plus, une ligne ajoutée
  automatiquement à `.drwil/usage.jsonl` à la clôture d'un chantier.
  Recommandé : (a) d'abord, (b) une fois les chiffres jugés fiables.
- [décision] **Unité affichée** : les quatre catégories séparées (entrée,
  sortie, cache lu, cache écrit) ou un total pondéré par leur prix
  relatif. Recommandé : les quatre, plus un total pondéré indicatif.
- [décision] **Durée** : temps entre la première et la dernière réponse
  sur la branche, ou temps actif (pauses de plus de N minutes retirées).
  Recommandé : temps actif, N = 15.

## 6. Lots

- **Lot 1 — relevé par chantier** [IA] :
  `outils/consommation.mjs` (à créer) lit les journaux du projet, dédoublonne, regroupe par branche et
  affiche par chantier : requêtes, tokens par catégorie, modèles, durée ;
  déclaré propre au dépôt (`outils/miroirs.json`). Critère de sortie :
  tests verts (journaux factices, dont un contenu de message jamais
  affiché) ; relevé réel du 2026-10-11 cohérent avec celui à la main.
- **Lot 2 — ligne de clôture** [IA], selon la décision « où va la
  mesure ».

## 7. Reprise

- **Dernier état** (2026-10-11) : fiche cadrée, rien de réalisé.
- **Travail non commité** : aucun.
- **Prochaine étape** : [décision] les 3 points à trancher, puis
  [humain] `/drwil-lancer`.

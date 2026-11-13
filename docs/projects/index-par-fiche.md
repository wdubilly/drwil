# Projet : un fichier d'index par fiche, sans conflit sur l'index commun

**Statut** : cadré le 2026-11-12.
**Risque** : HIGH
**Maturité** : prêt
**Intention** : `docs/intentions/cadrer-pendant-un-chantier.md`

<!-- scope
files:
  - .githooks/briefs-order.mjs
  - .githooks/briefs.mjs
  - .githooks/check-docs-workstreams.mjs
  - .githooks/check-docs.test.mjs
  - .githooks/briefs.test.mjs
  - docs/projects/pending.md
  - docs/projects/model-brief.md
  - docs/projects/journal.md
  - packages/drwil/CHANGELOG.md
-->

## 1. Besoin

`docs/projects/pending.md` et `docs/projects/journal.md` sont modifiés par chaque cadrage et chaque chantier : ils
entrent en conflit dès que deux travaux avancent ensemble (cadrer pendant un chantier). Décidé le 2026-11-12 : un
fichier d'index par fiche supprime le conflit.

## Critères d'acceptation

- Une fiche porte elle-même sa priorité, sa version cible et son rang ; l'ordre de réalisation se calcule en
  lisant les fiches, sans éditer un index commun — `QUA-166`
- Créer ou clore une fiche ne modifie aucun autre fichier partagé — `QUA-166`

## Contrats modifiés

- `.githooks/briefs-order.mjs` — gardé à sa version de la branche (QUA-113) (validé le 2026-11-13)
- `.githooks/briefs.mjs` — gardé à sa version de la branche (QUA-113) (validé le 2026-11-13)
- `.githooks/check-docs-workstreams.mjs` — gardé à sa version de la branche (QUA-113) (validé le 2026-11-13)
- `.githooks/check-docs.mjs` — gardé à sa version de la branche (QUA-113) (validé le 2026-11-13)

## 2. Hors périmètre

- Le journal des chantiers (`docs/projects/journal.md`), conservé tel quel : son conflit éventuel est hors de ce chantier.
- Le cadrage en BUILD lui-même : `docs/projects/cadrage-en-build.md`.

## 3. Contraintes

- Aujourd'hui l'ordre vient de l'index, section « Fiches cadrées » (`.githooks/briefs-order.mjs`), et `check-docs`
  lit l'index. Le changement touche l'index, la clôture (condensation dans le journal) et les outils de lecture :
  à découper en lots après la décision ci-dessous.

## 4. Décisions

- 2026-11-12 : un index par fiche (conflits), P0 (0.11.2).
- 2026-11-12 : ordre = priorité, version, date de cadrage lus dans la fiche, plus un champ « Rang » facultatif pour départager ; journal conservé tel quel.

## 5. Points à trancher

Aucun.

## 6. Increments

- **Lot 1 — lire l'ordre dans les fiches** [IA] : l'en-tête de la fiche porte priorité (`P0` à `P3`) et version
  cible ; `.githooks/briefs-order.mjs` trie par priorité, version, date de cadrage, un champ « Rang » facultatif
  départageant ; `.githooks/check-docs-workstreams.mjs` ne lit plus la section « Fiches cadrées » de l'index.
  Critère de sortie : tests de l'ordre verts, l'ordre des fiches actuelles inchangé.
- **Lot 2 — retirer les lignes de l'index** [IA] : créer ou clore une fiche ne touche plus l'index commun ;
  `docs/projects/model-brief.md` et la clôture à jour. Critère de sortie : `node .githooks/run-checks.mjs` sans échec.

## 7. Reprise

- **Dernier état** (2026-11-12) : cadrage terminé.
- **Prochaine étape** : [humain] `/drwil-start`.

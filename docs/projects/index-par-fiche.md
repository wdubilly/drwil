# Projet : un fichier d'index par fiche, sans conflit sur l'index commun

**Statut** : cadré le 2026-11-12.
**Risque** : HIGH
**Maturité** : à affiner
**Intention** : `docs/intentions/cadrer-pendant-un-chantier.md`

<!-- scope
files:
  - .githooks/briefs-order.mjs
  - .githooks/briefs.mjs
  - .githooks/check-docs-workstreams.mjs
  - docs/projects/pending.md
  - docs/projects/model-brief.md
  - docs/projects/journal.md
-->

## 1. Besoin

`docs/projects/pending.md` et `docs/projects/journal.md` sont modifiés par chaque cadrage et chaque chantier : ils
entrent en conflit dès que deux travaux avancent ensemble (cadrer pendant un chantier). Décidé le 2026-11-12 : un
fichier d'index par fiche supprime le conflit.

## Critères d'acceptation

- Une fiche porte elle-même sa priorité, sa version cible et son rang ; l'ordre de réalisation se calcule en
  lisant les fiches, sans éditer un index commun — `QUA-166`
- Créer ou clore une fiche ne modifie aucun autre fichier partagé — `QUA-166`

## 2. Hors périmètre

- Le cadrage en BUILD lui-même : `docs/projects/cadrage-en-build.md`.

## 3. Contraintes

- Aujourd'hui l'ordre vient de l'index, section « Fiches cadrées » (`.githooks/briefs-order.mjs`), et `check-docs`
  lit l'index. Le changement touche l'index, la clôture (condensation dans le journal) et les outils de lecture :
  à découper en lots après la décision ci-dessous.

## 4. Décisions

- 2026-11-12 : un index par fiche (conflits), P0 (0.11.2).

## 5. Points à trancher

- [décision] Où vit l'ordre relatif des fiches (champ « Rang » dans la fiche, ou ordre par priorité puis date) et
  comment se remplace la lecture manuelle de l'index ?
- [décision] Le journal (`docs/projects/journal.md`) : une entrée par fichier, ou conservé tel quel ?

## 6. Increments

- **Lot 1 — à découper** [IA] : après les décisions ci-dessus.

## 7. Reprise

- **Dernier état** (2026-11-12) : cadrage commencé, non commité.
- **Prochaine étape** : le demandeur tranche les deux points ; puis lots.

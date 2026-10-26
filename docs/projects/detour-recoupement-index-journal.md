# Détour : Le recoupement des cadrages en file parallèle compte l'index et le journal des chantiers (détour de docs/projects/doc-lancement-parallele.md)

**Statut** : ouvert le 2026-10-26 (détour de docs/projects/doc-lancement-parallele.md, branche detour/recoupement-index-journal).
**Risque** : HIGH
**Maturité** : en cours

<!-- scope
files:
  - .githooks/briefs.mjs
  - packages/drwil/templates/common/base/.githooks/briefs.mjs
  - .githooks/worktree.test.mjs
  - docs/contracts.md
  - docs/projects/journal.md
-->

(cadrage : la correction et son test, rien d'autre ; le cadrage de docs/projects/doc-lancement-parallele.md ne s'élargit jamais pour un détour.)

## 1. Besoin

Le recoupement des cadrages en file parallèle compte l'index et le journal des chantiers : défaut préalable rencontré pendant docs/projects/doc-lancement-parallele.md, hors de son cadrage.

## Critères d'acceptation

- Deux fiches dont les cadrages ne partagent que l'index (`pending.md`) et
  le journal (`journal.md`) des chantiers, que toute clôture modifie, se
  lancent en parallèle ; un autre fichier partagé reste refusé ; gardé par un
  test de non-régression vu échouer avant la correction — `QUA-147`

## 1 bis. Cause

`scopesOverlap` (`.githooks/briefs.mjs`) compare tous les motifs des blocs
`scope`, y compris l'index et le journal, que presque toute fiche déclare
pour sa clôture : deux fiches ordinaires sont refusées en file parallèle.
Leur conflit de clôture est déjà réglé par le sous-agent (QUA-148).

## 4. Décisions

- Un détour s'ouvre sans demander : le contrôle est à la fusion de sa PR. Contrats concernés : QUA-017 (pas de travail direct sur la branche principale), QUA-019 (pas de contournement).

## 7. Reprise

- PR intitulée « Détour de docs/projects/doc-lancement-parallele.md : Le recoupement des cadrages en file parallèle compte l'index et le journal des chantiers » ; avant le push, entrée de journal citant la branche detour/recoupement-index-journal et suppression de cette fiche ; PR fusionnée : `node .githooks/detour.mjs resume`.

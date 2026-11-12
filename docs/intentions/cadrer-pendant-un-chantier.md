# Intention : cadrer pendant qu'un agent construit sur le même poste

**Statut** : cadrée le 2026-11-12 — `docs/projects/cadrage-en-build.md` et `docs/projects/index-par-fiche.md`.

## Besoin

Pouvoir cadrer (créer des fiches, des intentions, ouvrir une PR de cadrage) pendant qu'un agent est en BUILD sur le
même poste, sans que l'un gêne l'autre : état, branche, commits refusés hors du cadrage de la fiche active.

## Existant

- L'état (`.drwil/state.json` (si présent)) est propre à chaque dossier de travail : un worktree frère a son propre état
  (QUA-142, QUA-143, QUA-145).
- En BUILD, un commit hors du `scope` de la fiche active est refusé (`AGENTS.md`) : cadrer dans le dossier du chantier
  est donc impossible sans détour.
- Une file parallèle en worktrees existe pour les chantiers (QUA-147), pas pour le cadrage.

## Questions à trancher

- Tranché le 2026-11-12, voir les fiches : Forme : un worktree dédié au cadrage (`../<dépôt>-cadrage`, branche `cadrage/…`, créé par une commande
  ou un sondage), ou autoriser le cadrage dans le dossier du chantier pour les seuls fichiers de documentation.
- Tranché le 2026-11-12, voir les fiches : Comment la branche de cadrage reste à jour de la principale quand le chantier fusionne (rebase auto ?).
- Tranché le 2026-11-12, voir les fiches : Conflits attendus sur `docs/projects/pending.md` et `docs/projects/journal.md` : ordre de fusion, ou index par fiche.
- Tranché le 2026-11-12, voir les fiches : Priorité et version cible (0.11.2 ou plus tard).

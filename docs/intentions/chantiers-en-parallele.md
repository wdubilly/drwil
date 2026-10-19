# Intention : mener plusieurs chantiers en parallèle, ou orchestrer plusieurs agents sur leurs parties

**Statut** : proposée le 2026-10-19 — idée de l'humain, après la fiche « Copilot CLI enchaîne les chantiers ».

## Besoin

Aujourd'hui les chantiers d'une file se font l'un après l'autre. Quand les
cadrages de plusieurs fiches ne se recoupent pas, on pourrait les mener en
même temps, chacun par son agent ; ou, pour un gros chantier, répartir ses
lots entre plusieurs agents, chacun sur sa partie, sous une orchestration.

## Existant (vérifié le 2026-10-19)

- L'état de gouvernance ne porte qu'une fiche active (`active_brief`) : un
  seul chantier à la fois par dépôt.
- Chaque fiche déclare son cadrage (bloc `scope`, liste de fichiers) : c'est
  de quoi savoir si deux fiches se recoupent.
- Un worktree par chantier existe déjà pour les détours et les pushs
  (QUA-056, un push depuis un worktree ne touche jamais le dépôt principal).
- Les sous-agents d'une file sont prévus, un seul à la fois
  (`docs/intentions/sous-agent-des-le-premier-chantier.md`).

## Questions à trancher

- [décision] Une fiche active par worktree (un état par worktree), ou un
  état qui porte plusieurs fiches actives ?
- [décision] Détection du conflit : comparer les listes de fichiers du bloc
  `scope` (refuser si elles se recoupent), ou aussi les fichiers partagés
  par nature (`docs/projects/pending.md`, journal, `package-lock.json`) ?
- [décision] Orchestration d'un seul chantier : un agent par lot, avec un
  agent principal qui répartit, relit et fusionne ?
- [décision] Fusion : dans quel ordre, et qui résout un conflit apparu quand
  même (l'humain, ou l'agent avec son oui) ?
- [décision] Consommation et contexte : mesure par agent
  (`docs/intentions/consommation-autres-outils.md`).

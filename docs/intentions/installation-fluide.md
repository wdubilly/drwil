# Intention : un parcours d'installation et de chantier sans demande d'autorisation à chaque commande

**Statut** : proposée le 2026-10-25 — demande de l'humain, promue depuis les notes le même jour. Traitée en partie le 2026-10-31 par le chantier adoption-fluide-projet-neuf (autorisations livrées, worktree obligatoire, commit initial du kit : QUA-204 à QUA-207) ; attester depuis le chat livré le 2026-11-04 par le chantier attester-depuis-le-chat (essais réels en limite : `docs/intentions/attestation-chat-essais-reels.md`) ; commande de contrat livrée le 2026-11-05 par le chantier commande-de-contrat (`drwil contracts adopt` et `add`, QUA-240 à QUA-243) ; reste le réexamen du « ask » sur `git push`, `merge` et `rebase`.

**Revu le 2026-11-05** : le worktree toujours proposé, l'attestation depuis le chat et l'ajout ou l'adoption d'un contrat par commande sont livrés ; seul le premier paragraphe du besoin reste vivant.

## Besoin

Parcours d'installation fluide : documenter dans INSTALL.md (et/ou livrer dans le gabarit .claude/settings.json) les autorisations Claude Code des commandes git/gh/.githooks courantes, pour qu'un chantier ne déclenche pas une demande à chaque commande ; réexaminer le « ask » sur git push/merge/rebase au regard de la protection déjà assurée par le pre-push (QUA-017).

## Existant (relevé le 2026-10-25)

- `packages/drwil/templates/common/tools/claude/.claude/settings.json` livre des règles `allow` et `ask` ; le « ask » couvre `git push`, `merge` et `rebase`.
- `INSTALL.md` ne dit rien des autorisations Claude Code.
- Le pre-push refuse déjà tout travail direct sur la branche principale (QUA-017).

## Questions à trancher

- [décision] Le « ask » sur `git push`, `merge` et `rebase` reste-t-il, au regard du pre-push (QUA-017) ?

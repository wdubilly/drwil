# Intention : un parcours d'installation et de chantier sans demande d'autorisation à chaque commande

**Statut** : proposée le 2026-10-25 — demande de l'humain, promue depuis les notes le même jour.

## Besoin

Parcours d'installation fluide : documenter dans INSTALL.md (et/ou livrer dans le gabarit .claude/settings.json) les autorisations Claude Code des commandes git/gh/.githooks courantes, pour qu'un chantier ne déclenche pas une demande à chaque commande ; réexaminer le « ask » sur git push/merge/rebase au regard de la protection déjà assurée par le pre-push (QUA-017).

## Existant (relevé le 2026-10-25)

- `packages/drwil/templates/common/tools/claude/.claude/settings.json` livre des règles `allow` et `ask` ; le « ask » couvre `git push`, `merge` et `rebase`.
- `INSTALL.md` ne dit rien des autorisations Claude Code.
- Le pre-push refuse déjà tout travail direct sur la branche principale (QUA-017).

## Questions à trancher

- [décision] Livrer les autorisations dans le gabarit, ou seulement les documenter dans `INSTALL.md` ?
- [décision] Le « ask » sur `git push`, `merge` et `rebase` reste-t-il utile, vu la protection du pre-push et de la forge ?

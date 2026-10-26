# Intention : un parcours d'installation et de chantier sans demande d'autorisation à chaque commande

**Statut** : proposée le 2026-10-25 — demande de l'humain, promue depuis les notes le même jour.

## Besoin

Parcours d'installation fluide : documenter dans INSTALL.md (et/ou livrer dans le gabarit .claude/settings.json) les autorisations Claude Code des commandes git/gh/.githooks courantes, pour qu'un chantier ne déclenche pas une demande à chaque commande ; réexaminer le « ask » sur git push/merge/rebase au regard de la protection déjà assurée par le pre-push (QUA-017).

Ajouts du 2026-10-27 (demande de l'humain, constatée sur drwil_dbox) :

- **Le worktree toujours proposé.** Sur drwil_dbox, le lancement d'un chantier ne proposait pas le worktree : la question est facultative et c'est l'agent qui doit l'ajouter au sondage. Le demandeur veut qu'elle soit toujours présente.
- **Attester depuis le chat.** Attester une preuve humaine par `npx drwil attest` dans un terminal est pénible : le demandeur veut pouvoir le faire directement dans la conversation avec l'agent.
- **Ajouter ou adopter un contrat sans éditer à la main** (jugé important). Un utilisateur doit pouvoir intégrer un contrat du catalogue ou en écrire un propre au projet sans recopier des blocs et des lignes de tableau à la main.

## Existant (relevé le 2026-10-25)

- `packages/drwil/templates/common/tools/claude/.claude/settings.json` livre des règles `allow` et `ask` ; le « ask » couvre `git push`, `merge` et `rebase`.
- `INSTALL.md` ne dit rien des autorisations Claude Code.
- Le pre-push refuse déjà tout travail direct sur la branche principale (QUA-017).

## Existant (relevé le 2026-10-27)

- Le skill de lancement de chantier décrit la question `drwil-worktree` comme « optionnelle » : l'agent l'ajoute (ou non) au sondage, le hook lit la réponse et crée `../<dépôt>-<fiche>`. Aucune condition technique ne l'empêche sur drwil_dbox (aucun worktree existant, dossier parent accessible). Cause de l'absence non établie : sondage sans la question, ou chantier lancé par `node .githooks/state.mjs start`, qui n'offre pas de worktree.
- `drwil attest` est un geste humain : un agent ne l'exécute jamais et n'écrit jamais d'attestation (`AGENTS.md`, contrats d'attestation). Le lancement d'un chantier fournit un précédent de réponse humaine dans le chat : un sondage dont la réponse est lue par un hook, jamais préremplie par l'agent.
- Relevé le 2026-10-27 : adopter un contrat du catalogue revient à recopier sa ligne, sans le préfixe `catalogue:`, dans `docs/contracts.md`, à l'adapter à la pile, puis à la retirer du catalogue (un ID ne peut pas être aux deux endroits, `check-docs` le signale). Un contrat propre au projet est un bloc écrit à la main (Règle, Périmètre, Preuve, Check, Covers, Severity, Origin), dont le check est déclaré dans `.drwil/ia-first.json`. `drwil contracts` valide le registre sans rien écrire ; aucune commande n'ajoute ni n'adopte un contrat, seul `/drwil-adopt` guide l'agent.

## Questions à trancher

- [décision] Livrer les autorisations dans le gabarit, ou seulement les documenter dans `INSTALL.md` ?
- [décision] Le « ask » sur `git push`, `merge` et `rebase` reste-t-il utile, vu la protection du pre-push et de la forge ?
- [décision] La question `drwil-worktree` devient-elle obligatoire dans le sondage de lancement (le hook refuse un sondage sans elle) ? Et `state.mjs start` doit-il aussi proposer le worktree ?
- [décision] Attester depuis le chat : un sondage dont la réponse est lue par un hook (l'agent ne remplit jamais la réponse), sur le modèle du lancement ? Quel jugement est affiché (le critère du contrat, ce qui a été essayé) pour que l'attestation reste un jugement éclairé (QUA-032, une attestation ne coûte que le jugement demandé) ?
- [décision] Comment l'attestation faite dans le chat se distingue-t-elle d'une réponse écrite par l'agent (preuve de l'origine humaine), et reste-t-elle compatible avec la couverture (Covers) et le renouvellement (`--renew`) ?
- [décision] Une commande pour ajouter ou adopter un contrat (par exemple `drwil contracts add` et `drwil contracts adopt <ID>`) : elle déplace la ligne du catalogue vers le registre, sans préfixe, et crée le squelette d'un contrat propre ? Qui écrit le check (déclaration dans ia-first.json) ?
- [décision] Cette commande est-elle un geste de l'agent, de l'humain ou des deux, sachant qu'ajouter un contrat n'est pas un changement des règles du jeu (`AGENTS.md`, détour QUA-050) mais en modifier ou en retirer un l'est ?

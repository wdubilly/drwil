# Intention : se repositionner proprement après la clôture d'un chantier (worktree, branches, `master`)

**Statut** : proposée le 2026-10-26, élargie le même jour — limite du chantier « un chantier par worktree, lancé d'un geste humain » (journal du 2026-10-26).

## Besoin

Un worktree créé au lancement (`../<dépôt>-<fiche>`) reste sur le disque après la fusion de son chantier. Le besoin : que le dossier soit retiré proprement, sans perdre de travail non fusionné.

Élargi : après une fusion, le dépôt doit revenir à une position de départ saine, sans geste manuel dispersé. On ne commite jamais sur `master` ; on s'y replace seulement pour repartir :

- **retour sur `master` à jour** (`checkout` puis `pull --ff-only`) : le dossier principal reste sinon sur la branche du chantier ou du cadrage fusionné ;
- **nouvelle branche depuis ce `master`** avant tout cadrage ou changement (`cadrage/<sujet>`), comme `init()` le fait pour le premier commit d'un projet : un cadrage commité sur une branche déjà portée par une PR a causé un conflit d'index et une PR obsolète (2026-10-26) ;
- **branches fusionnées supprimées**, locales et distantes (le nettoyage actuel n'a lieu qu'au prochain `start` ou `next`, QUA-048) ;
- **fermeture du worktree** : retrait depuis le dossier principal, jamais depuis le worktree lui-même ; la session de l'agent qui y travaille est d'abord terminée, l'agent finissant par dire à l'humain que le chantier est fusionné et que le worktree sera retiré.

## Existant

Relevé le 2026-10-26 : la recette `docs/recipes/working-with-branches.md` indique le nettoyage à la main (`git worktree remove`) ; aucun outil ne le fait, et la suppression des branches fusionnées (QUA-048) ne retire pas le dossier. Relevé le 2026-10-26 (chantier « une file en parallèle ») : une file parallèle (QUA-147) laisse jusqu'à N worktrees à retirer d'un coup.

## Questions à trancher

- [décision] Un outil retire-t-il le worktree à la clôture, ou la recette suffit-elle ?
- [décision] Que faire d'un worktree dont la branche n'est pas fusionnée ?
- [décision] Le repositionnement (retour sur `master`, branche de cadrage) est-il fait par un outil de l'état de gouvernance, un hook de début de session en SCOPING, ou seulement rappelé par le texte d'état ?
- [décision] Qui crée la branche `cadrage/<sujet>` : l'agent seul au premier cadrage, ou sur demande de l'humain ?
- [décision] Les branches distantes fusionnées sont-elles supprimées par l'outil, ou laissées au réglage GitHub « supprimer la branche après fusion » (apparemment actif sur ce dépôt : les branches des PR #245 et #246 ont disparu seules) ?

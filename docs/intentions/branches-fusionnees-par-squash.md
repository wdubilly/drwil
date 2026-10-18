# Intention : supprimer aussi les branches fusionnées par squash

**Statut** : proposée le 2026-10-18 — limite du chantier « une clôture
allégée, sans encombrants » (journal du 2026-10-18, 0.6.5, 3 sur 4).
**Revu le 2026-10-18** : complétée par la même limite du chantier « un
détour pour une correction intercalée » (0.6.5, 4 sur 4) — la reprise
d'un détour ne reconnaît pas non plus une PR fusionnée par squash.

## Besoin

Au lancement d'un chantier, les branches locales déjà fusionnées sont
supprimées (QUA-048, clôture en un geste). Seules le sont les branches
dont le dernier commit est dans la branche principale : un projet qui
fusionne par squash (choix laissé au projet par la recette des branches)
garde ses branches, que Git ne voit pas comme fusionnées.

Même cause pour la reprise d'un détour (QUA-050, un détour pour une
correction intercalée) : `node .githooks/detour.mjs resume` exige que la
branche du détour soit fusionnée dans la branche principale ; fusionnée
par squash, elle ne l'est pas aux yeux de Git, et la reprise est refusée
(« pas encore fusionnée ») alors que la PR l'est.

## Existant (vérifié le 2026-10-18)

- `.githooks/close.mjs` (`pruneMergedBranches`) : `git branch --merged`
  puis `git branch -d`, qui refuse toute branche non fusionnée.
- `.githooks/detour.mjs` (`resume`) : `git merge-base --is-ancestor
  <branche du détour> <branche principale>` ; refus sinon, état inchangé
  et travail mis de côté intact (rien n'est perdu, un humain reprend à la
  main).
- Ce dépôt fusionne par commit de fusion (`gh pr merge --merge`) : non
  concerné.

## Questions à trancher

- [décision] Reconnaître une branche fusionnée par squash (branche
  distante supprimée par la forge, ou contenu déjà présent dans la branche
  principale) au risque d'un faux positif, ou s'en tenir à `git branch -d` ?
- [décision] Le même critère sert-il aux deux usages (suppression au
  lancement, reprise d'un détour), ou la reprise, qui ne supprime rien,
  peut-elle accepter un critère plus large (fiche du détour retirée et
  journal qui cite la branche, déjà vérifiés) ?

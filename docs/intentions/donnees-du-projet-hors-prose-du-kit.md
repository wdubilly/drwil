# Intention : les données du projet hors des fichiers que le kit réécrit

**Statut** : proposée le 2026-10-26.

## Besoin

Sur drwil_dbox, la montée en 0.9.0 a remplacé `docs/intentions/README.md` par
la version du gabarit : le tableau des fiches du projet (`drum-box`,
`ux-followups`) a été remplacé par « empty at install ». Le demandeur veut
qu'une mise à jour ne perde aucune donnée du projet.

## Existant

Relevé dans `packages/drwil/src/config.ts` le 2026-10-26 :
`docs/intentions/README.md` figure dans la prose du kit (rafraîchie par
`init` et `resolve-drift`), alors que ce fichier contient aussi le tableau
des fiches du projet, qui est une donnée du projet. Le fichier est réécrit
dans son entier.

## Questions à trancher

- [décision] Déplacer le tableau des fiches dans un fichier propre au projet,
  ou faire préserver les lignes du tableau par `init` ?
- [décision] Y a-t-il d'autres fichiers de prose du kit qui mêlent texte du
  kit et données du projet (à relever avant de trancher) ?

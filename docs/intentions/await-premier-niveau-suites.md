# Intention : suites du contrôle des await de premier niveau

**Statut** : noté le 2026-11-06.

## Besoin

Le contrôle de QUA-249 (aucun hook importé par un autre module ne fait d'await de premier niveau)
laisse deux angles ouverts :

- il ne suit que les imports relatifs écrits en dur (`import … from "./x.mjs"`, `import("./x.mjs")`) :
  un `import()` dont le chemin est calculé lui échappe ;
- les hooks que rien n'importe gardent leur await de premier niveau pour lancer leur commande
  (`run-checks`, `pr-watch`, `merge-auto`, `wait-command`, `create-release`, `check-contrast`,
  hooks Claude) : sans danger aujourd'hui, refusé le jour où l'un d'eux devient importé, au risque
  de surprendre le chantier qui l'importe.

## Questions à trancher

- Refuser tout `import()` calculé dans les hooks, ou le résoudre quand il est une constante ?
- Aligner tous les points d'entrée sur `main(…).then(…)` par précaution, ou attendre le refus ?
  Ces hooks sont livrés : quel coût de mise à jour pour les projets équipés ?

## Existant

`outils/verifier-await-premier-niveau.mjs` (`lireModule`), contrôle `await-premier-niveau`.

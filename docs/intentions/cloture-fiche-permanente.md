# Intention : la clôture en un geste reconnaît une fiche permanente

**Statut** : à cadrer — limite constatée le 2026-10-26 à la clôture de
l'entretien courant pour la montée de version 0.9.0 (PR #258).

## Besoin

`node .githooks/close.mjs` (clôture en un geste, QUA-048) traite toute fiche
active comme une fiche de chantier : il la supprime, retire sa ligne de
l'index et consigne la consommation. Sur la fiche permanente
`docs/projects/routine-maintenance.md` (entretien courant), il supprimerait
la fiche et signale une trentaine de références à réorienter. Les montées de
version 0.8.0 et 0.9.0 ont donc été closes à la main : une ligne au journal
de la fiche, sans l'outil de clôture.

Conséquences :

- rien ne vérifie qu'une clôture d'entretien est complète (ligne de journal
  présente, datée, chemins cités valides) ;
- la consommation d'un entretien n'est jamais consignée dans
  `.drwil/usage.jsonl` ;
- un agent qui applique « Clôture en un geste » d'`AGENTS.md` à la lettre
  peut supprimer la fiche permanente.

## Existant (relevé le 2026-10-26)

- `.githooks/close.mjs` : clôture en un geste, sans notion de fiche
  permanente.
- `docs/projects/routine-maintenance.md` : fiche permanente, journal des
  petites tâches, dont les montées de version 0.8.0 et 0.9.0.

## Piste

L'outil de clôture reconnaît une fiche permanente (marqueur explicite dans la fiche,
ou liste déclarée) : il vérifie la ligne du jour au journal de la fiche,
consigne la consommation, ne supprime ni la fiche ni sa ligne d'index et ne
demande aucune réorientation de références. `AGENTS.md` et la règle CLOSING
le disent.

## Questions à trancher

- [décision] Comment une fiche se déclare-t-elle permanente : marqueur dans
  la fiche, ou réglage de `.drwil/ia-first.json` ?
- [décision] La consommation d'un entretien est-elle consignée à chaque
  clôture, comme pour un chantier ?

## Constat du 2026-10-28

Après la montée de version 0.10.0, la clôture a été faite à la main : l'état
est resté en BUILD sur `routine-maintenance`, et `/drwil-start` a été refusé
(`state.mjs start` n'accepte que SCOPING, EXPECTATION, REQUEST ou CLOSING avec
PR fusionnée). Il a fallu `state.mjs move SCOPING`. `.githooks/close.mjs` ne convient pas
tel quel : il supprimerait la fiche (plus de 15 citations). Le chantier prévoit
donc aussi le retour en SCOPING à la clôture d'une fiche permanente.

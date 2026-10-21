# Intention : un dossier de preuves nommé dans la langue du projet

**Statut** : proposée le 2026-10-21 — limite du chantier « des critères et des
preuves qui survivent à la clôture ».

## Besoin

La clôture écrit sa preuve dans `docs/preuves/<chantier>.md`, un nom français
imposé à tous les projets, y compris ceux dont la documentation est en anglais
(`docLang: "en"`) : un projet anglophone se retrouve avec un dossier `preuves`
au milieu de `docs/recipes/` et `docs/projects/`. Résultat attendu : le dossier
des preuves porte le nom de la langue du projet (un dossier `proofs` sous
`docs/` en anglais),
sans casser les dépôts qui ont déjà des preuves écrites.

## Existant (relevé le 2026-10-21)

- `packages/drwil/src/closure.ts` lit le dossier par `proofsDir(config)`, qui
  accepte déjà un réglage `dirs.proofs` de `.drwil/ia-first.json` et retombe sur
  `docs/preuves` ; `.githooks/closure-proof.mjs` écrit au même endroit.
- Aucun gabarit ne pose `dirs.proofs` : le défaut français s'applique partout.
- Le `README.md` du dossier est livré en deux langues, mais le nom du dossier
  qui le contient, non.

## Questions à trancher

- Le défaut suit-il `docLang` (dossier `preuves` en français, `proofs` en
  anglais), ou le réglage `dirs.proofs` reste-t-il le seul moyen ?
- Que fait `doctor` d'un dépôt qui a des preuves dans l'ancien dossier : il le
  signale, il propose le déplacement, ou les deux dossiers sont lus ?

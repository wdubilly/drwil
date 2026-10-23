# Intention : le code existant qu'`init` ne peut pas rattacher seul

**Statut** : proposée le 2026-10-23 — limite du chantier « `init` rattache
le code existant, le premier commit passe » (journal du 2026-10-23).

## Besoin

`init` rattache le code indexé avant le kit (QUA-110) sans jamais réécrire
un fichier du projet. Deux cas restent donc refusés au premier commit,
avec réglages bloquants, tant qu'un humain ou l'agent n'y a pas touché :

- une carte `docs/architecture.md` présente avant l'installation : gardée
  telle quelle, `init` dit seulement les dossiers à y citer (QUA-040, carte
  entretenue) ;
- un fichier dont le chemin ne peut pas s'écrire dans un bloc `scope` sans
  motif trop large (un blanc ou un caractère `*`, `?`, `[` avant le
  deuxième dossier) : signalé, jamais écrit dans la fiche.

## Existant (vérifié le 2026-10-23)

- `packages/drwil/src/existing-code.ts` : message « existait avant
  l'installation » avec la liste des dossiers ; message « Fichiers de code
  non rattachés ».
- `.githooks/scope.mjs` : une entrée de bloc ne contient aucun blanc
  (`ENTRY_RE`), un motif doit nommer deux dossiers avant son premier joker
  (`tooBroad`) ; la grammaire n'a pas d'échappement.

## Questions à trancher

- [décision] Compléter une carte préexistante dans un bloc délimité (comme
  les fichiers qu'`init` complète déjà, retiré par `uninstall`), ou garder
  le seul signalement ?
- [décision] Donner à la grammaire du bloc `scope` un échappement (chemin
  entre guillemets), ou laisser ces fichiers à rattacher à la main ?

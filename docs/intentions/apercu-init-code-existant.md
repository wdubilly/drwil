# Intention : l'aperçu d'`init` annonce le rattachement du code existant

**Statut** : proposée le 2026-10-23 — limite du chantier « `init` rattache
le code existant, le premier commit passe » (journal du 2026-10-23).

## Besoin

`drwil init --dry-run` dit ce qu'`init` écrirait, sans pouvoir s'en écarter
(même parcours du gabarit). Sur un projet qui a déjà du code indexé, `init`
écrit désormais en plus la fiche de référence « code existant » et une
section de la carte qui cite ses dossiers (QUA-110, `init` rattache le code
indexé avant le kit) : l'aperçu ne les annonce pas.

## Existant (vérifié le 2026-10-23)

- `packages/drwil/src/preview.ts` (`previewInit`) : liste les fichiers créés,
  gardés et remplacés par le parcours du gabarit ; le rattachement
  (`packages/drwil/src/existing-code.ts`) tourne après, hors de ce parcours.
- `findExistingCode` lit déjà sans rien écrire : réutilisable par l'aperçu,
  mais il juge avec la grammaire installée (`.githooks/scope.mjs`), absente
  d'un projet que l'aperçu n'a pas encore équipé.

## Questions à trancher

- [décision] L'aperçu annonce-t-il la fiche et les dossiers cités, jugés avec
  la grammaire du paquet faute de celle du projet, ou dit-il seulement que
  le code indexé sera rattaché ?

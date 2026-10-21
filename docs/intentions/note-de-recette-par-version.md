# Intention : une note de recette conservée dans le dépôt, à chaque version

**Statut** : proposée le 2026-10-19 — demande de l'humain, pendant le cadrage des versions.

## Besoin

À chaque version, garder dans le dépôt (`docs/`) une note de recette : ce qui a
été validé, par qui, avec quel verdict. Aujourd'hui la fiche de recette et le
verdict n'existent que sur la pré-release GitHub : ils ne suivent pas le code
et se perdraient avec la forge.

## Existant (vérifié le 2026-10-19)

- `.githooks/create-release.mjs --candidate` publie la candidate avec sa fiche
  de recette, générée par `.githooks/acceptance-sheet.mjs` (QUA-051).
- Le verdict, geste humain (`.githooks/release-verdict.mjs`, QUA-053), est
  enregistré sur la pré-release (une pièce jointe au format JSON), pas dans le dépôt.
- Le journal (`docs/projects/journal.md`) rend compte de chaque chantier, pas
  de la recette d'une version.
- Intentions voisines : `docs/intentions/fiche-de-recette-html.md` (autre
  format de la fiche) et `docs/intentions/fiche-recette-apres-squash.md`.

## Décisions du demandeur (2026-10-21)

- [décision prise] Où : un fichier par version, `docs/recettes/<version>.md`.
- [décision prise] Qui l'écrit : la promotion (`.githooks/promote-release.mjs`)
  copie la fiche et le verdict dans le dépôt.
- [décision prise] Arrivée sur la branche principale, protégée : une PR par
  version.
- [décision prise] Une version sans candidate ni verdict : la note reste
  obligatoire.

## Questions à trancher

- [décision] Que contient la note en plus de la fiche générée : verdict et
  réserves, auteur du verdict, date, tarball vérifié ?
- [décision] « Note obligatoire » : que fait la promotion d'une version sans
  verdict (note écrite à la main par l'humain, ou note générée vide) ?
- Ordre : ce chantier passe après « la clôture vérifie la cohérence de la
  documentation » (décision du 2026-10-21).

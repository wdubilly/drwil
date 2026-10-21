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

- [décision prise] Contenu de la note, en plus de la fiche générée : verdict,
  réserves, auteur et date du verdict, sha256 du tarball (2026-10-21).
- [décision prise] Version sans verdict : note générée avec la mention
  « sans verdict », à compléter par l'humain (2026-10-21).
- Ordre : ce chantier passe après « la clôture vérifie la cohérence de la
  documentation » (fait le 2026-10-21) ; cadré dans
  `docs/projects/note-de-recette-par-version.md`.

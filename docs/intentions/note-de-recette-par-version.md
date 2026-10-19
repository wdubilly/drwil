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

## Questions à trancher

- [décision] Où : un fichier par version (`docs/recettes/<version>.md`), ou une
  section par version dans un seul fichier ?
- [décision] Qui l'écrit : la promotion (`.githooks/promote-release.mjs`) copie la fiche
  et le verdict dans le dépôt, ou l'humain les commite ?
- [décision] Comment l'arrivée sur la branche principale, protégée, se fait :
  une PR par version, ou un commit de la promotion ?
- [décision] Une version sans candidate ni verdict : note obligatoire, ou
  refus de la promotion (contrôle bloquant) ?
- [décision] Que contient la note en plus de la fiche générée : verdict et
  réserves, auteur du verdict, date, tarball vérifié ?

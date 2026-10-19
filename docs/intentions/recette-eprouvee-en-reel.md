# Intention : la recette par version éprouvée en réel

**Statut** : proposée le 2026-10-19 — limite du chantier « une recette par
version, pour une équipe hors dépôt » (journal du 2026-10-19, 0.6.5).

## Besoin

La fiche prévoyait de l'éprouver en réel sur la release 0.6.5 : une
candidate publiée, la fiche lue par l'équipe de recette, un verdict donné,
la promotion du même tarball. Rien n'a été publié pendant le chantier : la
publication reste une décision humaine, et le verdict un geste humain
(QUA-053, le verdict de recette est un geste humain). gh, les assets et
les issues sont simulés par les tests.

## Existant (vérifié le 2026-10-19)

- `node .githooks/create-release.mjs --candidate --dry-run` affiche la
  fiche réelle de la plage `v0.6.4..HEAD` (points tirés du journal, OS de
  la CI lus par gh) ; essayé en local, sans rien publier.
- `.githooks/release-verdict.mjs` et `.githooks/promote-release.mjs` n'ont
  tourné que contre un gh simulé.

## Questions à trancher

- [décision] Publier la candidate de la 0.6.5 (feu vert de publication
  nommant `v0.6.5-rc.1`), puis faire donner le verdict par l'équipe de
  recette et promouvoir ; consigner au journal ce que l'essai a appris
  (format des options de gh, lisibilité de la fiche).

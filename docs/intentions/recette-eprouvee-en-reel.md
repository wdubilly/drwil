# Intention : la recette par version éprouvée en réel

**Statut** : en cours depuis le 2026-10-19 (essai sur la 0.6.5) ; proposée le 2026-10-19 — limite du chantier « une recette par
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

- Tranché le 2026-10-19 par le demandeur (« oui publions ») : la 0.6.5
  passe par le parcours de recette. Version posée par le chantier
  « release 0.6.5 » (journal du 2026-10-19) ; candidate `v0.6.5-rc.1`,
  verdict et promotion menés après sa fusion. Reste à consigner ici, puis
  au journal, ce que l'essai a appris (format des options de gh,
  lisibilité de la fiche), et à retirer cette intention.

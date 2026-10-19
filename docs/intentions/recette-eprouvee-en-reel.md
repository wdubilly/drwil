# Intention : la recette par version éprouvée en réel

**Statut** : essai réel fait le 2026-10-19 (0.6.5), suites cadrées en 0.6.6 ; proposée le 2026-10-19 — limite du chantier « une recette par
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
  verdict et promotion menés après sa fusion.

## Essai réel du 2026-10-19 (0.6.5)

- Candidate `v0.6.5-rc.1` publiée en pré-release avec tarball et fiche ;
  verdict « approuvée » donné par le demandeur dans son terminal ;
  promotion en `v0.6.5` avec le même tarball (sha256 vérifié après
  téléchargement). Le parcours tient de bout en bout.
- Trois défauts de la fiche générée, cadrés en
  `docs/projects/stab-recette.md` (0.6.6) : faux « verify : FAIL » dû à
  QUA-017 sur la branche principale ; 26 points dont des faux « essai
  réel » tirés par mot-clé ; critères lus dans une version périmée des
  fiches.
- À retirer à la clôture de `docs/projects/stab-recette.md`.

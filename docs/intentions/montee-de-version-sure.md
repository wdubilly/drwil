# Intention : une montée de version du kit qui ne rétrograde rien, n'écrase rien du projet et se commite

**Statut** : proposée le 2026-11-08, décisions du demandeur le 2026-11-08 ; premier chantier réalisé le 2026-11-08 (refus de version QUA-282, zone du projet du CI QUA-283), suite réalisée le 2026-11-09 (fichiers modifiés traités par `init`, `resolve-drift` retiré, `doctor` : `docs/projects/journal.md`) — constatée à la montée de drwil_walk de 0.10.0 à 0.11.0 (candidate `drwil-0.11.0.tgz`).

## Besoin

Monter un projet adoptant d'une version du kit à la suivante doit marcher d'un seul geste, `init`, qui détecte la
version précédente et fait le nécessaire, sans rétrograder, sans écraser une donnée du projet et sans impasse de
commit. Le demandeur trouve la montée agaçante : l'outil de résolution des écarts demande de le deviner et de
nettoyer derrière lui.

## Existant

Relevé le 2026-11-08 à l'usage sur drwil_walk (`master`, arbre propre, 0.10.0 installé), puis dans
`packages/drwil/src/drift.ts` :

- **Rétrogradation.** `init` lancé depuis le tarball 0.11.0 a commité la mise à jour sur `workstream/kit-update`
  (94 fichiers, conformes 0.11.0). `npx drwil resolve-drift`, lancé ensuite, a réécrit 38 fichiers de mécanique
  avec les gabarits **0.10.0** : aucun n'était conforme à 0.11.0 après la résolution, alors que 36 sur 38 l'étaient
  avant. Cause : `resolveDrift` rend les gabarits du paquet qui s'exécute (`templatesDir`) et ne compare pas sa
  version à celle du projet ; `npx drwil` lance le `drwil` installé dans le projet (0.10.0), pas le tarball.
- **Écrasement de fichiers du projet.** `renderedProse` propose tout fichier de prose du kit présent dans le
  manifeste d'installation, donc un fichier installé puis personnalisé par le projet : `AGENTS.md` (description du
  projet remplacée par « to describe »), `docs/recipes/run-locally.md` (commandes réelles perdues),
  `docs/recipes/add-a-frontend-screen.md` (étape du projet perdue), `docs/intentions/README.md` (tableau des
  fiches perdu), `docs/contracts-catalog.md` (le gabarit remet dans le catalogue des contrats déjà adoptés :
  `check-docs` refuse alors le commit). Le diff est montré, mais sans dire que le fichier est une donnée du projet.
- **CI du projet : des étapes ajoutées sont écrasées.** Le workflow de drwil_walk contient des étapes que le projet a
  ajoutées pour ses contrôles (installation de `diff-cover`, `npm ci` de la couche `app`, navigateur Playwright,
  publication des captures de l'accueil) ; le gabarit n'en a aucune. Réécrire le fichier avec le gabarit les supprime,
  et les contrôles concernés deviennent « non exécutés », donc la CI échoue (QUA-013). Même cause que la perte d'étapes
  constatée sur drwil_dbox.
- **Impasse de commit.** Le fichier de CI `.github/workflows/ia-first.yml`, modifié par le projet, n'est pas
  réécrit par `init` (« jamais réécrit », `docs/intentions/adoption-et-init.md`, hors périmètre) ; `resolve-drift`
  le réécrit mais ne le commite pas ; la barrière de périmètre refuse alors le commit en SCOPING
  (« une mise à jour du kit se commite par `npx drwil init` ») ; et `init` refuse de relancer sur un arbre sale.
  Aucune sortie sans lancer un chantier.
- **Barrière muette.** Le refus ne nomme pas les fichiers (note du 2026-11-05 dans `docs/intentions/notes.md`).
- **Nettoyage.** Chaque fichier réécrit laisse un `.bak` non suivi ; rien ne les range.
- **Déjà en place dans `init`** (relevé du 2026-11-08, `packages/drwil/src/kit-update.ts`,
  `packages/drwil/src/install-record.ts`, `packages/drwil/src/config-write.ts`) : `init` sur un projet équipé coupe `workstream/kit-update`, commite lui-même (trailer
  `Drwil-Kit-Update`, reconnu par la barrière de périmètre) et refuse sur un arbre sale ; la version installée est
  enregistrée dans `.drwil/install.json` (si présent) et `compareVersions` existe, mais seul `doctor` l'utilise :
  `init` ne refuse pas une version plus ancienne que celle installée ; `writeConfig` fusionne `.drwil/ia-first.json`
  (si présent) : les clés du projet (`checks`, `risk`, `extraCodeGlobs`, `release`…) sont conservées, celles que le
  kit dérive (`projectName`, `lang`, `layers`, `tools`, `ci`, `stack`, `mode`) sont recalculées ; `init` ne touche
  pas à `.drwil/state.json` (si présent). Son message de fin renvoie à `resolve-drift` pour les fichiers modifiés à la main.
- **Intentions voisines, absorbées puis supprimées le 2026-11-09** (livrées, voir le CHANGELOG) : les données du
  projet hors prose du kit, le CI que la mise à jour n'écrase pas, les alertes avant et après un écrasement.
  Reste voisine : `premier-commit-du-kit-sous-barriere-bloquante` (installation neuve seulement).

## Décisions

Tranchées le 2026-11-08 par le demandeur ; la source unique est `docs/projects/journal.md` (D1 à D10),
qui cadre le chantier.

## Questions à trancher

Aucune : voir la fiche `docs/projects/journal.md`.

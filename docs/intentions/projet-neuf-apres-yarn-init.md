# Intention : un dossier passé par `yarn init` reste un projet neuf

**Statut** : proposée le 2026-10-17 — limite du chantier « un dossier
passé par `npm init -y` reste un projet neuf » (journal du 2026-10-17).

## Besoin

Depuis ce chantier, le script `test` par défaut de `npm init` (texte
exact) ne fait pas une pile : un dossier passé par `npm init -y` ou
`pnpm init` (même script, vérifié le 2026-10-17 avec pnpm 11.28.6) reste
un projet neuf. `yarn init` n'a pas été essayé (yarn absent de la machine
du chantier) : s'il écrit un autre script par défaut, le dossier serait
encore pris pour un projet Node.js existant.

## Existant (vérifié le 2026-10-17)

- `detectDir` (`packages/drwil/src/stack.ts`) : seul le `test` par défaut
  de `npm init`, au texte exact, est ignoré ; tout autre script fait une
  pile.

## Questions à trancher

- [décision] Essayer `yarn init` (classique et Berry) ; s'il écrit un
  script par défaut, l'ignorer aussi (QUA-038 évolue) ou s'en tenir là ?

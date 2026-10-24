# Intention : les recettes et skills qui renvoient encore au registre entier

**Statut** : proposée le 2026-10-24 — limite du chantier « réduire le contexte
relu par chantier ».

## Besoin

Le chantier a fait pointer `AGENTS.md` et les recettes de clôture vers la
lecture ciblée (QUA-124 : `node .githooks/glossary.mjs --contract <ID>`,
`--contracts`, `--journal <chantier>`). D'autres textes citent encore
`docs/contracts.md` comme une lecture, ce qui invite un agent d'un autre outil
que Claude Code (sans garde de lecture, QUA-132) à le lire en entier.

## Existant (relevé le 2026-10-24)

- `AGENTS.md` (gabarit et dépôt), tableau « Si tu touches à… » : ligne « un
  défaut à corriger », colonne « Lis d'abord » = `docs/contracts.md`.
- Recettes du gabarit (`packages/drwil/templates/common/base/docs/recipes/`) :
  `docs/recipes/audit-risks-and-debt.md` (« Invariants »),
  `docs/recipes/modify-permissions.md`, `docs/recipes/corriger-un-defaut.md`,
  `docs/recipes/adopt-the-kit.md`, `docs/recipes/view-progress.md` (certaines
  mentions sont descriptives, pas des lectures).
- Skills Claude Code : `add-an-api-route`, `add-a-frontend-screen`,
  `adopt-the-kit`.

## Questions à trancher

- Remplacer chaque mention qui est une lecture par la lecture ciblée, et
  garder les mentions descriptives ?
- Faut-il un contrôle (doc-coherence) qui refuse une consigne de lecture du
  registre entier dans une recette livrée ?

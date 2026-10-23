# Intention : « pas encore de code » dit à un projet qui en a

**Statut** : proposée le 2026-10-23 — écart relevé pendant le chantier
« `init` rattache le code existant, le premier commit passe » (journal du
2026-10-23).

## Besoin

Sur un projet qui a du code mais aucune pile détectée (pas de manifeste
reconnu), `init` affiche « Aucune couche écrite : le projet n'a pas encore
de code », juste avant de dire qu'il a rattaché ce code (QUA-110) : les
deux messages se contredisent.

## Existant (vérifié le 2026-10-23)

- `packages/drwil/src/index.ts` (`reportStack`, texte `noLayers`) : le
  message suit l'absence de pile détectée, pas l'absence de code
  (QUA-038, un projet neuf commence par son cadrage global).

## Questions à trancher

- [décision] Distinguer « pile non détectée » et « pas de code » dans ce
  message (le code indexé se lit déjà), ou le laisser tel quel ?

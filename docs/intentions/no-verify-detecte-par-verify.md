# Intention : `drwil verify` signale un `--no-verify`

**Statut** : proposée le 2026-10-22 — limite du chantier « garanties
obligatoires à l'adoption ».

## Besoin

Le critère du versionnement (QUA-095, bonnes pratiques de versionnement
imposées) demande que l'usage de `--no-verify` soit signalé par
`drwil verify` « quand il est détectable ». Le chantier ne le détecte pas
directement : c'est la CI, qui rejoue les contrôles du hook local, qui
rattrape un commit poussé sans hooks avant la fusion.

## Existant (relevé le 2026-10-22)

- `packages/drwil/src/guarantees-forge.ts` : une fiche bloquante est écrite
  quand la CI ne rejoue pas `node .githooks/run-checks.mjs` (« un
  `--no-verify` passerait »).
- Aucune trace n'est laissée par un commit fait avec les hooks (pas de trailer
  ni de marque locale), donc rien ne permet aujourd'hui de reconnaître un
  commit fait sans eux.

## Questions à trancher

- [décision] Faut-il une marque posée par le hook (trailer, note git) pour que
  `verify` repère un commit sans elle, ou la CI suffit-elle comme seule
  défense ?
- [décision] Si une marque est posée, est-elle exigée sur toute la branche ou
  seulement sur les commits de code ?

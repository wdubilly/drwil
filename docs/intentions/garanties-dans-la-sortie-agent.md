# Intention : une rubrique propre aux garanties dans la sortie `verify --agent`

**Statut** : proposée le 2026-10-22 — limite du chantier « garanties
obligatoires à l'adoption ».

## Besoin

Une garantie non tenue (couverture, e2e, forge, présentation) fait échouer
`drwil verify`, mais la sortie pour l'agent (`--agent`) la range sous
« Registry errors », rubrique des erreurs du registre des contrats. L'agent
peut chercher la cause dans `docs/contracts.md` au lieu d'ouvrir la fiche
bloquante.

## Existant (relevé le 2026-10-22)

- `packages/drwil/src/guarantees.ts` (`judgeGuarantees`) ajoute les garanties
  non tenues aux erreurs du verdict.
- `packages/drwil/src/agent.ts` affiche ces erreurs sous « Registry errors: ».

## Questions à trancher

- [décision] Une rubrique « Guarantees » à part, avec la fiche bloquante à
  ouvrir pour chacune, dans `--agent` et dans `--json` ?

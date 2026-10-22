# Intention : confirmer ce qui fait échouer `verify` sur une garantie

**Statut** : proposée le 2026-10-22 — limite du chantier « garanties
obligatoires à l'adoption » ; interprétation de l'agent, non confirmée par
l'humain.

## Besoin

Le critère QUA-088 (fiche bloquante quand l'outil de couverture manque) dit :
« tant qu'elle existe, `verify` est en `FAIL` sur cette couche ». Le chantier
l'a interprété ainsi : `verify` échoue tant que la **garantie n'est pas
tenue** (outil absent, contrôle non déclaré ou non exécuté), pas du seul fait
que la fiche existe. Une fiche oubliée alors que la garantie est tenue ne
bloque donc pas ; une fiche supprimée alors que la garantie n'est pas tenue
bloque quand même. Cette lecture doit être confirmée ou corrigée par le
demandeur.

## Existant (relevé le 2026-10-22)

- `packages/drwil/src/guarantees.ts` (`judgeGuarantees`, `guaranteeFailures`)
  rejuge l'état réel de chaque garantie à chaque `verify`, dès que le réglage
  `guarantees.enforced` de `.drwil/ia-first.json` est vrai ; la présence des
  fiches `docs/projects/couverture-<couche>.md` n'y entre pas.

## Questions à trancher

- [décision] Garder la lecture « garantie non tenue » (plus robuste à une fiche
  supprimée à la main) ou exiger aussi la disparition de la fiche ?
- [décision] Une fiche restée alors que la garantie est tenue doit-elle être
  signalée (avertissement) ou retirée automatiquement ?

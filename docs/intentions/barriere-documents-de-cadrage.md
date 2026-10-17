# Intention : les documents produits en cadrage passent la barrière en SCOPING

**Statut** : proposée le 2026-10-17 — défaut constaté en séance (commit
de la découverte de valeur refusé), 0.6.3.

## Besoin

Le 2026-10-17, la découverte de valeur (recette
`docs/recipes/discover-product-value.md`) a mis à jour
`docs/decouverte-valeur.md` en SCOPING. Le commit a été refusé par la
barrière de périmètre : « 1 fichier(s) hors fiches commité(s) en
SCOPING : seule l'activité BUILD l'autorise ». Or cette recette est une
activité de cadrage par nature (lire, analyser, proposer, sans code), de
même que l'audit de risques (`docs/recipes/audit-risks-and-debt.md`,
sortie « docs/audit-risks.md », à créer). Le contrôle est mal calibré :
le signaler et le corriger, jamais le contourner (QUA-019, pas de
contournement d'un contrôle).

Le document refusé est gardé dans un stash local nommé « decouverte-valeur
2026-10-17 (refusé en SCOPING, à commiter avec le correctif de la
barrière) », sur la branche `cadrage/decouverte-valeur-0-6-3` : le
chantier qui corrige la barrière le commite (`git stash list`, puis `git
stash pop`). Sa roadmap est déjà reportée dans l'index
(`docs/projects/pending.md`, « Ordre de réalisation »).

## Existant (vérifié le 2026-10-17)

- `.githooks/scope-gate.mjs` : `OUT_OF_SCOPE` = `docs/projects/*`,
  `docs/intentions/*`, `.drwil/evidence/attestations/*`,
  `.drwil/usage.jsonl` ; tout autre fichier exige BUILD et le cadrage de
  la fiche active.
- Sorties des recettes de cadrage : `docs/decouverte-valeur.md` (ce
  dépôt, en français), « docs/value-discovery.md » et
  « docs/audit-risks.md » (noms donnés par les recettes livrées, absents
  de ce dépôt).

## Questions à trancher

- [décision] Ajouter les sorties des recettes de cadrage à
  `OUT_OF_SCOPE` (liste fixe), ou les déclarer par un réglage de
  `.drwil/ia-first.json` (les noms varient selon la langue du projet) ?
- [décision] Même règle dans le gabarit livré et dans ce dépôt ?

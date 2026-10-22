# Intention : `init` impose les garanties obligatoires lui-même

**Statut** : proposée le 2026-10-22 — limite du chantier « garanties
obligatoires à l'adoption ».

## Besoin

Le demandeur veut que les garanties obligatoires (couverture à 100 %, e2e des
chemins critiques, forge protégée, présentation du projet) soient imposées
« dès `init` » sur un projet neuf. Aujourd'hui, `init` ne les câble pas : il
renvoie vers `drwil guarantees`, lancé par `/drwil-adopt` une fois la pile
connue. Un projet installé sans passer par l'adoption n'a donc aucune
garantie câblée ni fiche bloquante.

## Existant (relevé le 2026-10-22)

- `packages/drwil/src/index.ts` : à la fin d'`init`, si `.drwil/ia-first.json`
  n'a pas de réglage `guarantees`, une ligne renvoie vers
  `npx drwil guarantees` (texte `guarantees`, français et anglais).
- `packages/drwil/src/guarantees.ts` : la commande câble les contrôles et écrit
  les fiches bloquantes ; elle a besoin de la pile, qu'`init` ne connaît pas sur
  un dossier vide.
- `guaranteeFailures` (même fichier) ne juge rien tant que le réglage
  `guarantees.enforced` n'est pas posé : avant le premier
  `drwil guarantees`, `verify` ne signale aucune garantie manquante.

## Questions à trancher

- [décision] `init` doit-il lancer `drwil guarantees` lui-même quand la pile
  est détectée (projet existant), et écrire seulement les fiches bloquantes
  sur un dossier vide (pile inconnue) ?
- [décision] Ou bien `verify` doit-il échouer tant que `drwil guarantees` n'a
  jamais été lancé (réglage `guarantees` absent) ?

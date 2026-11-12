# Projet : `drwil init` marque [IA] ce qu'un agent peut faire

**Statut** : cadré le 2026-11-12.
**Risque** : MEDIUM
**Maturité** : prêt
**Intention** : `docs/intentions/retours-du-demandeur-0-11-2.md` (point 6)

<!-- scope
files:
  - packages/drwil/src/guarantees-briefs.ts
  - packages/drwil/test/guarantees.test.mjs
  - docs/projects/pending.md
  - docs/projects/journal.md
-->

## 1. Besoin

Le demandeur constate que `drwil init` écrit des transitions marquées `[humain]` là où `[IA]` est attendu. Piste :
`packages/drwil/src/guarantees-briefs.ts` écrit une ligne d'index `[humain]` pour chaque fiche de garantie, alors que
le lot « résoudre la garantie » est faisable par un agent une fois les décisions prises.

## Critères d'acceptation

- Un lot ou une ligne d'index qu'un agent peut faire est marqué `[IA]`, seul un geste hors du dépôt ou une décision à
  prendre porte `[humain]` ou `[décision]` — `QUA-088`
- Les fiches de garantie écrites par `drwil guarantees` restent bloquantes (verify en FAIL) — `QUA-088`

## 2. Hors périmètre

- Le contenu des garanties elles-mêmes (couverture, e2e, versioning).

## 3. Contraintes

- Reproduire d'abord : lancer `init` sur un dossier de test, lister les lignes `[humain]` écrites, décider de
  chacune si elle relève d'un humain (décision, geste externe) ou d'un agent. Tant que ce n'est pas fait, le défaut
  est une hypothèse.

## 4. Décisions

- 2026-11-12 : défaut signalé par le demandeur, P0 (0.11.2).

## 5. Points à trancher

Aucun.

## 6. Increments

- **Lot 1 — reproduire, corriger** [IA] : relever les marques écrites par `init` et `guarantees`, corriger celles
  qui sont à tort `[humain]`, tests. Critère de sortie : tests du paquet verts, `node .githooks/run-checks.mjs` sans échec.

## 7. Reprise

- **Dernier état** (2026-11-12) : cadrage terminé, non commité.
- **Prochaine étape** : [humain] `/drwil-start`.

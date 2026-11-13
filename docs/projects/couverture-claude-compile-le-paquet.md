# Projet : le contrôle des hooks Claude compile le paquet qu'il teste

**Statut** : cadré le 2026-11-13.
**Risque** : HIGH
**Maturité** : prêt
**Intention** : défaut constaté le 2026-11-13 sur la PR #416 (CI rouge sur une PR de documentation seule)

<!-- scope
files:
  - package.json
  - .drwil/ia-first.json
  - .githooks/run-checks.test.mjs
  - docs/projects/pending.md
  - docs/projects/journal.md
-->

## 1. Besoin

Les quatre runs `pull_request` de la branche `cadrage/relecture-critique-enrichie` (PR #416, documentation seule)
sont rouges sur le contrôle `couverture-claude` (« hooks Claude et module front : tests + couverture »), run
`43411172478` : `ERR_MODULE_NOT_FOUND` sur `packages/drwil/dist/index.js` (si présent), importé par
`packages/drwil/test/cursor-acp.test.mjs`, `packages/drwil/test/portable-attest.test.mjs` et
`packages/drwil/test/portable-polls.test.mjs`.

Cause établie le 2026-11-13 dans les verdicts du run (artefact `pr-verdicts` de la CI) :

- le script `test:claude:coverage` (`package.json`) lance les tests sans compiler le paquet ; il compte sur
  `couverture-tests`, qui compile ;
- sur une PR sans changement sous `packages/`, `couverture-tests` est repris d'un verdict précédent (rien n'est
  compilé), tandis que `couverture-claude`, sans verdict réutilisable, est rejoué et échoue ;
- les `paths` de `couverture-claude` (`.drwil/ia-first.json`) omettent `packages/drwil/src/**` (ce que les tests
  importent compilé), `packages/drwil/test/cursor-acp.test.mjs` et `packages/drwil/test/portable-polls.test.mjs` :
  un changement de ces fichiers ne rejoue pas le contrôle, qui peut alors être repris à tort.

Tant que ce n'est pas corrigé, toute PR qui ne touche pas `packages/` a une CI rouge et ne fusionne pas.

## Critères d'acceptation

- `couverture-claude` compile le paquet avant ses tests, sans dépendre de l'ordre ni de la reprise des autres
  contrôles — `QUA-004`
- Les `paths` de `couverture-claude` couvrent tout ce que ses tests lisent : `packages/drwil/src/**` et les cinq
  fichiers de test de sa commande — `QUA-004`
- La CI de la PR du chantier est verte ; la PR #416 rejouée après la fusion est verte sur `couverture-claude` —
  `QUA-004`

## 2. Hors périmètre

- La reprise des verdicts elle-même (`.githooks/run-checks-verdicts.mjs`) et le cache de la CI
  (`docs/projects/cache-des-verdicts-de-ci-retabli.md`).
- Une règle générale qui imposerait à tout contrôle de déclarer ses dépendances de compilation (à noter en intention
  si le cas se répète).
- Le gabarit livré : `package.json` racine et `.drwil/ia-first.json` sont propres à ce dépôt (QUA-018).

## 3. Contraintes

- Reproduire d'abord : sans `packages/drwil/dist/`, `npm run test:claude:coverage` échoue sur `ERR_MODULE_NOT_FOUND`.
- Vérifier ensuite que le même lancement, `dist/` absent, passe.

## 4. Décisions

- 2026-11-13 : correction en fiche, lancée en tête de file, avant les fiches P0 (elle débloque la fusion de la PR
  #416 qui les porte).

## 5. Points à trancher

Aucun.

## 6. Increments

- **Lot 1 — compilation et chemins** [IA] : reproduction, script `test:claude:coverage` qui compile d'abord,
  `paths` complétés, `node .githooks/run-checks.mjs` sans échec, `drwil verify --agent` en `GOVERNANCE: PASS`.

## 7. Reprise

- **Dernier état** (2026-11-13) : cadrage terminé.
- **Prochaine étape** : [humain] `/drwil-start`, en premier.

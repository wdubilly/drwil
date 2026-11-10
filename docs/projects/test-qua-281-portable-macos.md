# Projet : le test de la redirection de `drwil serve` (QUA-281) passe sur macOS

**Statut** : cadré le 2026-11-10.
**Risque** : LOW
**Maturité** : prêt

<!-- scope
files:
  - packages/drwil/test/serve.test.mjs
  - docs/projects/pending.md
  - docs/projects/journal.md
-->

## 1. Besoin

La CI des trois systèmes d'exploitation sur `master` (commit `422d034`, 2026-11-10) échoue sur macOS :
le test « QUA-281 : la redirection est refusée sans jeton valide » (`packages/drwil/test/serve.test.mjs`,
ligne 1730) démarre `drwil serve` sur `--host 127.0.0.2` et s'y connecte ; macOS ne fournit que
`127.0.0.1` par défaut (`listen EADDRNOTAVAIL: address not available 127.0.0.2`). Windows et Ubuntu ont
été annulés par cet échec, sans verdict. Tant que les trois systèmes ne sont pas verts sur le commit,
la barrière `release.requiredOs` refuse la publication de la version 0.11.1
(`docs/recipes/create-a-release.md`).

## Critères d'acceptation

- Le test de la redirection écoute sur `--host 0.0.0.0` (hors de 127.0.0.1, donc le jeton reste
  obligatoire) et s'y connecte par `127.0.0.1` ; il garde ses trois assertions : 401 sans jeton, sans
  adresse de redirection, puis 302 vers `/pull/12` avec le jeton valide — `QUA-281`
- Aucune autre adresse `127.0.0.x` autre que `127.0.0.1` ne reste dans les tests de `drwil serve` — `QUA-281`

Hors critères (geste suivant, lot 2 humain) : la CI trois systèmes, lancée sur `master` après la fusion, doit être
verte ; elle ne se prouve qu'après la fusion.

## 2. Hors périmètre

- Le code de `drwil serve` : aucun changement de comportement.
- La publication de la 0.11.1 : un geste distinct, après la CI verte.

## 3. Contraintes

- Le test se lance seul : `node --test packages/drwil/test/serve.test.mjs` (filtre sur « QUA-281 »).
- Jamais de contrôle sauté pour faire passer macOS.

## 4. Décisions

Tranchées par le demandeur le 2026-11-10 : corriger le test (écoute `0.0.0.0`, connexion `127.0.0.1`) plutôt
que sauter le test sous macOS ; les tests voisins du même fichier (lignes 335-391) écoutent déjà sur
`0.0.0.0` avec jeton sur les trois systèmes.

## 5. Points à trancher

Aucun.

## 6. Increments

- **Lot 1 — test portable** [IA] : modifier le test, le lancer, `GOVERNANCE: PASS`. Critère de sortie : le
  test et ses voisins verts en local, PR fusionnée.
- **Lot 2 — vérification et publication** [humain] : CI trois systèmes sur `master`, puis la release.

## 7. Reprise

- **Dernier état** (2026-11-10) : lot 1 réalisé et commité (test portable, `packages/drwil/test/serve.test.mjs` : 60 tests verts) ; clôture en cours.
- **Prochaine étape** : [humain] lot 2 — CI trois systèmes sur `master` après la fusion, puis la release 0.11.1.

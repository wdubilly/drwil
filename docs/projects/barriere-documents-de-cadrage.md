# Projet : les documents produits en cadrage passent la barrière en SCOPING

**Statut** : cadré le 2026-10-17.
**Intention** : `docs/intentions/barriere-documents-de-cadrage.md`
**Risque** : HIGH
**Maturité** : prêt

<!-- scope
files:
  - packages/drwil/templates/common/base/.githooks/scope-gate.mjs
  - .githooks/scope-gate.mjs
  - .githooks/scope-gate.test.mjs
  - docs/contracts.md
  - docs/decouverte-valeur.md
  - packages/drwil/CHANGELOG.md
  - packages/drwil/templates/common/base/docs/ia-first.md
  - docs/ia-first.md
-->

(cadrage : la barrière de périmètre (gabarit, copie, test), le registre
(QUA-035 évolue), le document de découverte de valeur gardé en stash, le
changelog.)

## 1. Besoin

Le 2026-10-17, le commit de `docs/decouverte-valeur.md`, sortie de la
recette de découverte de valeur, a été refusé en SCOPING : « 1 fichier(s)
hors fiches commité(s) en SCOPING : seule l'activité BUILD l'autorise ».
Les recettes de cadrage (découverte de valeur, audit de risques)
analysent et proposent sans code : leur sortie doit être commitable en
cadrage. Le document refusé est gardé dans un stash local nommé
« decouverte-valeur 2026-10-17 (refusé en SCOPING, à commiter avec le
correctif de la barrière) ».

## Critères d'acceptation

- En SCOPING, les sorties des recettes de cadrage — découverte de valeur
  et audit de risques, sous leurs noms français et anglais — se commitent
  comme les fiches ; tout autre fichier hors fiches reste refusé ; même
  règle dans le gabarit livré et dans ce dépôt — `QUA-035`
- La découverte de valeur du 2026-10-17 est commitée depuis son stash —
  `QUA-035`
- Le changelog (« Unreleased ») le dit — `QUA-040`

## Contrats modifiés

- `QUA-035` — ancien critère : la liste des fichiers toujours commitables
  ne compte que les fiches, intentions, attestations et le journal de
  consommation — raison : les sorties des recettes de cadrage s'y
  ajoutent, en liste fixe ; rien n'est retiré (validé le 2026-10-17 par
  le demandeur, sondage de cadrage).

## 2. Hors périmètre

- Un réglage de projet pour cette liste (écarté : liste fixe).
- Le rappel de cadrage côté agent : il ne vise que les fichiers de code.

## 3. Contraintes

- Ne pas affaiblir la barrière : seuls ces noms exacts s'ajoutent, pas un
  motif large sur `docs/`.

## 4. Décisions

- 2026-10-17 (demandeur, sondage) : liste fixe ; même règle partout.

## 5. Lots

- **Lot 1** : test d'abord (sortie de recette refusée en SCOPING), liste,
  QUA-035, `git stash pop` de la découverte de valeur, changelog ; PR.

## 6. Reprise

- **Dernier état** (2026-10-17) : cadré ; rien de commencé.

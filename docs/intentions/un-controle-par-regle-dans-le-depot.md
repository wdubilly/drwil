# Intention : un contrôle par règle dans le dépôt drwil

**Statut** : proposée le 2026-10-16 — retour d'expérience du chantier
« lien contrat ↔ test » (`docs/projects/journal.md`).

**Projet** : DRWIL — dépôt seulement (le livrable enseigne déjà la règle).

## Besoin

Le livrable enseigne désormais « un contrôle par règle métier, filtré par
l'ID » (QUA-030, contrôle partagé signalé non attribuable). Ce dépôt ne
l'applique pas à lui-même : quand un test casse, `drwil verify` doit
désigner le contrat touché, pas une liste de treize contrats. Le dépôt doit
éprouver ce qu'il livre.

## Existant (vérifié le 2026-10-16)

- `couverture-tests` (tests du paquet et seuil de couverture) est cité par
  13 contrats, `couverture-hooks` (tests des hooks et couverture) par 6.
  Éprouvé dans une copie jetable : un seul test cassé de QUA-016 (rappel
  de cadrage) fait échouer les 13 contrats, chacun avec le message
  « couverture-tests est partagé par QUA-013, QUA-015… : échec non
  attribuable ».
- Chaque test du dépôt commence déjà par l'ID du contrat qu'il protège
  (« QUA-016 : … »), vérifié par `tests-contrats`
  (`outils/verifier-tests-contrats.mjs`) : filtrer par l'ID est possible
  sans renommer un seul test.
- `node --test --test-name-pattern="QUA-016"` sélectionne ces tests ; la
  couverture, elle, n'a de sens que sur la suite complète.

## Questions à trancher

- [décision] Un contrôle par contrat (`tests-qua-016`…, lancé avec
  `--test-name-pattern`), ou un seul contrôle qui rejoue tout et attribue
  l'échec par le nom des tests en échec (écarté pour le livrable le
  2026-10-16, mais le dépôt n'a qu'un lanceur, `node --test`) ?
- [décision] Coût : la suite rejouée une fois par contrat allonge `drwil
  verify` ; accepter, ou ne garder les contrôles par contrat que pour verify
  et la CI ?
- [décision] La couverture (QUA-004, seuil de couverture) reste-t-elle un
  contrôle à part, cité par QUA-004 seul ?
- [décision] Priorité dans l'index.

## Liens

- `docs/projects/journal.md`, « Intention close : la non-régression
  métier » : l'intention d'origine.
- `docs/recipes/adopt-the-kit.md`, étape 5 : la règle enseignée aux
  utilisateurs.

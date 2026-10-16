# Projet : un contrôle par règle dans le dépôt drwil

**Statut** : cadré le 2026-10-16.
**Risque** : HIGH
**Maturité** : prêt

<!-- scope
files:
  - .drwil/ia-first.json
  - docs/contracts.md
  - outils/verifier-tests-contrats.mjs
  - outils/verifier-tests-contrats.test.mjs
-->

(cadrage : dépôt seulement ; la déclaration des contrôles, le registre et
l'outil `tests-contrats`. Les attestations humaines échappent au cadrage.)

## 1. Besoin

Intention : `docs/intentions/un-controle-par-regle-dans-le-depot.md`. Le
livrable enseigne « un contrôle par règle métier, filtré par l'ID »
(QUA-030, contrôle partagé signalé non attribuable). Ce dépôt ne
l'applique pas : `couverture-tests` est cité par 13 contrats et
`couverture-hooks` par 6, si bien qu'un seul test cassé fait échouer
jusqu'à 13 contrats, chacun avec le message « échec non attribuable ». Le
dépôt doit éprouver ce qu'il livre.

## Critères d'acceptation

(contrat à créer par ce chantier : l'ID est posé dans le même commit que
le contrat, `check-docs` refusant de citer un contrat absent du registre.)

- Chaque contrat qui cite des tests cite son propre contrôle
  (`tests-<id>`), qui ne rejoue que les fichiers de son champ Tests
  filtrés par son ID ; `tests-contrats` refuse un contrat à Tests qui ne le
  cite pas : un test cassé fait échouer ce seul contrat — contrat à créer
- La couverture n'est plus citée que par QUA-004 (seuil de couverture) —
  `QUA-004`

## Contrats modifiés

(champ Contrôle seulement, la règle ne change pas : chacun remplace
`couverture-tests` / `couverture-hooks` par son propre contrôle,
`tests-qua-NNN`.)

- `QUA-013` — ancien critère : « Contrôle `ci-coverage`, `couverture-tests`, `couverture-hooks` » — raison : un contrôle par règle (validé le 2026-10-16)
- `QUA-015` — ancien critère : « Contrôle `docs-references`, `couverture-tests` » — raison : idem (validé le 2026-10-16)
- `QUA-016` — ancien critère : « Contrôle `docs-references`, `couverture-tests` » — raison : idem (validé le 2026-10-16)
- `QUA-017` — ancien critère : « Contrôle `main-branch`, `couverture-tests` » — raison : idem (validé le 2026-10-16)
- `QUA-021` — ancien critère : « Contrôle `couverture-hooks`, `couverture-tests` » — raison : idem (validé le 2026-10-16)
- `QUA-022` — ancien critère : « Contrôle `couverture-tests` » — raison : idem (validé le 2026-10-16)
- `QUA-023` — ancien critère : « Contrôle `couverture-tests`, `couverture-hooks` » — raison : idem (validé le 2026-10-16)
- `QUA-024` — ancien critère : « Contrôle `couverture-tests` » — raison : idem (validé le 2026-10-16)
- `QUA-025` — ancien critère : « Contrôle `couverture-tests` » — raison : idem (validé le 2026-10-16)
- `QUA-026` — ancien critère : « Contrôle `couverture-tests` » — raison : idem (validé le 2026-10-16)
- `QUA-027` — ancien critère : « Contrôle `couverture-tests` » — raison : idem (validé le 2026-10-16)
- `QUA-028` — ancien critère : « Contrôle `docs-references`, `couverture-hooks` » — raison : idem (validé le 2026-10-16)
- `QUA-029` — ancien critère : « Contrôle `contract-tests`, `couverture-hooks` » — raison : idem (validé le 2026-10-16)
- `QUA-030` — ancien critère : « Contrôle `couverture-tests` » — raison : idem (validé le 2026-10-16)
- `QUA-031` — ancien critère : « Contrôle `couverture-tests` » — raison : idem (validé le 2026-10-16)

## 2. Hors périmètre

- Attribuer l'échec par le nom des tests en échec d'un seul passage (non
  retenu le 2026-10-16 : le dépôt ferait autrement que ce qu'il enseigne).
- Un réglage « verify seulement » dans le moteur (non retenu le
  2026-10-16).
- Le livrable : il enseigne déjà la règle (recette d'adoption, étape 5).

## 3. Contraintes

- Un filtre qui ne sélectionne aucun test passe en silence
  (`node --test --test-name-pattern` sur zéro test sort en 0) : la garde
  est `tests-contrats` (`outils/verifier-tests-contrats.mjs`), qui exige
  que chaque fichier cité porte au moins un test au nom commençant par
  l'ID du contrat.
- Les tests du paquet exigent `dist/` : le contrôle d'un contrat qui cite
  `packages/drwil/test/` construit d'abord (`tsc --build`, incrémental).
- Chaque nouveau contrôle déclare `ciJob` et `paths` (QUA-013, un
  contrôle non exécuté n'est pas passé : couverture CI vérifiée).
- QUA-013 et QUA-015 ont une part humaine : retirer un contrôle de leur
  preuve rend leur attestation obsolète, même depuis le chantier
  « Attestation sans friction inutile » (QUA-032 : seul un ajout est
  toléré). Prévoir deux
  attestations humaines à la clôture.
- Contrats à citer : QUA-018 (dépôt vs livrable), QUA-030, QUA-004.

## 4. Décisions

Tranchées par le demandeur le 2026-10-16 (sondage) :

- Un contrôle par contrat (`tests-qua-NNN`), qui ne rejoue que les fichiers
  de son champ Tests, filtrés par l'ID.
- Lancés partout (hooks, CI, verify), comme tout contrôle ; la couverture
  (`couverture-tests`, `couverture-hooks`) n'est plus citée que par QUA-004.

## 5. Points à trancher

Aucun.

## 6. Increments

- **Lot 1 — contrôles par contrat** [IA] : déclarer dans
  `.drwil/ia-first.json` un contrôle `tests-qua-NNN` par contrat de la
  liste ci-dessus (id, name, run filtré par l'ID sur ses fichiers Tests,
  ciJob, paths) ; chaque contrat le cite à la place de la couverture.
  `tests-contrats` (`outils/verifier-tests-contrats.mjs`) refuse un
  contrat à Tests qui ne cite pas `tests-<id>` ; contrat créé. Critère de
  sortie : `node .githooks/run-checks.mjs` vert ; dans une copie jetable,
  un test cassé de QUA-016 fait échouer QUA-016 seul, sans message de
  contrôle partagé ; `drwil verify` évalue chaque critère prouvé.
- **Lot 2 — attestations** [humain] : réattester QUA-013 et QUA-015.
  Critère de sortie : `GOVERNANCE: PASS`.

## 7. Reprise

- **Dernier état** (2026-10-16) : fiche cadrée ; aucun code écrit.
- **Travail non commité** : aucun.
- **Prochaine étape** : [humain] lancer le chantier (`/drwil-start`).

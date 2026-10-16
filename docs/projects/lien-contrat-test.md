# Projet : lien contrat ↔ test, échec attribué à la bonne règle

**Statut** : cadré le 2026-10-16.
**Risque** : HIGH
**Maturité** : prêt

<!-- scope
files:
  - packages/drwil/templates/common/base/.githooks/check-contract-tests.mjs
  - packages/drwil/templates/common/base/.githooks/contracts.mjs
  - packages/drwil/templates/common/base/.githooks/engine.mjs
  - packages/drwil/templates/common/base/docs/contracts.md
  - packages/drwil/templates/common/base/docs/recipes/adopt-the-kit.md
  - .githooks/check-contract-tests.mjs
  - .githooks/check-contract-tests.test.mjs
  - .githooks/contracts.mjs
  - .githooks/contracts.test.mjs
  - .githooks/engine.mjs
  - .githooks/engine.test.mjs
  - docs/recipes/adopt-the-kit.md
  - packages/drwil/src/verify.ts
  - packages/drwil/test/kit.test.mjs
  - packages/drwil/test/cycle.test.mjs
  - docs/contracts.md
-->

(cadrage : chaque fichier du gabarit avec sa copie du dépôt et son test ;
les copies se régénèrent par `npm run installer-depot`, QUA-018 (dépôt vs
livrable).)

## 1. Besoin

Intention : `docs/intentions/non-regression-metier.md`, points 1 et 2.
Une règle métier n'est une non-régression que si l'échec de son test
bloque **et désigne la bonne règle**. Aujourd'hui, chez l'utilisateur :

- rien ne vérifie que le test qui prouve un contrat métier existe encore
  et porte son ID (le contrôle `tests-contrats` n'existe que dans ce
  dépôt) ;
- un contrôle partagé par plusieurs contrats (typiquement un seul
  `npm test`) fait échouer tous ces contrats à la fois : verify bloque,
  mais peut désigner APP-001 alors que c'est APP-002 qui est cassé.

## Critères d'acceptation

(contrats à créer par ce chantier : leur ID est posé dans le même commit
que le contrat, `check-docs` refusant de citer un contrat absent du
registre.)

- Un contrat dont le champ Tests cite un fichier absent, ou un fichier qui
  ne porte pas son ID, est signalé (bloquant si `newRequirements` vaut
  `blocking`, avertissement sinon) — contrat à créer
- Quand un contrôle cité par plusieurs contrats échoue, verify le dit
  (« contrôle partagé par APP-001, APP-002 : échec non attribuable, un
  contrôle par règle ») au lieu de l'imputer sans réserve à chacun —
  contrat à créer
- Le registre livré et la recette d'adoption enseignent un contrôle par
  règle métier, qui filtre ses tests par l'ID (`npm test -- -t "APP-002"`,
  `pytest -k`, `go test -run`) — contrat à créer (le même que le critère
  précédent)
- Dans ce dépôt, chaque contrat cite le contrôle qui rejoue ses tests :
  un test cassé fait échouer son contrat, pas seulement d'autres — prouvé
  par les contrats modifiés ci-dessous (`couverture-tests`,
  `couverture-hooks`)

## Contrats modifiés

(champ Contrôle seulement, la règle ne change pas : chacun ajoute le
contrôle qui rejoue réellement ses Tests.)

- `QUA-013` — ancien critère : « Contrôle `ci-coverage` » — raison : ses
  tests (`packages/drwil/test/kit.test.mjs`, `.githooks/run-checks.test.mjs`)
  sont rejoués par `couverture-tests` et `couverture-hooks`, qu'il ne cite
  pas (validé le 2026-10-16)
- `QUA-015` — ancien critère : « Contrôle `docs-references` » — raison :
  son test (`packages/drwil/test/kit.test.mjs`) est rejoué par
  `couverture-tests` (validé le 2026-10-16)
- `QUA-016` — ancien critère : « Contrôle `docs-references` » — raison :
  son test (`packages/drwil/test/kit.test.mjs`) est rejoué par
  `couverture-tests` (validé le 2026-10-16)
- `QUA-017` — ancien critère : « Contrôle `main-branch` » — raison : son
  test (`packages/drwil/test/kit.test.mjs`) est rejoué par
  `couverture-tests` (validé le 2026-10-16)
- `QUA-028` — ancien critère : « Contrôle `docs-references` » — raison :
  ses tests (`.githooks/contracts.test.mjs`, `.githooks/check-docs.test.mjs`)
  sont rejoués par `couverture-hooks` (validé le 2026-10-16)

## 2. Hors périmètre

- La vue des règles métier (point 3 de l'intention, décidé « dans verify
  d'abord » : chantier suivant).
- La recette « demander une bonne pratique hors adoption » (point 4).
- L'analyse de la sortie des lanceurs de tests pour retrouver les ID en
  échec (non retenu le 2026-10-16 : un analyseur par outil, fragile).
- Un contrôle qui vérifie que le Contrôle d'un contrat rejoue bien ses
  Tests (option non retenue le 2026-10-16) : le décalage du dépôt est
  corrigé à la main, lot 3.
- Le contrôle `tests-contrats` du dépôt (`outils/verifier-tests-contrats.mjs`),
  plus strict (lien dans les deux sens, par nom de test JavaScript) : il
  reste propre au dépôt.

## 3. Contraintes

- Gabarit d'abord, puis copie du dépôt (QUA-018) ; un projet déjà installé
  ne casse pas : réglage `newRequirements` de `.drwil/ia-first.json`, comme
  QUA-028 (un ID à un seul endroit).
- Indépendant de la pile : la vérification du lien ne lit pas les noms de
  test, seulement l'existence du fichier cité et la présence de l'ID dans
  son texte.
- `packages/drwil/templates/common/base/.githooks/check-docs.mjs` est à 398 lignes (QUA-001, plafond 400) : la
  vérification du lien vit dans un script à part, déclaré comme contrôle du
  moteur.
- Le registre livré est en anglais (champ `**Tests**`), celui du dépôt en
  français : le lecteur de contrats lit les deux.
- Contrats à citer : DRWIL-003 (verify, porte de validation), QUA-022
  (preuve d'un critère laissée au registre), QUA-024 (premier contrat
  métier), QUA-011 (doc jamais fausse).

## 4. Décisions

Tranchées par le demandeur le 2026-10-16 (sondage) :

- Attribution : un contrôle par règle métier, filtré par l'ID dans le nom
  du test ; verify signale l'ambiguïté d'un contrôle partagé qui échoue.
- Lien contrat ↔ test : livré dans le gabarit, bloquant ou avertissement
  selon `newRequirements`.
- Découpage : points 1 et 2 dans ce chantier, en `[P1]` ; la vue des
  règles métier, dans verify, viendra ensuite.
- Le décalage du dépôt (QUA-013, QUA-015, QUA-016, QUA-017, QUA-028 :
  tests rejoués par un contrôle que le contrat ne cite pas) est corrigé
  dans ce chantier, lot 3 : le dépôt éprouve ce qu'il livre.

## 5. Points à trancher

Aucun.

## 6. Increments

- **Lot 1 — lien contrat ↔ test** [IA] : le lecteur de contrats lit le
  champ Tests (`Tests` / `**Tests**`) ; un nouveau script, check-contract-tests.mjs,
  signale un fichier cité absent ou sans l'ID du contrat ; le moteur le
  déclare (`contract-tests`), bloquant ou avertissement selon
  `newRequirements`. Critère de sortie : un test par cas, en français et
  en anglais ; contrat créé dans `docs/contracts.md`.
- **Lot 2 — contrôle partagé** [IA] : verify repère un contrôle en échec
  cité par plusieurs contrats et le dit dans les raisons de chacun ; le
  registre livré (APP-001) et la recette d'adoption enseignent un contrôle
  par règle et le champ Tests. Critère de sortie : test de cycle avec deux
  contrats sur un même contrôle en échec ; contrat créé ; `drwil verify`
  évalue chaque critère prouvé.
- **Lot 3 — décalage du dépôt** [IA] : ajouter au champ Contrôle de
  QUA-013, QUA-015, QUA-016, QUA-017 et QUA-028 le contrôle qui rejoue
  leurs Tests (`couverture-tests`, `couverture-hooks`). Critère de sortie :
  un test de chacun cassé dans une copie jetable fait échouer ce contrat
  dans `drwil verify`, avec le message de contrôle partagé du lot 2 ;
  QUA-023 (régression ou évolution d'un contrat) accepte les cinq
  modifications déclarées.

## 7. Reprise

- **Dernier état** (2026-10-16) : fiche cadrée ; aucun code écrit.
- **Travail non commité** : aucun.
- **Prochaine étape** : [humain] lancer le chantier (`/drwil-start`).

# Projet : critères d'acceptation obligatoires, capitalisés en contrats

**Statut** : cadré le 2026-10-16.
**Risque** : HIGH
**Maturité** : prêt

<!-- scope
files:
  - packages/drwil/templates/common/base/.githooks/state.mjs
  - packages/drwil/templates/common/base/.githooks/state-texts.mjs
  - packages/drwil/templates/common/base/.githooks/briefs.mjs
  - packages/drwil/templates/common/base/docs/projects/model-brief.md
  - packages/drwil/templates/common/base/docs/ia-first.md
  - .githooks/state.mjs
  - .githooks/state-texts.mjs
  - .githooks/briefs.mjs
  - .githooks/state.test.mjs
  - packages/drwil/src/criteria.ts
  - packages/drwil/src/verify.ts
  - packages/drwil/test/kit.test.mjs
  - packages/drwil/test/cycle.test.mjs
  - docs/projects/model-brief.md
  - docs/ia-first.md
  - docs/contracts.md
-->

(cadrage : chaque fichier du gabarit avec sa copie du dépôt et ses tests ;
les copies se régénèrent par `npm run installer-depot`, QUA-018 (dépôt vs
livrable).)

## 1. Besoin

Décidé par le demandeur le 2026-10-16 : chaque chantier doit laisser sa
non-régression. Toute fiche de chantier a des critères d'acceptation ;
chaque critère est prouvé par un contrat du registre, créé ou réutilisé,
donc rejoué à chaque commit, à chaque verify et en CI ; un contrat créé
par un chantier dit de quel chantier et de quel critère il vient (champ
Origine), et apparaît ainsi dans le bilan des règles métier (QUA-031).

Aujourd'hui, trois trous : une fiche qui n'est pas « prête » se lance et
se clôt sans critères (QUA-021, simple avertissement) ; un critère lié
directement à un contrôle est jugé prouvé (`evaluateCriteria`,
`packages/drwil/src/criteria.ts`), alors que la règle de QUA-022 dit déjà
qu'un critère sans contrat est refusé (le code ne tient pas la promesse du
contrat) ; rien n'impose le champ Origine.

## Critères d'acceptation

- Une fiche de chantier sans critère d'acceptation ne peut pas être lancée
  (`state.mjs start`, `/drwil-start`) ni close ; bloquant si
  `newRequirements` vaut `blocking`, avertissement sinon — `QUA-021`
- Un critère lié directement à un contrôle, sans contrat, n'est pas prouvé :
  la clôture est refusée — `QUA-022`
- Un contrat créé par le chantier (classé « créé » contre la base de la
  branche) sans champ Origine n'est pas une preuve durable : la clôture est
  refusée — `QUA-022`
- Un critère de jugement humain reste permis : marqué `[humain]`, prouvé
  par un contrat à champ Manuel, attesté (`drwil attest`) — `QUA-022`

## Contrats modifiés

- `QUA-021` — ancien critère : « Une fiche de chantier déclarée « prête » (`**Maturité**`) a au moins un critère d'acceptation ; une fiche sans critères qui n'est pas « prête » peut être close, avec un avertissement » — raison : toute fiche de chantier a des critères, quelle que soit sa maturité, vérifiés au lancement et à la clôture (validé le 2026-10-16)
- `QUA-022` — ancien critère : « Un critère d'acceptation est prouvé par un contrat du registre avec un contrôle rejouable (ou un contrat Manuel attesté pour un jugement humain) ; un critère sans contrat est refusé à la clôture » — raison : un contrat créé par un chantier porte obligatoirement le champ Origine ; la règle est inchangée sur le reste, le code est aligné sur elle (validé le 2026-10-16)

## 2. Hors périmètre

- L'entretien courant (`docs/projects/routine-maintenance.md`, risque LOW) :
  il n'a pas de critères, n'étant pas une fiche de chantier lancée.
- Imposer le préfixe `APP` à un contrat né d'un critère (non retenu le
  2026-10-16 : une règle technique reste `QUA`).
- Écrire les critères des fiches ouvertes qui n'en ont pas (`mini-banc`,
  `ci-matrice-sur-pr`, `drwil-v0-2-gouvernance-executable`,
  `entretien-sous-barriere-bloquante`, `adopter-seuil-couverture`…) : à
  faire avant le lancement de chacune.
- Faire changer le verdict de verify par un critère non prouvé (question 1
  de `docs/intentions/preuve-des-criteres-visible.md`, encore ouverte).
- Juger si un test éprouve vraiment sa règle (jugement humain).

## 3. Contraintes

- Livrable et dépôt : un projet déjà équipé ne casse pas — le refus au
  lancement suit `newRequirements` (bloquant pour les nouvelles
  installations, avertissement ailleurs), comme QUA-028 et QUA-029.
- `.githooks/check-docs.mjs` est à 398 lignes (QUA-001, plafond 400) : la
  règle vit dans `.githooks/state.mjs` (lancement, clôture) et dans
  `packages/drwil/src/criteria.ts` (preuve), pas dans check-docs.
- La clôture lit l'évidence de verify : un critère sans contrat ou un
  contrat créé sans Origine y apparaît non prouvé, et la clôture le refuse
  par le chemin existant.
- Contrats à citer : QUA-021, QUA-022, QUA-023 (régression ou évolution
  d'un contrat), QUA-031 (bilan des règles métier), QUA-018.

## 4. Décisions

Tranchées par le demandeur le 2026-10-16 (sondage) :

- Obligation : toute fiche de chantier (risque MEDIUM ou HIGH), quelle que
  soit sa maturité ; l'entretien courant en est exempt.
- Preuve : toujours un contrat, créé ou réutilisé, jamais un contrôle seul ;
  un refactor réutilise les contrats existants.
- Contrat créé : champ Origine obligatoire ; préfixe libre (`APP` pour une
  règle métier, `QUA` pour une règle technique).
- Jugement humain : permis, par un contrat Manuel attesté.

## 5. Points à trancher

Aucun.

## 6. Increments

- **Lot 1 — critères obligatoires** [IA] : `state.mjs start` refuse une
  fiche sans critère (avertit hors `newRequirements: blocking`) ; la
  clôture refuse une fiche sans critère, quelle que soit sa maturité ;
  modèle de fiche et doc livrée mis à jour. Critère de sortie : tests
  (avec et sans critères, bloquant et avertissement, français et anglais).
- **Lot 2 — preuve par contrat** [IA] : `evaluateCriteria` ne juge plus
  prouvé un critère lié à un contrôle seul ; un contrat « créé » sans
  champ Origine n'est pas une preuve durable. Critère de sortie : tests
  (contrôle seul refusé, contrat créé sans Origine refusé, avec Origine
  accepté, contrat réutilisé accepté sans Origine).
- **Lot 3 — contrats** [IA] : QUA-021 et QUA-022 mis à jour (déclarés
  ci-dessus). Critère de sortie : `drwil verify` évalue chaque critère
  prouvé.

## 7. Reprise

- **Dernier état** (2026-10-16) : fiche cadrée ; aucun code écrit.
- **Travail non commité** : aucun.
- **Prochaine étape** : [humain] lancer le chantier (`/drwil-start`).

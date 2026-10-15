# Projet : cohérence des ID de contrat entre registre et catalogue

**Statut** : cadré le 2026-10-15 — décisions tranchées, à lancer.
**Risque** : HIGH
**Maturité** : prêt

<!-- scope
files:
  - packages/drwil/templates/common/base/.githooks/contracts.mjs
  - packages/drwil/templates/common/base/.githooks/check-docs.mjs
  - packages/drwil/templates/common/base/docs/contracts-catalog.md
  - .githooks/contracts.mjs
  - .githooks/check-docs.mjs
  - .githooks/contracts.test.mjs
  - .githooks/check-docs.test.mjs
  - packages/drwil/test/kit.test.mjs
  - docs/contracts.md
  - docs/contracts-catalog.md
-->

(cadrage : chaque fichier du gabarit avec sa copie du dépôt et son test ;
les copies se régénèrent par `npm run installer-depot`, QUA-018.)

## 1. Besoin

Un ID de contrat peut aujourd'hui être défini à la fois dans le registre
(`docs/contracts.md`) et dans le catalogue (`docs/contracts-catalog.md`),
sans que rien ne le signale. Or un contrat adopté depuis le catalogue garde
son ID et doit quitter le catalogue. Deux cas réels : le chantier
« capitaliser les non-régressions » (journal du 2026-10-15) a failli créer
un ID déjà pris par `catalogue:QUA-020` (tests e2e) ; ce dépôt définit
SEC-001 dans son registre et dans son catalogue, avec deux règles
différentes. `check-docs` ne vérifie l'unicité qu'à l'intérieur du registre.

## Critères d'acceptation

(contrat à créer par ce chantier : l'ID est posé dans le même commit que le
contrat, `check-docs` refusant de citer un contrat absent du registre.)

- Un ID défini à la fois dans le registre et dans le catalogue, ou deux
  fois dans le catalogue, est signalé par `check-docs` — contrat à créer

## 2. Hors périmètre

- La stabilité d'un ID retiré puis réattribué (non retenu le 2026-10-15).
- Le contenu des contrats du catalogue, hors le doublon SEC-001.

## 3. Contraintes

- Gabarit d'abord, puis copie du dépôt (QUA-018) ; un projet déjà installé
  ne doit pas casser : bloquant pour les nouvelles installations,
  avertissement ailleurs (réglage `newRequirements` de
  `.drwil/ia-first.json`, comme les autres exigences récentes).
- `.githooks/check-docs.mjs` est à 399 lignes (QUA-001, plafond 400) : la lecture du
  catalogue et la comparaison vivent dans `.githooks/contracts.mjs`.
- Le catalogue écrit ses ID `catalogue:XXX-NNN` (dépôt, français) ou
  `catalog:XXX-NNN` (gabarit, anglais) en première colonne d'un tableau :
  lire les deux.
- Contrats à citer : QUA-011 (doc jamais fausse : IDs définis une seule
  fois), QUA-018 (dépôt vs livrable).

## 4. Décisions

Tranchées par le demandeur le 2026-10-15 (sondage) :

- Règles : un ID n'est jamais à la fois dans le registre et dans le
  catalogue ; un ID est défini une seule fois dans le catalogue.
- Périmètre : livrable et dépôt, dans `check-docs` du gabarit.
- SEC-001 (2026-10-15, sondage) : renuméroter la ligne du catalogue du
  dépôt, qui devient `catalogue:SEC-013` (premier ID libre au-delà de tous
  ceux du registre et des catalogues) ; les deux règles restent, chacune
  avec son ID ; le registre ne change pas. Le catalogue du gabarit n'est
  pas touché (son registre n'a pas de SEC-001).

## 5. Points à trancher

(aucun.)

## 6. Increments

- **Lot 1 — lecture et comparaison** [IA] : `.githooks/contracts.mjs` lit les ID du
  catalogue (deux préfixes) et signale doublon catalogue et chevauchement
  registre/catalogue ; `check-docs` les rapporte (bloquant ou avertissement
  selon `newRequirements`). Critère de sortie : un test par cas, en
  français et en anglais.
- **Lot 2 — SEC-001 et contrat** [IA] : renuméroter `catalogue:SEC-001`
  en `catalogue:SEC-013` dans `docs/contracts-catalog.md` ;
  créer le contrat de cette règle dans `docs/contracts.md` (Contrôle
  `docs-references`, Origine, Tests) et poser son ID dans les critères.
  Critère de sortie : `check-docs` vert sur ce dépôt, `drwil verify`
  évalue le critère prouvé.

## 7. Reprise

- **Dernier état** (2026-10-15) : fiche cadrée, décisions tranchées ; aucun
  code écrit.
- **Travail non commité** : aucun.
- **Prochaine étape** : [humain] lancer le chantier (`/drwil-start`).

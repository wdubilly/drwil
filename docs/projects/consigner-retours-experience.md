# Projet : consigner les retours d'expérience en intentions à la clôture

**Statut** : cadré le 2026-10-15 — décisions tranchées, à lancer.
**Risque** : HIGH
**Maturité** : prêt

<!-- scope
files:
  - packages/drwil/templates/common/base/AGENTS.md
  - packages/drwil/templates/common/base/docs/recipes/working-with-branches.md
  - packages/drwil/templates/common/base/.githooks/state-texts.mjs
  - .githooks/state-texts.mjs
  - .githooks/state.test.mjs
  - packages/drwil/test/kit.test.mjs
  - AGENTS.md
  - docs/recipes/working-with-branches.md
-->

(cadrage : chaque fichier du gabarit avec sa copie du dépôt et son test ;
les copies se régénèrent par `npm run installer-depot`, QUA-018.)

## 1. Besoin

Demandé le 2026-10-15 : à la clôture d'un chantier, les limites relevées,
ce qui a été laissé de côté sans être contourné, ne doivent pas rester dans
un compte rendu de conversation ou une ligne du journal. L'agent est
autorisé à les consigner lui-même en **fiches d'intention**
(`docs/intentions/`), uniquement en intention : les recadrer en chantier
reste une décision du demandeur. Premier exemple fait à la main le
2026-10-15 : quatre intentions issues du chantier « capitaliser les
non-régressions ».

## Critères d'acceptation

(contrat à créer par ce chantier, ID posé dans le même commit que lui.)

- À la clôture, le rappel d'activité et la recette demandent de consigner
  chaque limite non traitée en fiche d'intention, jamais en fiche de
  chantier — contrat à créer

## 2. Hors périmètre

- Recadrer une intention en chantier (décision humaine, inchangée).
- Juger automatiquement si une limite mérite une intention.

## 3. Contraintes

- Livrable et dépôt (décision du 2026-10-15, sondage) : `AGENTS.md` et la
  recette du gabarit d'abord, puis leurs copies (QUA-018).
- Une intention suit la forme contrôlée (QUA-015) : Statut daté, Besoin,
  Existant, Questions à trancher ; listée une fois dans l'index avec le
  marqueur `[décision]`.
- Contrats à citer : QUA-015 (chantiers exploitables à froid), QUA-018
  (dépôt vs livrable).

## 4. Décisions

Tranchées par le demandeur le 2026-10-15 (sondage) :

- L'agent est autorisé à créer seul des fiches d'intention pour les limites
  d'un chantier ; jamais une fiche de chantier.
- Périmètre : livrable et dépôt.
- Moment (2026-10-15, sondage) : à la clôture seulement (CLOSING), avec le
  journal, quand les limites sont connues et stables.
- Granularité : une intention par limite, recadrée ou abandonnée seule.
- Journal : chaque limite de « Limites connues » renvoie à sa fiche
  d'intention.

## 5. Points à trancher

(aucun.)

## 6. Increments

- **Lot 1 — règle et recette** [IA] : règle de conduite dans `AGENTS.md`,
  étape de clôture dans la recette des branches (une intention par limite,
  listée dans l'index en `[décision]`, citée depuis « Limites connues » du
  journal), rappel dans le texte de l'activité CLOSING. Critère de sortie : un test sur le rappel de
  clôture, en français et en anglais.
- **Lot 2 — contrat** [IA] : contrat de cette règle dans
  `docs/contracts.md`, ID posé dans les critères. Critère de sortie :
  `drwil verify` évalue le critère prouvé.

## 7. Reprise

- **Dernier état** (2026-10-15) : fiche cadrée, décisions tranchées ; aucun
  code écrit.
- **Travail non commité** : aucun.
- **Prochaine étape** : [humain] lancer le chantier (`/drwil-start`).

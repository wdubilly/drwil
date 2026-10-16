# Projet : la clôture boucle les intentions (retours d'expérience, intention d'origine)

**Statut** : cadré le 2026-10-15, étendu le 2026-10-16 — décisions tranchées, à lancer.
**Risque** : HIGH
**Maturité** : prêt

<!-- scope
files:
  - packages/drwil/templates/common/base/AGENTS.md
  - packages/drwil/templates/common/base/docs/recipes/working-with-branches.md
  - packages/drwil/templates/common/base/.githooks/state-texts.mjs
  - packages/drwil/templates/common/base/.githooks/briefs.mjs
  - packages/drwil/templates/common/base/.githooks/run-checks.mjs
  - packages/drwil/templates/common/base/docs/projects/model-brief.md
  - packages/drwil/templates/common/base/docs/intentions/README.md
  - .githooks/state-texts.mjs
  - .githooks/briefs.mjs
  - .githooks/run-checks.mjs
  - .githooks/state.test.mjs
  - .githooks/run-checks.test.mjs
  - docs/projects/model-brief.md
  - docs/intentions/README.md
  - docs/contracts.md
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

Étendu le 2026-10-16 (demandeur) : la boucle doit aussi se fermer dans
l'autre sens. Deux intentions entièrement réalisées
(`livrable-full-english`, `non-regression-continue`) sont restées
ouvertes plusieurs jours, et cinq autres avaient un « Existant » devenu
faux : rien ne relie une fiche de chantier à son intention d'origine, la
clôture ne la regarde pas, et rien ne signale un constat qui vieillit
(journal du 2026-10-16, « Intentions closes »).

## Critères d'acceptation

(contrat à créer par ce chantier, ID posé dans le même commit que lui.)

- À la clôture, le rappel d'activité et la recette demandent de consigner
  chaque limite non traitée en fiche d'intention, jamais en fiche de
  chantier — contrat à créer
- Une fiche de chantier déclare son intention d'origine (champ
  `**Intention**`) ; le commit qui supprime la fiche à la clôture est
  averti (sans blocage) s'il ne touche pas cette intention, à mettre à
  jour ou, entièrement couverte, à résumer au journal et retirer — contrat
  à créer (le même)
- Une intention dont la dernière date de revue (Statut, « Revu le … » ou
  « Existant (vérifié le …) ») a 30 jours ou plus est signalée par un
  avertissement non bloquant, comme un audit périmé — contrat à créer (le
  même)

## 2. Hors périmètre

- Recadrer une intention en chantier (décision humaine, inchangée).
- Juger automatiquement si une limite mérite une intention.
- Juger automatiquement si une intention est entièrement couverte : le
  contrôle avertit, l'agent et le demandeur jugent.
- Bloquer la clôture (non retenu le 2026-10-16 : une intention déjà à jour
  forcerait un commit artificiel).

## 3. Contraintes

- Livrable et dépôt (décision du 2026-10-15, sondage) : `AGENTS.md` et la
  recette du gabarit d'abord, puis leurs copies (QUA-018).
- Une intention suit la forme contrôlée (QUA-015) : Statut daté, Besoin,
  Existant, Questions à trancher ; listée une fois dans l'index avec le
  marqueur `[décision]`.
- `.githooks/check-docs.mjs` du gabarit est à 398 lignes (QUA-001, plafond
  400) : la péremption vit dans `.githooks/run-checks.mjs`, à côté du
  rappel d'audit périmé (même seuil de 30 jours) ; la lecture du champ
  Intention et de la dernière date de revue dans `.githooks/briefs.mjs`.
- Le lien à la clôture se juge au commit (pre-commit) : une fiche supprimée
  de l'index git, son champ Intention lu dans HEAD, l'intention cherchée
  parmi les fichiers indexés.
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

Tranchées par le demandeur le 2026-10-16 (sondage) :

- Le nettoyage des intentions couvertes étend ce chantier (même moment,
  mêmes fichiers) plutôt qu'une fiche à part.
- Niveau : un champ `**Intention**` dans la fiche et un avertissement à la
  clôture, sans blocage.
- Péremption : avertissement au-delà de 30 jours sans revue datée.

## 5. Points à trancher

(aucun.)

## 6. Increments

- **Lot 1 — règle et recette** [IA] : règle de conduite dans `AGENTS.md`,
  étape de clôture dans la recette des branches (une intention par limite,
  listée dans l'index en `[décision]`, citée depuis « Limites connues » du
  journal), rappel dans le texte de l'activité CLOSING. Critère de sortie : un test sur le rappel de
  clôture, en français et en anglais.
- **Lot 2 — intention d'origine** [IA] : champ `**Intention**` dans le
  modèle de fiche ; étape de clôture « mettre à jour l'intention d'origine,
  ou la résumer au journal et la retirer si elle est entièrement couverte »
  dans la recette et le rappel CLOSING ; avertissement au commit qui
  supprime une fiche sans toucher son intention. Critère de sortie : tests
  (fiche supprimée avec ou sans son intention, fiche sans champ), en
  français et en anglais.
- **Lot 3 — péremption** [IA] : dernière date de revue d'une intention
  (Statut, « Revu le … », « Existant (vérifié le …) ») ; avertissement à
  30 jours dans `.githooks/run-checks.mjs` ; le README des intentions
  documente la ligne « Revu le ». Critère de sortie : tests (récente,
  périmée, plusieurs dates : la plus récente compte).
- **Lot 4 — contrat** [IA] : contrat de ces règles dans
  `docs/contracts.md`, ID posé dans les critères. Critère de sortie :
  `drwil verify` évalue chaque critère prouvé.

## 7. Reprise

- **Dernier état** (2026-10-16) : fiche étendue au nettoyage des
  intentions, décisions tranchées ; aucun code écrit.
- **Travail non commité** : aucun.
- **Prochaine étape** : [humain] lancer le chantier (`/drwil-start`).

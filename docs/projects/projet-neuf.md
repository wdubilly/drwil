# Projet : un projet neuf commence par son cadrage global, sans couche inventée

**Statut** : cadré le 2026-10-16.
**Risque** : HIGH
**Maturité** : prêt

<!-- scope
files:
  - packages/drwil/src/install.ts
  - packages/drwil/src/config.ts
  - packages/drwil/src/index.ts
  - packages/drwil/src/render.ts
  - packages/drwil/templates/common/layers/generic.md
  - packages/drwil/bin/drwil.js
  - packages/drwil/test/kit.test.mjs
  - packages/drwil/test/cycle.test.mjs
  - packages/drwil/templates/common/base/docs/recipes/adopt-the-kit.md
  - packages/drwil/templates/common/tools/claude/.claude/skills/adopt-the-kit/SKILL.md
  - packages/drwil/templates/common/base/AGENTS.md
  - packages/drwil/templates/common/base/docs/ia-first.md
  - docs/recipes/adopt-the-kit.md
  - docs/contracts.md
  - .drwil/ia-first.json
-->

(cadrage : les fichiers du gabarit couvrent leurs copies du dépôt par le
réglage `scopeMirrors` (QUA-035) ; la recette d'adoption du dépôt est
citée à part par prudence.)

## 1. Besoin

Demandé le 2026-10-16, avant d'essayer drwil sur un vrai projet :

- Dans un répertoire vide, `drwil init` ne détecte aucune pile et retombe
  sur `backend,frontend` (`packages/drwil/src/install.ts`) : il crée deux
  `AGENTS.md` de couche pour un projet qui n'existe pas encore, peut-être
  sans frontend.
- `/drwil-adopt` suppose un projet existant (relire la pile détectée,
  remplir les couches, déclarer les contrôles) : pour un projet neuf, ces
  étapes tournent à vide. Il manque le cadrage global du produit, celui qui
  répond d'abord à quoi, pour qui, quel périmètre, quelle pile, quelles
  premières règles métier, quel niveau de risque.

## Critères d'acceptation

(contrat à créer par ce chantier, avec son champ Origine.)

- Sans pile détectée, `drwil init` n'écrit aucune couche (ni `backend/`
  ni `frontend/`) et le dit ; une pile détectée, ou `--layers`, garde le
  comportement actuel — contrat à créer
- `/drwil-adopt` reconnaît un projet neuf et commence par son cadrage
  global : besoin et utilisateurs, périmètre de la première version, pile
  (d'où les couches, déclarées à ce moment), premières règles métier (d'où
  les premiers contrats APP), niveau de risque ; le résultat va dans
  `AGENTS.md` (« le projet en 5 lignes »), `docs/architecture.md` (la
  carte, tenue ensuite par son contrôle), un premier `README.md` et les
  premières intentions — contrat à créer (le même)
- Une fois la pile choisie, le cadrage déclare les couches (`drwil init
  --layers <couches>`, la détection ne trouvant encore aucun code), ce qui
  crée l'`AGENTS.md` de chaque couche et les instructions par couche des
  outils (Copilot, Cursor) ; il remplit ensuite chaque `AGENTS.md` de
  couche avec les conventions de la pile (structure, commandes de build et
  de test) et déclare les contrôles de cette pile — contrat à créer (le
  même)

## 2. Hors périmètre

- Les questions posées par `init` lui-même (adoption ciblée, fiche 3 du
  catalogue, vague 5) : le cadrage vit dans `/drwil-adopt`.
- Les profils par risque (fiche 2 du catalogue) : le cadrage note le
  niveau de risque, il n'en déduit pas encore les contrats.
- Un projet existant : sa détection et son adoption ne changent pas.

## 3. Contraintes

- Livrable d'abord : ce dépôt n'est pas un projet neuf.
- Un projet déjà installé garde ses couches (`drwil init` relancé lit les
  couches enregistrées).
- La recette reste lisible par tout agent (`docs/recipes/`), la skill
  Claude n'en est qu'un raccourci.
- Chaque choix du cadrage reste une décision du demandeur (sondage ou
  question), jamais de l'agent.
- Contrats à citer : QUA-024 (premier contrat métier d'un dépôt neuf),
  QUA-018 (dépôt vs livrable).

## 4. Décisions

Tranchées par le demandeur le 2026-10-16 (sondage) :

- Sans pile détectée : aucune couche à l'init.
- Le cadrage global d'un projet neuf vit dans `/drwil-adopt`, qui le
  reconnaît et commence par lui.

## 5. Points à trancher

Aucun.

## 6. Increments

- **Lot 1 — pas de couche inventée** [IA] : sans pile détectée, `init`
  n'écrit aucune couche et l'annonce ; aide de la CLI mise à jour. Critère
  de sortie : tests (répertoire vide : aucune couche ; pile détectée et
  `--layers` : inchangés ; projet installé relancé : couches gardées).
- **Lot 2 — cadrage global d'un projet neuf** [IA] : recette d'adoption
  (étape 0 « projet neuf : le cadrer »), skill `/drwil-adopt`, section
  « le projet en 5 lignes » d'`AGENTS.md`, doc livrée ; contrat créé.
  Critère de sortie : test d'installation (recette et skill livrées,
  étape présente).
- **Lot 3 — couches nées du cadrage** [IA] : la recette enchaîne, après
  le choix de la pile, `drwil init --layers` puis le remplissage des
  `AGENTS.md` de couche et la déclaration des contrôles de la pile ; le
  modèle générique de couche guide ce remplissage. Critère de sortie :
  test (répertoire vide, puis `init --layers api,web` : `AGENTS.md` des
  deux couches et instructions par couche créés, configuration à jour) ;
  contrat créé ; `drwil verify` évalue chaque critère prouvé.

## 7. Reprise

- **Dernier état** (2026-10-16) : fiche cadrée ; aucun code écrit.
- **Travail non commité** : aucun.
- **Prochaine étape** : [humain] lancer le chantier (`/drwil-start`).

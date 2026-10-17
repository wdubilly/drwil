# Projet : les hooks trouvent la racine du projet par l'emplacement de leur fichier

**Statut** : cadré le 2026-10-17.
**Intention** : `docs/intentions/hooks-racine-du-projet.md`
**Risque** : HIGH
**Maturité** : prêt

<!-- scope
files:
  - packages/drwil/templates/common/tools/claude/.claude/hooks/prompt-hook.mjs
  - .claude/hooks/prompt-hook.mjs
  - packages/drwil/templates/common/tools/claude/.claude/hooks/scope-reminder.mjs
  - .claude/hooks/scope-reminder.mjs
  - packages/drwil/templates/common/tools/claude/.claude/hooks/id-glossary.mjs
  - .claude/hooks/id-glossary.mjs
  - packages/drwil/templates/common/tools/claude/.claude/hooks/bash-guard.mjs
  - .claude/hooks/bash-guard.mjs
  - packages/drwil/templates/common/tools/claude/.claude/hooks/reply-glossary.mjs
  - .claude/hooks/reply-glossary.mjs
  - packages/drwil/templates/common/base/.githooks/state.mjs
  - .githooks/state.mjs
  - .githooks/state.test.mjs
  - packages/drwil/templates/common/base/.githooks/glossary.mjs
  - .githooks/glossary.mjs
  - .githooks/glossary.test.mjs
  - packages/drwil/test/kit.test.mjs
  - docs/contracts.md
  - .drwil/ia-first.json
  - packages/drwil/CHANGELOG.md
-->

(cadrage : tous les hooks d'agent livrés (gabarit et copies), le moteur
d'état et le glossaire (appelés par ces hooks), leurs tests, le nouveau
contrat et son contrôle, le changelog.)

## 1. Besoin

Les hooks prennent le dossier courant (`process.cwd()`) pour racine du
projet. Constaté le 2026-10-16 : après un `cd packages/drwil` de l'agent,
le rappel de gouvernance a lu un état absent (SCOPING au lieu de BUILD)
et créé un `.drwil` parasite sous `packages/drwil`. Un lancement par
sondage peut aussi chercher `.githooks/state.mjs` au mauvais endroit.

Le moteur des contrôles trouve déjà la racine par l'emplacement de son
fichier (`projectRoot`, `.githooks/engine.mjs` : le parent de
`.githooks/`) ; c'est indépendant de l'outil, de git et du dossier
courant.

## Critères d'acceptation

- Tous les hooks d'agent livrés, et le moteur d'état quand un hook
  l'appelle, prennent pour racine le dossier qui contient leur
  `.claude/` ou `.githooks/`, jamais le dossier courant : lancés depuis un
  sous-dossier, ils lisent le bon état et n'écrivent aucun `.drwil`
  ailleurs ; prouvé par les tests — contrat à créer au chantier (« les
  hooks lisent la racine du projet, pas le dossier courant »), inscrit au
  registre par le premier commit, puis cité ici par son ID
- Le changelog (« Unreleased ») le dit — `QUA-040`

## Contrats modifiés

Aucun. Contrat créé au chantier (voir le premier critère).

## 2. Hors périmètre

- Les scripts lancés à la main ou par les hooks git (contrôles,
  `run-checks`) : déjà à la bonne racine.
- Copilot CLI et `${CLAUDE_PROJECT_DIR}` : les commandes de
  `.claude/settings.json` la citent pour trouver les hooks ; si Copilot
  CLI ne la remplace pas, ses hooks ne se lancent pas du tout. À vérifier
  au chantier ; si c'est le cas, intention à part.

## 3. Contraintes

- Le hook de fin de réponse (« reply-glossary », à créer) vient de la fiche
  `docs/projects/identifiant-libelle-en-fin-de-reponse.md` : s'il existe
  au moment du chantier, il suit la même règle ; sinon cette fiche-là la
  reprend.
- Le contrat créé porte le champ Origine.

## 4. Décisions

- 2026-10-17 (demandeur, sondage puis précision) : racine par
  l'emplacement du fichier du hook, comme le moteur des contrôles (plutôt
  que variable de l'outil puis git) ; même règle pour tous les hooks
  livrés ; compatible avec tous les agents.

## 5. Lots

- **Lot 1** : contrat et contrôle inscrits, critère relié ; tests d'abord
  (hook lancé depuis un sous-dossier) ; racine par emplacement dans
  chaque hook et le moteur d'état ; changelog ; PR.

## 6. Reprise

- **Dernier état** (2026-10-17) : cadré ; rien de commencé.

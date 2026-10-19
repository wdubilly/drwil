# Projet : compatibilité des agents, Gemini CLI tenu (0.6.7, 3 sur 5)

**Statut** : cadré le 2026-10-18.
**Risque** : HIGH
**Maturité** : prêt
**Intention** : `docs/intentions/compatibilite-des-outils.md`

<!-- scope
files:
  - packages/drwil/templates/common/tools/gemini/*
  - .gemini/settings.json
  - packages/drwil/templates/common/tools/claude/.claude/hooks/*.mjs
  - .claude/hooks/*.mjs
  - packages/drwil/templates/common/base/.githooks/state.mjs
  - .githooks/state.mjs
  - .githooks/state.test.mjs
  - packages/drwil/src/config.ts
  - packages/drwil/src/render.ts
  - packages/drwil/src/manifest.ts
  - packages/drwil/test/kit.test.mjs
  - packages/drwil/templates/common/base/docs/projects/kit-mechanics.md
  - docs/projects/kit-mechanics.md
  - outils/banc-agents.mjs
  - outils/banc-agents.test.mjs
  - docs/ia-first.md
  - docs/architecture.md
  - docs/contracts.md
  - .drwil/ia-first.json
  - outils/miroirs.json
  - packages/drwil/CHANGELOG.md
  - packages/drwil/src/drift.ts
  - packages/drwil/src/essentials.ts
  - packages/drwil/templates/common/base/.githooks/state-cli.mjs
  - .githooks/state-cli.mjs
  - packages/drwil/templates/common/base/docs/ia-first.md
  - docs/projects/journal.md
  - docs/projects/pending.md
  - docs/intentions/*.md
-->

(cadrage : un dossier d'outil Gemini à créer dans le gabarit (réglages et
hooks de `.gemini/`, skills si Gemini les lit), sa copie dans le dépôt ;
les hooks partagés s'il faut les adapter au format d'événement de Gemini ;
l'installation par `init --tools gemini` ; le banc ; la matrice, la carte,
le registre, les contrôles, les miroirs et le changelog.)

## 1. Besoin

Pour Gemini CLI, `init` ne pose qu'un `GEMINI.md` qui importe `AGENTS.md` :
aucun hook, aucun skill. Essai du 2026-10-18 : même les hooks traduits par
`gemini hooks migrate --from-claude` ne sont pas lancés, et l'agent écrit du
code en SCOPING (`write_file`) sans refus.

## Critères d'acceptation

- Sous Gemini CLI, en SCOPING, une écriture de fichier de code
  (`write_file`, `replace`) est refusée avec le motif drwil ; prouvé par le
  banc [humain] — contrat à créer
- Gemini CLI reçoit le rappel d'état au démarrage et à chaque message —
  contrat à créer
- Un chantier se lance depuis Gemini CLI : par son sondage s'il en a un,
  sinon par `node .githooks/state.mjs start` dans un terminal, dit
  clairement dans la matrice — contrat à créer

## 2. Hors périmètre

- La file de chantiers et les sous-agents sous Gemini :
  `docs/intentions/file-sous-agents-autres-outils.md`.
- La mesure de consommation sous Gemini :
  `docs/intentions/consommation-autres-outils.md`.

## 3. Contraintes

- Lot 1 avant tout code : établir pourquoi les hooks du projet ne sont pas
  lancés (réglage d'activation, confiance du dossier, variable de chemin
  `GEMINI_PROJECT_DIR` ou autre), par sonde.
- Un seul jeu de scripts de hooks pour tous les outils : seule la
  déclaration diffère (une source).
- Livré à tout projet (QUA-018) : gabarit d'abord, puis
  `npm run installer-depot` ; aucun changement sous Claude Code.
- Fichiers de code sous 400 lignes (QUA-001) ; hooks à 100 % de couverture
  (QUA-004).

## 4. Lots

- **Lot 1** : sonde — ce qui active les hooks du projet sous Gemini, le
  format de leurs événements, la variable de chemin, l'emplacement des
  skills et l'existence d'un sondage.
- **Lot 2** : le dossier d'outil Gemini dans le gabarit, installé par
  `init --tools gemini`.
- **Lot 3** : blocage avant écriture et rappel d'état prouvés par le
  banc ; lancement ; matrice à jour.

## 5. Décisions

- **2026-10-18 — Gemini couvert dans la version compatibilité** (demandeur).

## 6. Reprise

- **Dernier état** (2026-10-18) : cadré, rien de construit.
- **Travail non commité** : aucun.
- **Prochaine étape** : [humain] lancer le chantier (`/drwil-start`),
  après Copilot.

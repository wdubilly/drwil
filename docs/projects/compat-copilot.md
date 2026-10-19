# Projet : compatibilité des agents, Copilot CLI tenu (0.6.7, 2 sur 5)

**Statut** : cadré le 2026-10-18.
**Risque** : HIGH
**Maturité** : prêt
**Intention** : `docs/intentions/compatibilite-des-outils.md`

<!-- scope
files:
  - packages/drwil/templates/common/tools/copilot/*
  - .github/hooks/*
  - packages/drwil/templates/common/tools/claude/.claude/hooks/*.mjs
  - .claude/hooks/*.mjs
  - packages/drwil/templates/common/tools/claude/.claude/settings.json
  - .claude/settings.json
  - packages/drwil/templates/common/base/.githooks/state.mjs
  - packages/drwil/templates/common/base/.githooks/state-cli.mjs
  - .githooks/state.mjs
  - .githooks/state-cli.mjs
  - .githooks/state.test.mjs
  - packages/drwil/src/config.ts
  - packages/drwil/src/render.ts
  - packages/drwil/src/drift.ts
  - packages/drwil/src/essentials.ts
  - packages/drwil/src/manifest.ts
  - packages/drwil/test/kit.test.mjs
  - packages/drwil/templates/common/base/docs/projects/kit-mechanics.md
  - docs/projects/kit-mechanics.md
  - outils/banc-agents.mjs
  - outils/banc-agents.test.mjs
  - outils/verifier-miroirs.mjs
  - packages/drwil/templates/common/base/docs/ia-first.md
  - docs/ia-first.md
  - docs/architecture.md
  - docs/contracts.md
  - .drwil/ia-first.json
  - outils/miroirs.json
  - packages/drwil/CHANGELOG.md
-->

(cadrage : la déclaration des hooks lue par Copilot CLI, gabarit et copie ;
les hooks partagés et le rappel d'état, pour qu'ils répondent dans le délai
de Copilot ; l'installation par `init` ; le banc, pour la preuve ; la
matrice, la carte, le registre, les contrôles, les miroirs et le
changelog.)

## 1. Besoin

Sous Copilot CLI, rien n'arrête l'écriture de code hors chantier (essais du
2026-10-18, `docs/intentions/compatibilite-des-outils.md`) : en session
interactive, nos hooks sont chargés mais dépassent tous le délai de 30 s,
et Copilot laisse alors passer ; en mode non interactif, aucun hook n'est
lancé.

## Critères d'acceptation

- Sous Copilot CLI, en SCOPING, une écriture de fichier de code (`create`,
  `edit`) est refusée avec le motif drwil, en session interactive comme en
  mode non interactif ; prouvé par le banc [humain] — `QUA-060`, `QUA-064`
- Copilot CLI reçoit le rappel d'état au démarrage et à chaque message ;
  aucun hook drwil ne dépasse le délai de Copilot (cause du dépassement
  établie et corrigée, testée hors Copilot) — `QUA-065`
- `/drwil-start` lance un chantier depuis Copilot CLI (sondage
  `ask_user`), refusé si la réponse est préremplie — `QUA-037`

## 2. Hors périmètre

- La file de chantiers et la fusion automatique sous Copilot CLI :
  `docs/intentions/file-pour-copilot.md` (deux décisions ouvertes).
- Les sous-agents de Copilot (`--fleet`) :
  `docs/intentions/file-sous-agents-autres-outils.md`.
- Les en-têtes YAML des skills : fait par le socle (journal du 2026-10-19, QUA-062).

## 3. Contraintes

- Cause avant correctif : reproduire le dépassement de délai hors Copilot
  avant de modifier un hook.
- Un hook qui échoue ou dépasse son délai ne doit jamais valoir accord :
  là où l'outil laisse passer par défaut, le dire dans la matrice.
- Livré à tout projet (QUA-018) : gabarit d'abord, puis
  `npm run installer-depot` ; aucun changement de comportement sous Claude
  Code (tests existants inchangés).
- Fichiers de code sous 400 lignes (QUA-001) ; hooks à 100 % de couverture
  (QUA-004).

## 4. Lots

- **Lot 1** : reproduire et expliquer le dépassement de délai (lecture de
  l'entrée standard, `${CLAUDE_PROJECT_DIR}`…) ; vérifier où Copilot lit
  ses hooks en mode non interactif.
- **Lot 2** : hooks qui répondent dans le délai ; déclaration lue par
  Copilot dans les deux modes, installée par `init --tools copilot`.
- **Lot 3** : blocage avant écriture et rappel d'état prouvés par le banc ;
  lancement par `ask_user` ; matrice à jour.

## 5. Décisions

- **2026-10-18 — Copilot avant Gemini** (agent, ordre de l'intention) :
  installé, et déjà à moitié branché.

## 6. Reprise

- **Dernier état** (2026-10-19) : construit, contrôles à relancer ; banc réel Copilot conforme.
- **Travail non commité** : tout.
- **Prochaine étape** : [humain] lancer le chantier (`/drwil-start`),
  après le socle.

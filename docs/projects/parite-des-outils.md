# Projet : la même gouvernance et le même cycle sous Claude Code, Copilot CLI, Gemini CLI et Codex

**Statut** : cadré le 2026-11-02, en tête de pile de la 0.11.0 (décidé le même jour) (demande du demandeur : « faire fonctionner copilot + claude + gemini + codex de la même manière »), décisions tranchées le même jour.
**Risque** : HIGH
**Maturité** : prêt

<!-- scope
files:
  - docs/projects/parite-des-outils.md
  - docs/projects/pending.md
  - docs/ia-first/6-limits-and-tool-compatibility.md
  - packages/drwil/templates/common/base/docs/ia-first/6-limits-and-tool-compatibility.md
  - packages/drwil/templates/common/tools/codex/.codex/hooks.json
  - outils/banc-agents.test.mjs
  - docs/intentions/compatibilite-des-outils.md
  - .drwil/ia-first.json
  - docs/contracts.md
  - docs/architecture.md
  - docs/projects/kit-mechanics.md
  - packages/drwil/templates/common/base/docs/projects/kit-mechanics.md
  - docs/ia-first/7-starting-and-closing.md
  - packages/drwil/CHANGELOG.md
  - packages/drwil/test/kit.test.mjs
  - packages/drwil/test/claude-hooks.test.mjs
  - .githooks/state.test.mjs
  - packages/drwil/templates/common/base/docs/ia-first/7-starting-and-closing.md
  - packages/drwil/templates/common/base/.githooks/state.mjs
  - packages/drwil/templates/common/base/.githooks/state-draft.mjs
  - packages/drwil/templates/common/base/.githooks/state-validate.mjs
  - packages/drwil/templates/common/base/.githooks/state-transitions.mjs
  - packages/drwil/templates/common/base/.githooks/state-texts.mjs
  - packages/drwil/templates/common/base/.githooks/state-context-texts.mjs
  - packages/drwil/templates/common/base/.githooks/state-messages-fr.mjs
  - packages/drwil/templates/common/base/.githooks/state-messages-en.mjs
  - packages/drwil/templates/common/tools/claude/.claude/hooks/prompt-hook.mjs
  - packages/drwil/templates/common/tools/claude/.claude/hooks/start-poll.mjs
  - packages/drwil/templates/common/tools/claude/.claude/hooks/queue-poll.mjs
  - packages/drwil/templates/common/tools/claude/.claude/skills/start-a-workstream/SKILL.md
  - .githooks/state.mjs
  - .githooks/state-draft.mjs
  - .githooks/state-validate.mjs
  - .githooks/state-transitions.mjs
  - .githooks/state-texts.mjs
  - .githooks/state-context-texts.mjs
  - .githooks/state-messages-fr.mjs
  - .githooks/state-messages-en.mjs
  - .claude/hooks/prompt-hook.mjs
  - .claude/hooks/start-poll.mjs
  - .claude/hooks/queue-poll.mjs
  - .claude/skills/start-a-workstream/SKILL.md
-->

## 1. Besoin

Seul Claude Code a le cycle complet : sondage de lancement lu par un hook, file de chantiers menée par
sous-agents, blocage avant écriture, rappel d'état. Constaté le 2026-11-02 : sous Copilot CLI, le sondage ne
prend qu'**une fiche** (choix multiple revenu vide, `docs/intentions/notes.md`), donc pas de file ; Codex n'a
jamais été essayé (`docs/intentions/compat-codex.md`) ; Gemini n'a ni skills trouvés ni sous-agents vérifiés
(`docs/intentions/compatibilite-des-outils.md`). Le demandeur veut un même parcours, quel que soit l'agent.

## Critères d'acceptation

- Un tableau de parité, outil par outil (Claude Code, Copilot CLI, Gemini CLI, Codex), dit pour chacun : sondage
  de lancement, choix de plusieurs fiches (file), sous-agent par chantier, blocage avant écriture, rappel d'état ;
  chaque case est « tenu », « contourné par … » ou « impossible », avec date et version d'essai, jamais devinée
  (rattaché à QUA-063, matrice de compatibilité) — contrat à créer
- Une file de plusieurs fiches se lance d'un seul geste humain sous chaque outil qui la permet ; sous un outil
  qui ne la permet pas, le contournement est une file lue par l'état (`state.mjs queue`), sans cocher plusieurs
  cases — contrat à créer
- Le contournement ne laisse jamais l'agent décider du lancement : l'humain répond, un outil lit (même
  invariant que le sondage actuel) — contrat à créer
- Le résultat par outil est prouvé par le banc `outils/banc-agents.mjs` ; l'attestation de la colonne
  « Attested by the human » reste un geste humain — [humain]

## 2. Hors périmètre

- Cursor (`docs/intentions/compat-cursor.md`) : hors des quatre outils demandés.
- La consommation de tokens par outil.

## 3. Contraintes

- Livrable : les changements vont dans le gabarit (`packages/drwil/templates/`), jamais dans une copie installée.
- QUA-013 : un essai non fait est « not tested », jamais « tenu ».
- Un seul jeu de scripts de hooks pour tous les outils (état actuel) : garder cette règle.
- Les lots partagent `.githooks/state.mjs` et ses tests : un lot à la fois.

## 4. Décisions

Tranchées par le demandeur le 2026-11-02 :

- File par commande dans tous les cas : on n'attend pas la cause du choix multiple vide sous Copilot CLI.
- Outil sans sous-agent exploitable : proposer à l'humain une nouvelle conversation entre deux chantiers.
- Tous les outils ensemble, un lot par capacité (et non un lot par outil).
- Lot 2, option B (2026-11-02) : la file se construit par des sondages à choix unique enchaînés (`drwil-file` : « ajouter » une fiche à la fois, puis « Terminer la file »), lus par le hook, sans choix multiple ; l'humain répond, un outil lit, l'agent ne décide jamais du lancement ni de la composition de la file. Amende QUA-037 (un seul sondage à choix multiple).
- Codex : essayé le 2026-11-02 avec un modèle local léger (7B sur processeur) : il n'appelle pas les outils de façon fiable, l'essai est inexploitable ; Codex reste « not tested » (QUA-013) jusqu'à ce qu'un modèle capable soit disponible (abonnement ou clé API), sans bloquer les lots.

## 5. Points à trancher

- [humain] Sonder Codex dès qu'un modèle capable est disponible (abonnement ou clé API) ; non bloquant : sans lui, Codex reste « not tested » et l'on livre pour lui ce que sa documentation garantit (`AGENTS.md`, et les hooks déclarés dans le dossier `.codex` du projet).

## 6. Increments

- **Lot 1 — sondes** [humain] : pour les quatre outils, vérifier sondage, sous-agents dans le dossier du dépôt,
  hooks lancés. Sortie : le tableau de parité rempli avec dates et versions.
- **Lot 2 — file par commande** [IA] : `state.mjs queue` utilisable sous chaque outil, sans choix multiple dans
  le sondage. Sortie : une file de deux fiches lancée sous un outil à sondage unique.
- **Lot 3 — sous-agent ou nouvelle conversation** [IA] : consigne de sous-agent là où l'outil le permet,
  sinon proposition d'une nouvelle conversation entre deux chantiers ; banc et matrice à jour.

## 7. Reprise

- **Dernier état** (2026-11-02) : lots 2 et 3 réalisés. Lot 3 : le rappel d'état de la file (`.githooks/state-context-texts.mjs`) dit sous-agent si l'outil en offre un utilisable, sinon une nouvelle conversation proposée à l'humain (plus « tout dans la même session ») ; la matrice (`docs/ia-first/6-limits-and-tool-compatibility.md`) gagne le tableau « Workstream cycle parity » (cases « not tested », aucune date inventée) et le paragraphe Codex ; `packages/drwil/templates/common/tools/codex/.codex/hooks.json` livré pour Codex (état au démarrage et rappel, soumis à `/hooks`, aucun blocage d'écriture) ; QUA-037 et QUA-063 amendés. Le banc lui-même n'a pas changé : il ne mesure ni sondage, ni file, ni sous-agent.
- **Travail non commité** : aucun une fois le lot 3 commité.
- **Prochaine étape** : verify puis clôture par la session principale ; lot 1 [humain] (sondes : dater les cases du tableau de parité) à rappeler. Limites : essai réel sous Copilot CLI de l'enchaînement `drwil-file` non fait ; sous-agents Copilot/Gemini non éprouvés ; Codex « not tested » (hooks livrés d'après la documentation, format `apply_patch` non vérifié pour un blocage d'écriture).

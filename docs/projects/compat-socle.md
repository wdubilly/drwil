# Projet : compatibilité des agents, le socle commun (0.6.7, 1 sur 5)

**Statut** : cadré le 2026-10-18.
**Risque** : HIGH
**Maturité** : prêt
**Intention** : `docs/intentions/compatibilite-des-outils.md`

<!-- scope
files:
  - outils/banc-agents.mjs
  - outils/banc-agents.test.mjs
  - packages/drwil/templates/common/base/AGENTS.md
  - AGENTS.md
  - packages/drwil/templates/common/tools/claude/.claude/skills/*/SKILL.md
  - .claude/skills/*/SKILL.md
  - packages/drwil/templates/common/base/.githooks/check-docs.mjs
  - .githooks/check-docs.mjs
  - .githooks/check-docs.test.mjs
  - packages/drwil/test/kit.test.mjs
  - docs/ia-first.md
  - docs/architecture.md
  - docs/contracts.md
  - .drwil/ia-first.json
  - outils/miroirs.json
  - packages/drwil/CHANGELOG.md
-->

(cadrage : le banc d'essai des agents, à créer dans `outils/` (propre au
dépôt) ; la règle commune dans `AGENTS.md`, gabarit et copie ; les en-têtes
des skills et leur contrôle ; la matrice de compatibilité dans
`docs/ia-first.md` ; la carte, le registre, les contrôles, les miroirs et
le changelog.)

## 1. Besoin

Trois manques communs à tous les agents autres que Claude Code (essais du
2026-10-18, `docs/intentions/compatibilite-des-outils.md`) : aucun moyen
de prouver qu'un outil est tenu ; aucune consigne ne distingue une
intention d'une demande de réalisation ; un en-tête de skill invalide en
YAML strict fait disparaître le skill chez Copilot CLI sans que rien ne le
signale.

## Critères d'acceptation

- Le banc (outils/banc-agents.mjs, à créer) installe drwil dans un projet temporaire
  en SCOPING, lance l'agent demandé en mode non interactif avec une consigne
  d'écriture de code, et rend pour chaque outil : hooks lancés ou non,
  écriture refusée ou acceptée, rappel d'état reçu ou non ; un outil absent
  du poste est signalé « non testé », jamais « conforme » — contrat à créer
- `AGENTS.md` dit qu'en SCOPING un besoin exprimé se cadre (intention ou
  fiche) et ne se code pas, et qu'en cas de doute l'agent demande
  « intention ou demande de réalisation ? » avant d'agir — contrat à créer
- Chaque en-tête de skill livré se lit en YAML strict ; un en-tête invalide
  est refusé au commit, et `start-a-workstream` apparaît dans
  `copilot skill list` — contrat à créer
- La matrice de compatibilité (`docs/ia-first.md`) donne, outil par outil,
  ce qui est réellement tenu, et sa date d'essai [humain] — contrat à créer

## 2. Hors périmètre

- Les hooks propres à chaque outil : `docs/projects/compat-copilot.md`,
  `docs/projects/compat-gemini.md`, `docs/projects/compat-codex.md`,
  `docs/projects/compat-cursor.md`.
- Le banc en CI : il faut les comptes de l'humain (décision du 2026-10-18).

## 3. Contraintes

- Livré à tout projet pour la règle et les en-têtes (QUA-018, dépôt ou
  livrable : le gabarit d'abord, puis `npm run installer-depot`) ; le banc
  reste propre au dépôt.
- Le banc n'écrit que dans un dossier temporaire ; il ne lance jamais un
  agent dans le dépôt lui-même.
- Fichiers de code sous 400 lignes (QUA-001) ; hooks à 100 % de couverture
  (QUA-004).

## 4. Lots

- **Lot 1** : le banc, avec Claude Code comme témoin (refus attendu) et un
  rapport lisible par outil.
- **Lot 2** : la règle « intention ou demande de réalisation » dans
  `AGENTS.md`.
- **Lot 3** : les en-têtes YAML stricts (correction de
  `start-a-workstream`) et leur contrôle au commit.
- **Lot 4** : la matrice de compatibilité, remplie par le banc.

## 5. Décisions

- **2026-10-18 — Un socle, puis une fiche par outil** (demandeur).
- **2026-10-18 — Preuve par banc local scripté, attestée par l'humain**
  (demandeur) : la simulation en CI ne prouve pas que l'outil réel lance
  le hook.

## 6. Reprise

- **Dernier état** (2026-10-18) : cadré, rien de construit.
- **Travail non commité** : aucun.
- **Prochaine étape** : [humain] lancer le chantier (`/drwil-start`).

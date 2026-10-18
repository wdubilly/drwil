# Projet : compatibilité des agents, Codex (4 sur 5)

**Statut** : cadré le 2026-10-18.
**Risque** : HIGH
**Maturité** : à affiner — Codex n'est pas installé sur le poste : rien n'a été essayé.
**Intention** : `docs/intentions/compatibilite-des-outils.md`

<!-- scope
files:
  - packages/drwil/templates/common/tools/codex/*
  - packages/drwil/templates/common/tools/claude/.claude/hooks/*.mjs
  - .claude/hooks/*.mjs
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
-->

(cadrage : un dossier d'outil Codex à créer dans le gabarit si Codex offre
des hooks, sa copie ; les hooks partagés à adapter ; l'installation par
`init --tools codex` ; le banc ; la matrice, la carte, le registre, les
contrôles, les miroirs et le changelog.)

## 1. Besoin

Codex lit `AGENTS.md` nativement, mais `init --tools codex` n'installe rien
de plus : la gouvernance n'y tient que par consignes et par la barrière Git
au commit.

## Critères d'acceptation

- Si Codex offre des hooks : en SCOPING, une écriture de code est refusée
  avec le motif drwil et le rappel d'état arrive, prouvés par le banc
  [humain] — contrat à créer
- Sinon : la matrice déclare « consignes et barrière Git seulement », et le
  banc montre que la barrière refuse le commit d'un fichier de code écrit
  par Codex en SCOPING [humain] — contrat à créer

## 2. Hors périmètre

- La file de chantiers et les sous-agents sous Codex :
  `docs/intentions/file-sous-agents-autres-outils.md`.

## 3. Contraintes

- Prérequis humain : installer Codex sur le poste et s'y connecter.
- Un seul jeu de scripts de hooks pour tous les outils (une source).
- Livré à tout projet (QUA-018) ; aucun changement sous Claude Code.

## 4. Lots

- **Lot 1** : sonde — hooks offerts par Codex, format d'événement, noms des
  outils d'écriture, mode non interactif.
- **Lot 2** : déclaration installée par `init --tools codex`, ou
  déclaration honnête de la limite.
- **Lot 3** : preuve par le banc ; matrice à jour.

## 5. Décisions

- **2026-10-18 — Codex couvert dans la version compatibilité** (demandeur).

## 6. Reprise

- **Dernier état** (2026-10-18) : cadré, rien de construit ; Codex absent
  du poste.
- **Travail non commité** : aucun.
- **Prochaine étape** : [humain] installer Codex, puis relire la fiche et
  la passer en « prêt ».

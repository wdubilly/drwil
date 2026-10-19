# Projet : compatibilité des agents, Cursor (5 sur 5)

**Statut** : cadré le 2026-10-18.
**Risque** : HIGH
**Maturité** : à affiner — Cursor est un outil graphique : le banc non interactif ne s'y applique pas tel quel.
**Intention** : `docs/intentions/compatibilite-des-outils.md`

<!-- scope
files:
  - packages/drwil/templates/common/tools/cursor/*
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

(cadrage : le dossier d'outil Cursor du gabarit (règles, et hooks si Cursor
en offre), sa copie ; les hooks partagés à adapter ; l'installation par
`init --tools cursor` ; le banc ou un essai manuel guidé ; la matrice, la
carte, le registre, les contrôles, les miroirs et le changelog.)

## 1. Besoin

Pour Cursor, `init` ne livre que des règles (`packages/drwil/templates/common/tools/cursor/.cursor/rules/ia-first.mdc`) :
des consignes, sans rappel d'état ni blocage avant écriture.

## Critères d'acceptation

- Si Cursor offre des hooks : en SCOPING, une écriture de code est refusée
  avec le motif drwil, prouvé par le banc (agent en ligne de commande de
  Cursor, s'il existe) ou par un essai manuel guidé [humain] — contrat à
  créer
- Sinon : la matrice déclare « consignes et barrière Git seulement » [humain]
  — contrat à créer

## 2. Hors périmètre

- La file de chantiers et les sous-agents sous Cursor :
  `docs/intentions/file-sous-agents-autres-outils.md`.

## 3. Contraintes

- Un seul jeu de scripts de hooks pour tous les outils (une source).
- Livré à tout projet (QUA-018) ; aucun changement sous Claude Code.

## 4. Lots

- **Lot 1** : sonde — hooks offerts par Cursor, agent en ligne de
  commande, format d'événement.
- **Lot 2** : déclaration installée par `init --tools cursor`, ou
  déclaration honnête de la limite.
- **Lot 3** : preuve (banc ou essai manuel guidé) ; matrice à jour.

## 5. Décisions

- **2026-10-18 — Cursor couvert dans la version compatibilité** (demandeur).

## 6. Reprise

- **Dernier état** (2026-10-18) : cadré, rien de construit.
- **Travail non commité** : aucun.
- **Prochaine étape** : [humain] décider du mode de preuve (banc ou essai
  manuel), puis passer la fiche en « prêt ».

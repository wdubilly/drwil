# Intention : Cursor tenu par la même gouvernance (0.6.7, 5 sur 5)

**Statut** : repassée de fiche à intention le 2026-10-19 (demande de l'humain) ; cadrée le 2026-10-18, rien de construit. Fait partie de `docs/intentions/compatibilite-des-outils.md`.

## Besoin

Pour Cursor, `init` ne livre que des règles
(`packages/drwil/templates/common/tools/cursor/.cursor/rules/ia-first.mdc`) :
des consignes, sans rappel d'état ni blocage avant écriture. Faire tenir à
Cursor les quatre points de Claude Code, ou déclarer honnêtement « consignes
et barrière Git seulement ».

## Existant (vérifié le 2026-10-19)

- Cursor est un outil graphique : le banc non interactif ne s'y applique pas
  tel quel.
- Le socle, Copilot CLI et Gemini CLI sont faits ; un seul jeu de scripts de
  hooks sert tous les outils (`.claude/hooks/*.mjs`).

## Critères d'acceptation envisagés

- Si Cursor offre des hooks : en SCOPING, une écriture de code est refusée
  avec le motif drwil, prouvé par le banc (agent en ligne de commande de
  Cursor, s'il existe) ou par un essai manuel guidé [humain].
- Sinon : la matrice déclare « consignes et barrière Git seulement » [humain].

## Lots envisagés

1. Sonde : hooks offerts par Cursor, agent en ligne de commande, format
   d'événement.
2. Déclaration installée par `init --tools cursor`, ou déclaration honnête de
   la limite.
3. Preuve (banc ou essai manuel guidé) ; matrice à jour.

## Questions à trancher

- [décision] Mode de preuve : banc (agent en ligne de commande) ou essai
  manuel guidé ?
- [décision] Quand la reprendre en fiche (la version 0.6.7 attend Codex et Cursor) ?
- Hors périmètre : la file et les sous-agents sous Cursor
  (`docs/intentions/compatibilite-des-outils.md`).

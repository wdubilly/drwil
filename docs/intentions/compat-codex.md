# Intention : Codex tenu par la même gouvernance (0.6.7, 4 sur 5)

**Statut** : repassée de fiche à intention le 2026-10-19 (demande de l'humain) ; cadrée le 2026-10-18, rien de construit. Fait partie de `docs/intentions/compatibilite-des-outils.md`.

## Besoin

Codex lit `AGENTS.md` nativement, mais `init --tools codex` n'installe rien
de plus : la gouvernance n'y tient que par consignes et par la barrière Git
au commit. Faire tenir à Codex les quatre points de Claude Code (consignes,
rappel d'état, blocage avant écriture, lancement) ou déclarer honnêtement
« consignes et barrière Git seulement ».

## Existant (vérifié le 2026-10-19)

- Codex n'est pas installé sur le poste : rien n'a été essayé.
- Le socle, Copilot CLI et Gemini CLI sont faits ; un seul jeu de scripts de
  hooks sert tous les outils (`.claude/hooks/*.mjs`).
- Preuve par le banc `outils/banc-agents.mjs` ; résultat attesté par l'humain.

## Critères d'acceptation envisagés

- Si Codex offre des hooks : en SCOPING, une écriture de code est refusée avec
  le motif drwil et le rappel d'état arrive, prouvés par le banc [humain].
- Sinon : la matrice déclare « consignes et barrière Git seulement », et le
  banc montre que la barrière refuse le commit d'un fichier de code écrit par
  Codex en SCOPING [humain].

## Lots envisagés

1. Sonde : hooks offerts par Codex, format d'événement, noms des outils
   d'écriture, mode non interactif.
2. Déclaration installée par `init --tools codex`, ou déclaration honnête de
   la limite.
3. Preuve par le banc ; matrice à jour.

## Questions à trancher

- [décision] Prérequis humain : installer Codex sur le poste et s'y connecter.
- [décision] Quand la reprendre en fiche (la version 0.6.7 attend Codex et Cursor) ?
- Hors périmètre : la file et les sous-agents sous Codex
  (`docs/intentions/file-sous-agents-autres-outils.md`).

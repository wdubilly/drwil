# Intention : forcer la lecture ciblée avec Gemini CLI, Copilot CLI, Codex et Cursor

**Statut** : proposée le 2026-10-24 — limite du chantier « réduire le contexte
relu par chantier » (décision du demandeur : une seule intention pour les
quatre outils).

## Besoin

Avec Claude Code, la lecture entière de `docs/contracts.md` et de
`docs/projects/journal.md` est refusée avant qu'elle ait lieu (QUA-132 : hook
read-guard sur l'outil Read et `.claude/hooks/bash-guard.mjs`). Gemini CLI,
Copilot CLI, Codex et Cursor n'ont que la consigne écrite d'`AGENTS.md`.

## Existant (relevé le 2026-10-24)

- Gemini CLI et Copilot CLI ont des hooks avant outil (déjà utilisés par
  drwil pour l'état de gouvernance) ; Codex et Cursor : à examiner
  (`docs/intentions/compat-codex.md`, `docs/intentions/compat-cursor.md`).
- Aucune promesse au-delà de la consigne écrite tant que le banc ne l'a pas
  prouvée (QUA-060, un outil n'est tenu que prouvé par le banc).

## Questions à trancher

- Pour chaque outil : quel point d'accroche (hook avant lecture, garde
  shell), et la preuve par le banc ?
- Ordre : d'abord les outils déjà tenus (Gemini, Copilot), puis Codex et
  Cursor une fois leur compatibilité décidée ?

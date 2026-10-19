# Intention : noter une idée ou une intention à tout moment, sous Claude Code, Copilot CLI et Gemini CLI

**Statut** : proposée le 2026-10-19 — demande de l'humain, après « Gemini CLI tenu » (journal du 2026-10-19).

## Besoin

Pouvoir consigner une note ou une nouvelle intention à n'importe quel moment,
y compris en plein chantier, d'un geste court, et de la même façon sous
Claude Code, Copilot CLI et Gemini CLI. Sans cadrer, sans coder, sans
interrompre le chantier en cours.

## Existant (vérifié le 2026-10-19)

- Les fiches de `docs/projects/` et `docs/intentions/` se commitent à tout
  moment : la barrière de cadrage ne les refuse pas
  (`.githooks/scope-gate.mjs`).
- En SCOPING, « intention : … » se traduit par une fiche écrite à la main par
  l'agent ; en BUILD, la note part dans les commits du chantier et n'arrive sur
  la branche principale qu'à la fusion de sa PR.
- Pas de geste de capture : une fiche d'intention exige « Statut », « Besoin »,
  « Existant » et « Questions à trancher » (`docs/intentions/README.md`), trop
  lourd pour une idée d'une ligne.
- Les commandes `/drwil-*` existent sous Claude Code et Copilot CLI (skills
  de `.claude/skills/`) ; sous Gemini CLI elles ne sont pas câblées :
  `docs/intentions/skills-et-sondage-sous-gemini.md`.

## Questions à trancher

- [décision] Le geste : une commande `/drwil-note <texte>` (skill), ou une
  commande de terminal `node .githooks/note.mjs "<texte>"` utilisable par
  tout outil, y compris Gemini CLI tant que ses skills ne sont pas câblés ?
- [décision] Où va la note : un fichier unique de notes dans le dossier des intentions
  (fiche allégée, une ligne datée par note, promue en intention quand elle
  mûrit), ou une fiche d'intention complète par note ?
- [décision] Où elle est commitée pendant un chantier : sur la branche du
  chantier (suit sa PR), ou sur une branche à part issue de la branche
  principale (arrive plus vite, sans polluer le chantier) ?
- [décision] La note est-elle listée dans l'index des chantiers
  (`docs/projects/pending.md`) ou seulement dans son fichier ?
- [décision] Comment rester compatible avec « intention ou demande de
  réalisation ? » (QUA-061) : une note est toujours une intention, jamais un
  ordre de coder.
- Lien : `docs/intentions/cloture-coherence-doc.md` (éviter les doublons de
  notes et d'intentions).

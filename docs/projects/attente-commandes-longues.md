# Projet : attente outillée des commandes longues

**Statut** : cadré le 2026-10-30.
**Risque** : HIGH
**Maturité** : prêt

<!-- scope
files:
  - .githooks/wait-command.mjs
  - .githooks/wait-command.test.mjs
  - packages/drwil/templates/common/base/.githooks/wait-command.mjs
  - packages/drwil/templates/common/tools/claude/.claude/agents/drwil-checks.md
  - .claude/agents/drwil-checks.md
  - docs/ia-first/8-conduct-rules.md
  - packages/drwil/templates/common/base/docs/ia-first/8-conduct-rules.md
  - docs/contracts.md
  - docs/contracts-catalog.md
  - docs/architecture.md
  - docs/projects/kit-mechanics.md
  - .drwil/ia-first.json
-->

## 1. Besoin

Les sous-agents lancent des boucles `while pgrep -f ...; do sleep 5; done` qui se voient elles-mêmes et ne
finissent jamais (15 boucles zombies le 2026-10-30), faute d'un outil pour attendre `run-checks`, `verify` ou
un commit à hooks au-delà du délai de 120 s.

## Critères d'acceptation

- Un script du kit lance une commande longue en tâche de fond et écrit son verdict dans un fichier — contrat
  à créer
- Le même script expose une attente bornée : elle rend le verdict ou dit « toujours en cours » à l'échéance,
  sans jamais boucler indéfiniment — contrat à créer
- Les consignes des sous-agents imposent ce script et `run_in_background`, et interdisent la boucle `pgrep` —
  contrat à créer

## 2. Hors périmètre

- Refuser par une garde de commande les boucles `while pgrep` (option écartée : le script et la consigne
  suffisent).
- Les outils autres que Claude Code (leurs consignes suivent le contrat de compatibilité des outils).

## 3. Contraintes

- Le gabarit est la seule source ; un nouveau fichier de code ajoute la carte d'architecture
  (`docs/architecture.md`) et `docs/projects/kit-mechanics.md`.
- Aucun processus orphelin : l'échéance de l'attente ne tue pas la commande, et un second lancement ne
  duplique pas un verdict déjà en cours.
- Le verdict écrit ne contient ni secret ni sortie complète de commande (QUA-013 : non exécuté n'est pas passé).

## 4. Décisions

Tranchées par le demandeur le 2026-10-30 : un script d'attente bornée, avec consigne `run_in_background` aux
sous-agents.

## 5. Points à trancher

- [IA] Nom et forme exacte de la commande (`wait-command.mjs <commande>` puis `--status`) et durée d'attente
  par défaut : à fixer au lot 1, avec des tests sur une commande de quelques secondes.

## 6. Increments

- **Lot 1 — script et consignes** [IA] : script, tests, consigne du sous-agent `drwil-checks`, règle de
  conduite. Critère de sortie : une commande de 3 s lancée en fond rend son verdict par l'attente bornée, et
  une attente trop courte rend « toujours en cours » sans bloquer.

## 7. Reprise

- **Dernier état** (2026-10-30) : cadré, aucun code.
- **Travail non commité** : aucun.
- **Prochaine étape** : [décision] lancer par `/drwil-start`.

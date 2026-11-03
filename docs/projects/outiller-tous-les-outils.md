# Projet : outiller tous les outils, à chaque consigne ou mécanisme du kit

**Statut** : cadré le 2026-11-03.
**Risque** : HIGH
**Maturité** : prêt
**Intention** : `docs/intentions/attente-commandes-longues-suites.md`

<!-- scope
files:
  - packages/drwil/templates/common/base/AGENTS.md
  - AGENTS.md
  - packages/drwil/templates/common/tools/copilot/.github/copilot-instructions.md
  - packages/drwil/templates/common/tools/cursor/.cursor/rules/ia-first.mdc
  - packages/drwil/templates/common/base/docs/ia-first/6-limits-and-tool-compatibility.md
  - docs/ia-first/6-limits-and-tool-compatibility.md
  - packages/drwil/templates/common/base/docs/ia-first/8-conduct-rules.md
  - docs/ia-first/8-conduct-rules.md
  - outils/parite-des-outils.test.mjs
  - docs/contracts.md
  - docs/contracts-catalog.md
  - docs/architecture.md
  - docs/projects/kit-mechanics.md
  - packages/drwil/templates/common/base/docs/projects/kit-mechanics.md
  - .drwil/ia-first.json
-->

## 1. Besoin

Le kit sert cinq outils (Claude Code, Copilot CLI, Gemini CLI, Codex, Cursor), mais une consigne ou un mécanisme
nouveau n'atteint souvent que Claude Code. Cas qui l'a révélé (2026-11-03) : l'attente bornée des commandes
longues. Le script `.githooks/wait-command.mjs` est livré à tous, mais seule la consigne du sous-agent
`drwil-checks` de Claude Code (`QUA-221`) impose de l'utiliser et interdit la boucle `while pgrep` : sous les
autres outils, rien ne la retient. Demande du demandeur (2026-11-03) : outiller systématiquement tous les outils,
et en faire un contrat.

## Critères d'acceptation

- Toute consigne ou tout mécanisme livré par le kit atteint chaque outil choisi, par le fichier que tous lisent
  (`AGENTS.md`) ou par son fichier natif, sinon son écart est déclaré dans la matrice de compatibilité — contrat
  à créer
- Sous tout outil, la consigne de lancer les commandes longues par `.githooks/wait-command.mjs` et de ne jamais
  attendre par une boucle `while pgrep` est lue au démarrage, pas seulement sous Claude Code — contrat à créer

## 2. Hors périmètre

- Prouver que le modèle suit la consigne (limite déjà dite de `QUA-221`) et rouvrir la garde de commande contre
  `while pgrep` (écartée au cadrage de l'attente).
- Essayer les outils pour de vrai et dater le tableau de parité : fiche `docs/intentions/parite-des-outils-suites.md`.
- Rejouer le script d'attente sous Windows (limite de `docs/intentions/attente-commandes-longues-suites.md`).
- Un équivalent de sous-agent pour Copilot CLI, Gemini CLI, Codex ou Cursor : la consigne d'`AGENTS.md` suffit tant
  que ces outils n'ont pas de fichier de sous-agent propre au kit.

## 3. Contraintes

- Le gabarit est la seule source ; la copie du dépôt suit (`scopeMirrors`). Un nouveau fichier de code ajoute la
  carte d'architecture (`docs/architecture.md`) et `docs/projects/kit-mechanics.md`.
- `QUA-153` : le `AGENTS.md` livré reste un aiguillage de 100 lignes au plus (93 aujourd'hui) : la consigne tient
  en une ou deux lignes qui renvoient au détail de `docs/ia-first/8-conduct-rules.md`.
- Une information, une seule source de texte, mais plusieurs portes pour le lire (décision du 2026-11-03, le moins
  de risque de contournement) : la consigne est écrite dans `AGENTS.md` et reprise en une ligne dans les fichiers
  d'entrée natifs qui ne font aujourd'hui que renvoyer (Copilot, Cursor), pour qu'un outil qui ne suit pas le
  renvoi la lise quand même. Le test relit la même liste de marqueurs dans chacun de ces fichiers : une copie qui
  dérive est détectée.
- `QUA-060` : on n'écrit pas « tenu » pour un outil que le banc n'a pas mesuré ; la matrice reste « not tested »
  sur ce point tant qu'aucun essai n'a eu lieu.
- `QUA-018` : un contrat du dépôt drwil et un contrat du livrable ne se mélangent pas ; le contrat général vise le
  kit livré.

## 4. Décisions

Tranchée par le demandeur le 2026-11-03 : la règle est systématique et devient un contrat, avec la mise à niveau
de l'attente bornée pour tous les outils. Forme du contrat général : une liste déclarée « mécanisme → marqueur »
que le test relit. Emplacement de la consigne : celui qui laisse le moins de risque de contournement, donc
`AGENTS.md` et les fichiers d'entrée natifs qui renvoient à lui (Copilot, Cursor), avec les mêmes marqueurs.

## 5. Points à trancher

- [IA] Emplacement et nom du test (un fichier « parite-des-outils.test.mjs » dans le dossier `outils/`, comme
  `QUA-063`) : à confirmer au lot 1.
- [IA] La liste déclarée ne repère que les mécanismes qu'on y inscrit : dire dans le contrat qu'un mécanisme
  nouveau s'y ajoute dans le chantier qui le crée.

## 6. Increments

- **Lot 1 — contrat général et attente bornée pour tous** [IA] : deux contrats, consigne d'`AGENTS.md` et des fichiers d'entrée Copilot et Cursor (gabarit
  puis copie), règle de conduite, matrice, test. Critère de sortie : le test échoue si le marqueur de l'attente
  bornée manque dans le `AGENTS.md` livré, et passe avec la ligne ajoutée.

## 7. Reprise

- **Dernier état** (2026-11-03) : cadré, aucun code.
- **Travail non commité** : aucun.
- **Prochaine étape** : [décision] lancer par `/drwil-start`.

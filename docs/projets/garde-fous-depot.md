# Projet : des garde-fous qui tiennent sans compter sur la mémoire de l'agent

**Statut** : cadré le 2026-10-06 — lots 1 et 2 livrés sur la branche `chantier/garde-fous-depot`, en attente de fusion ; lot 3 à cadrer.
**Risque** : HIGH

<!-- cadrage
fichiers:
  - .drwil/ia-first.json
  - packages/drwil/templates/common/tools/claude/.claude/settings.json
  - packages/drwil/templates/common/tools/claude/.claude/hooks/rappel-cadrage.mjs
  - .claude/hooks/rappel-cadrage.mjs
  - .claude/settings.json
  - packages/drwil/src/index.ts
  - packages/drwil/test/kit.test.mjs
-->

## 1. Besoin

Le 2026-10-06, l'agent a proposé un changement de mécanique
(`.githooks/creer-release.mjs`) sans fiche ; rien ne l'a arrêté. Le
demandeur ne veut pas d'une règle qui ne tient que par la mémoire de
l'agent : c'est précisément ce que DRWIL doit rendre mécanique (P3 de
`docs/projets/drwil-v0-2-gouvernance-executable.md`). L'examen a révélé
trois écarts sur ce dépôt :

1. QUA-016 réglé en « avertissement » ; 6 fichiers de code orphelins
   depuis des semaines (bruit que plus personne ne lit).
2. `AGENTS.md` annonçait « Tout vérifier » avec un ancien lanceur bash
   (supprimé par ce chantier) qui exécutait l'ancien contrôle Python de la
   doc et avalait les autres échecs : une doc fausse que QUA-011 ne voyait
   pas (le fichier cité existait).
3. Les hooks Claude Code du kit (`.claude/hooks/rappel-cadrage.mjs`,
   `.claude/hooks/garde-fou-bash.mjs`) sont présents mais **non branchés**
   dans le `.claude/settings.json` du dépôt, contrairement au gabarit.

Limite de fond : même en « bloquant », QUA-016 vérifie qu'un fichier
appartient à une fiche, pas qu'un changement a la sienne.

## 2. Hors périmètre

- Le défaut du gabarit livré (QUA-016 reste en « avertissement » pour les
  projets qui adoptent drwil, sauf décision contraire).
- Les permissions de l'agent dans le `.claude/settings.json` du dépôt
  (décision du demandeur, voir section 5).

## 3. Contraintes

- QUA-019 : aucun contrôle désactivé ou contourné pour avancer.
- QUA-011 : toute doc qui cite un fichier supprimé est corrigée dans le
  même changement.
- QUA-018 : lot 1 = dépôt (plus une correction du gabarit livré, l'entrée
  `Bash(bash .githooks/run-checks.mjs)` des permissions, qui lançait un
  module JavaScript avec bash).
- Suppressions visibles en revue (PR), jamais silencieuses.

## 4. Décisions

- 2026-10-06 : corriger avec une fiche ; une règle qui ne tient que par la
  mémoire de l'agent n'est pas une garantie. [décision utilisateur]
- 2026-10-06 : `--append-system-prompt` écarté : `AGENTS.md` est déjà
  chargé à chaque session (via `CLAUDE.md`) ; le manque est
  l'application, pas la lecture. Ordre des barrières : hook git (agnostique
  de l'agent), CI, puis hook Claude `PreToolUse` (le plus précoce). [par
  défaut]

- 2026-10-06 : hooks Claude du kit branchés dans le `.claude/settings.json`
  du dépôt (hooks seulement : les permissions du gabarit restent une
  décision à part) ; `.claude/hooks/rappel-cadrage.mjs` devient un **refus
  avant écriture** (PreToolUse) quand QUA-016 est bloquant, rappel après
  écriture conservé en « avertissement » ; défaut de QUA-016 dans le
  gabarit livré passé à **bloquant** (les projets existants gardent leur
  réglage : `apply` ne l'écrase jamais). [décision utilisateur]

## 5. Points à trancher

- [décision] Lot 3 : forme du contrôle « un changement de code a sa fiche »
  (à cadrer avant tout code).

## 6. Lots

- **Lot 1 — Assainir et durcir le dépôt** [IA] : commande « Tout vérifier »
  corrigée partout (`node .githooks/run-checks.mjs`) ; restes obsolètes
  supprimés (ancien lanceur bash, versions Python de `check-docs` et de
  `cadrage`, ancien garde-fou Python du dossier scripts) ; `.githooks/tableau-de-bord.mjs`
  et `.githooks/creer-release.mjs` rattachés à la fiche de mécanique ;
  QUA-016 passé en « bloquant » sur ce dépôt ; entrée de permission
  erronée du gabarit corrigée. Critère de sortie : `check-docs` sans
  erreur ni fichier hors fiche, suite verte.
- **Lot 2 — Hooks Claude et défaut bloquant** [IA] : hooks branchés dans le
  dépôt ; refus avant écriture en bloquant ; défaut du gabarit à bloquant ;
  contrats QUA-016 (dépôt, gabarit fr/en) et docs alignés. Fait le
  2026-10-06.
- **Lot 3 — « Un changement de code a sa fiche »** [IA, après cadrage] :
  contrôle au commit / en CI sur le changement lui-même (ex. une branche
  qui modifie du code doit ajouter ou modifier une fiche, ou citer
  l'entretien courant). Conception à cadrer avant tout code.

## 7. Reprise

- **Dernier état** (2026-10-06) : lot 1 livré — commande « Tout vérifier »
  corrigée (`AGENTS.md`, contrats, recette, intention, README du paquet) ;
  4 restes obsolètes supprimés ; tableau de bord et script de release
  rattachés à la fiche de mécanique ; QUA-016 bloquant ; permission
  erronée du gabarit corrigée. Preuves : `check-docs` 0 erreur et 0
  fichier hors fiche ; un fichier de code orphelin ajouté pour essai est
  refusé (exit 1) ; `node .githooks/run-checks.mjs` vert ; suite 84/84.
  Reste : 3 fiches historiques sans champ Risque (avertissement DRWIL-012).
  Lot 2 : hooks Claude branchés (dépôt), refus avant écriture en bloquant,
  défaut du gabarit à bloquant, modules optionnels couverts d'avance par
  la fiche de mécanique (sinon les activer aurait bloqué un commit) ;
  QUA-016 désormais prouvé automatiquement sur ce dépôt (PASS). Parité
  dépôt / gabarit vérifiée : hooks git, modules activés, hooks Claude et
  leur branchement identiques ; skill `/drwil` et recette d'adoption
  réalignés (oublis antérieurs) ; écarts restants : recettes
  `docs/recettes/deployer-en-prod.md` et `docs/recettes/refactorer-sans-casser.md`
  restées à une ancienne version (à relire avant d'écraser),
  `docs/recettes/travailler-en-branche.md` plus riche que le gabarit (à remonter),
  permissions Claude et CI propres au dépôt (voulu).
- **Travail non commité** : aucun.
- **Prochaine étape** : [humain] relire et fusionner la PR ; [décision]
  cadrer le lot 3.

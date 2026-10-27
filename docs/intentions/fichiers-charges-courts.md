# Intention : surveiller la taille des fichiers générés par drwil, hooks d'agent et `AGENTS.md` compris

**Statut** : proposée le 2026-10-27 — demande de l'humain, après la
clôture des quatre chantiers de la taille des fichiers (plafond à 200
lignes et découpes, `.githooks/check-file-size.legacy.json` vidé) ;
élargie le même jour à un mécanisme de surveillance livré dans le paquet,
en tête de pile, dans la 0.10.0 avec les quatre chantiers de taille
(demande de l'humain).

## Besoin

Deux restes de la taille des fichiers, relevés le 2026-10-27 sur les
fichiers que la CLI installe chez un projet :

1. **Des hooks d'agent hors du plafond.** QUA-001 (fichier de code
   plafonné) couvre `packages/drwil/src/`, `packages/drwil/bin/`,
   `.githooks/` et `outils/`, pas `.claude/hooks/`. Deux hooks livrés y
   dépassent 200 lignes. Un hook qui intercepte chaque commande ou chaque
   message de l'agent doit rester simple à relire : un défaut y bloque ou
   laisse passer sans bruit.
2. **Une « taxe de session ».** `AGENTS.md` est chargé à chaque session par
   tout agent, chez tout projet (`CLAUDE.md` et `GEMINI.md` l'importent) :
   chaque ligne se paie à chaque requête. Le demandeur veut en faire un
   aiguillage court, qui garde en permanence l'essentiel et renvoie au
   détail (`docs/`, recettes, `node .githooks/glossary.mjs`) seulement quand
   il sert (proposition retenue le 2026-10-27 : environ 100 lignes au plus).
3. **Un mécanisme qui surveille tous les fichiers générés par drwil.**
   Corriger les deux points précédents une fois ne suffit pas : rien ne
   retient un fichier livré de regrossir. Un contrôle mécanique surveille la
   taille de chaque fichier que la CLI installe chez un projet (code, hooks,
   documents, réglages), chacun sous un plafond selon sa sorte. Il est
   **livré dans le paquet** et déclaré à l'installation : un projet adopté
   le reçoit d'office, sans le choisir, et il ne porte que sur les fichiers
   du kit, jamais sur le code du projet. Dans ce dépôt, le même contrôle
   joue sur le gabarit (`packages/drwil/templates/`), avant toute release.

## Existant (relevé le 2026-10-27)

- Hooks d'agent livrés, dans
  `packages/drwil/templates/common/tools/claude/.claude/hooks/` :
  bash-guard.mjs (276 lignes), prompt-hook.mjs (227), scope-reminder.mjs
  (151), read-guard.mjs (92), id-glossary.mjs (60), reply-glossary.mjs (38).
  Les mêmes scripts servent Gemini CLI et Copilot CLI (un seul jeu, seule
  la déclaration diffère).
- `packages/drwil/templates/common/base/AGENTS.md` : 247 lignes, dont la
  section « Conduct » (lignes 14 à 149, environ 135 lignes) ; puis
  « Contracts », « Load context progressively », « Commands »,
  « Conventions ». Le `AGENTS.md` de ce dépôt, écart déclaré dans
  `outils/miroirs.json` : 169 lignes.
- La table « Si tu touches à… lis d'abord » de `AGENTS.md` aiguille déjà
  vers les recettes : le modèle de l'aiguillage existe.
- Autres documents livrés au-dessus de 200 lignes, lus à la demande et non
  à chaque session : `packages/drwil/templates/common/base/docs/ia-first.md`
  (729) et
  `packages/drwil/templates/common/base/docs/recipes/working-with-branches.md`
  (203).
- Voisine : `docs/intentions/accueil-drwil-a-l-ouverture.md`, un accueil
  court et gratuit à l'ouverture d'une session.

## Piste

- Un contrôle de la taille du kit lit la liste des fichiers installés
  (`.drwil/installed-files.json` (si présent) chez un projet, le gabarit dans
  ce dépôt) et compare chacun au plafond de sa sorte : 200 lignes pour le
  code et les hooks (QUA-001), un plafond propre aux documents chargés à
  chaque session (`AGENTS.md`), un autre, plus large, pour les documents
  lus à la demande. Un fichier du kit modifié à la main par le projet reste
  surveillé : c'est lui qui le fait grossir.

- QUA-001 étend son périmètre à `.claude/hooks/` (fichiers mjs, dépôt et
  gabarit) ; bash-guard.mjs et prompt-hook.mjs sont découpés sous 200
  lignes, sans plafond hérité.
- `AGENTS.md` (gabarit, puis la copie du dépôt) devient un aiguillage :
  les règles qu'un agent doit avoir en tête à chaque message restent, en
  une ligne chacune ; leur détail part dans un document de `docs/` cité,
  lu quand la situation le demande. Un contrôle tient son plafond.
- Mesurer avant et après : contexte relu par requête sur un chantier
  comparable (`node .githooks/consumption.mjs --recorded`), pour savoir ce
  que l'aiguillage fait gagner.

## Décisions (sondage du 2026-10-27)

Cadrées en trois fiches, dans l'ordre : `docs/projects/journal.md` (hooks-agent-sous-le-plafond),
`docs/projects/journal.md`, `docs/projects/surveillance-taille-du-kit.md`.

- `AGENTS.md` : 100 lignes, gabarit et copie du dépôt ; règles sans contrôle
  machine en une ligne chacune, détail renvoyé à `docs/`.
- `docs/ia-first.md` : lu par section avec `node .githooks/glossary.mjs`,
  pas découpé.
- Plafonds du kit, en lignes : 200 (code, hooks), 100 (`AGENTS.md`), 800
  (documents lus à la demande), 250 (recettes).
- Un dépassement bloque sur le gabarit de ce dépôt et avertit chez un projet adopté.
- La mise à jour d'`AGENTS.md` chez un projet adopté ne perd rien (fiche `agents-md-court`).
- Un outil de découpe et des fiches d'allègement à l'adoption : intention séparée, pour plus tard (`docs/intentions/alleger-les-fichiers-de-l-adoptant.md`).
- Contrat neuf pour la taille du kit ; QUA-001 garde le code.

## Questions à trancher

- Le point 1 est fait (2026-10-27) : bash-guard (276 lignes) et prompt-hook
  (227) sont découpés (`shell-split`, `start-poll`), les hooks d'agent du
  dépôt et du gabarit sont sous le contrôle `taille-fichiers` (QUA-001).
- Le point 2 est fait (2026-10-27) : `AGENTS.md` du gabarit 93 lignes (247
  avant), celui du dépôt 76 (169 avant) ; le détail des règles est dans la
  section 8 de `docs/ia-first.md`, qui passe de 729 à 916 lignes, donc
  au-dessus du plafond de 800 prévu pour les documents lus à la demande :
  fallait-il garder ce détail dans `docs/ia-first.md` (décision 4 : pas de
  découpe) ou le sortir dans un document à part, avant que la fiche
  `surveillance-taille-du-kit` ne pose le plafond ? [décision]

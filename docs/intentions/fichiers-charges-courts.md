# Intention : les hooks d'agent sous le plafond, et un `AGENTS.md` court qui aiguille vers le détail

**Statut** : proposée le 2026-10-27 — demande de l'humain, après la
clôture des quatre chantiers de la taille des fichiers (plafond à 200
lignes et découpes, `.githooks/check-file-size.legacy.json` vidé).

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

## Questions à trancher

- [décision] Plafond d'`AGENTS.md` : 100 lignes, 150, ou une taille en
  octets (ce que paie le contexte) ? Pour le gabarit seulement, ou aussi
  pour la copie du dépôt ?
- [décision] Quelles règles restent dans l'aiguillage ? Celles qu'aucun
  contrôle ne rattrape (« Conduct (always, no machine checks it) ») sont
  celles qu'un agent risque d'oublier s'il ne les voit pas : les garder en
  une ligne, ou les renvoyer au détail ?
- [décision] Le plafond d'`AGENTS.md` : un nouveau contrat, ou QUA-001
  étendu aux documents chargés à chaque session ?
- [décision] `docs/ia-first.md` (729 lignes, lu à la demande) : découpé
  en documents par sujet, ou lu par section comme le registre avec
  `node .githooks/glossary.mjs` ?
- [décision] Cadré avant les fiches 5 et suivantes, ou entre deux
  chantiers comme un thème ?

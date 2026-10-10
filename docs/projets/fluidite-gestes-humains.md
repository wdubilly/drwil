# Projet : deux gestes humains par chantier — lancer depuis le chat, fusionner

**Statut** : cadré le 2026-10-10 — lot 1 à démarrer.
**Risque** : HIGH

<!-- cadrage
fichiers:
  - packages/drwil/templates/common/base/.githooks/etat.mjs
  - packages/drwil/templates/common/base/.githooks/etat.test.mjs
  - .githooks/etat.mjs
  - .githooks/etat.test.mjs
  - packages/drwil/templates/common/tools/claude/.claude/hooks/saisie-drwil.mjs
  - .claude/hooks/saisie-drwil.mjs
  - packages/drwil/templates/common/tools/claude/.claude/settings.json
  - .claude/settings.json
  - packages/drwil/templates/fr/base/AGENTS.md
  - packages/drwil/templates/en/base/AGENTS.md
  - AGENTS.md
  - packages/drwil/templates/fr/base/docs/ia-first.md
  - packages/drwil/templates/en/base/docs/ia-first.md
  - packages/drwil/templates/fr/base/docs/projets/mecanique-ia-first.md
  - packages/drwil/templates/en/base/docs/projects/kit-mechanics.md
  - packages/drwil/bin/drwil.js
  - packages/drwil/test/kit.test.mjs
-->

(cadrage : la logique de « lancer » dans `.githooks/etat.mjs` (tout outil),
un adaptateur Claude Code minimal déclenché par la saisie de l'humain, les
consignes et la doc, côté dépôt et côté gabarit — QUA-018.)

## 1. Besoin

Premier levier de `docs/intentions/fluidite-sans-perte-de-rigueur.md`. Le
2026-10-09, un chantier demandait trois gestes humains dans un terminal
(ouvrir l'attente, lancer la réalisation, clore) en plus de la fusion de la
PR ; le préfixe `!` de Claude Code ne fournit pas de terminal interactif.
Le processus (intention, cadrage, réalisation, preuves, vérification,
clôture, fusion) reste identique ; seuls changent les gestes demandés à
l'humain : **lancer** (depuis le chat) et **fusionner**.

## 2. Hors périmètre

- Les autres leviers de l'intention (regroupements, attestation groupée,
  vue de relecture).
- Changer le format de `.drwil/state.json` (si présent) ou ses activités :
  ni champ ni activité ajoutés, aucun état existant à migrer.
- Contrôler l'élargissement du cadrage en cours de chantier (décision C :
  signalé à la fusion, par la future vue de relecture).

## 3. Contraintes

- Aucune transition qui ouvre des droits ne devient décidable par l'agent
  seul : « lancer » ne s'exécute que sur une saisie de l'humain (hook de
  l'outil) ou dans un terminal interactif.
- Agnostique de l'agent : la logique vit dans `.githooks/etat.mjs` ; le
  hook Claude Code n'est qu'un adaptateur, le terminal reste le repli.
- Le réglage `transitions` garde son sens : `humain` (défaut), seul
  « lancer » exige l'humain ; `agent`, tout est libre.

## 4. Décisions

- **2026-10-10 — A. Lancer en un seul geste, depuis le chat** : une
  transition humaine unique, depuis CADRAGE, ATTENTE ou DEMANDE, écrit
  directement l'état en REALISATION sur la fiche choisie. Dans Claude Code,
  l'humain tape `drwil lancer <fiche>` dans le chat ; un hook déclenché par
  sa saisie (`UserPromptSubmit`) fait la transition — c'est l'outil qui
  l'exécute sur le texte tapé par l'humain, le modèle ne peut pas produire
  cette saisie. Sans fiche, `drwil lancer` liste les **fiches cadrées**
  (bloc `cadrage` commité dans `HEAD`, statut non terminé, hors modèles).
  Repli pour les autres outils : `node .githooks/etat.mjs lancer <fiche>`
  dans un terminal interactif. ATTENTE et DEMANDE restent des étapes
  libres, facultatives. [décision utilisateur]
- **2026-10-10 — B. Clôture automatique** : VERIFY → CLOTURE ne demande
  plus de geste humain ; elle exige toujours l'évidence de `drwil verify
  --evidence` (PASS ou ATTESTED, sur `HEAD`, arbre propre). Raison : clore
  retire des droits ; l'acceptation reste la fusion de la PR, humaine.
  [décision utilisateur]
- **2026-10-10 — C. Élargissement du cadrage signalé à la fusion** : pas de
  geste supplémentaire ; l'élargissement reste un commit séparé, visible
  dans le diff et listé par la future vue de relecture. [décision
  utilisateur]
- **2026-10-10 — Forme : un sondage** : `/drwil-lancer` ouvre un sondage
  listant les fiches cadrées ; l'agent peut en recommander une (en tête,
  marquée « (Recommandé) », avec sa raison) ; la réponse de l'humain,
  recueillie par l'outil, déclenche la transition par un hook
  (`PostToolUse`), pas par le modèle. À vérifier avant de coder : le modèle
  ne peut pas pré-remplir la réponse ; le hook n'accepte qu'un libellé égal
  au chemin exact d'une fiche cadrée. Sinon : commande slash avec argument,
  puis terminal. [décision utilisateur]
- **Limite connue** : l'agent peut modifier le hook ou les réglages de
  l'outil pour tricher ; visible dans le diff et hors cadrage (refusé par
  la barrière), même garantie que le reste : triche détectable, pas
  impossible.

## Contrats concernés

- **QUA-016** — Rappel de cadrage : « lancer » valide le cadrage commité de
  la fiche.
- **QUA-018** — Périmètre explicite : dépôt drwil vs livrable gabarit : le
  chantier vise les deux.
- **QUA-019** — Pas de contournement d'un contrôle : le hook de saisie est
  un chemin prévu, pas un contournement du terminal.

## 5. Points à trancher

- [décision] Syntaxe exacte reconnue dans le chat : `drwil lancer <fiche>`
  seul sur la ligne, ou aussi en début de message suivi d'autre texte ?
- [décision] Le message qui lance est-il ensuite transmis à l'agent (pour
  qu'il enchaîne) ou consommé par le hook ?

## 6. Lots

- **Lot 1 — lancer et clôture automatique** [IA] : `lancer` dans
  `.githooks/etat.mjs` (liste des fiches cadrées, transition directe vers
  REALISATION, humain requis en mode `humain`), clôture sans geste humain,
  adaptateur Claude Code sur la saisie, consignes et doc. Critère de sortie :
  tests (lancer refusé à l'agent sans saisie humaine, accepté par le hook ;
  liste des fiches cadrées ; clôture libre sur évidence valide et refusée
  sans) ; un cycle réel lancé depuis le chat ; contrôles et CI verts.

## 7. Reprise

- **Dernier état** (2026-10-10) : fiche cadrée, décisions A, B et C prises ;
  rien de réalisé. Pistes discutées pour « lancer » dans le chat : commande
  slash `/drwil-lancer` (sans argument : liste numérotée des fiches
  cadrées), puis peut-être un sondage dont la réponse est lue par un hook
  `PostToolUse` (à vérifier : le modèle ne doit pas pouvoir pré-remplir la
  réponse). Principe agnostique retenu : cœur dans `.githooks/etat.mjs`,
  adaptateur dans le chat seulement pour un outil qui passe le test témoin,
  repli au terminal pour les autres ; aucun outil privilégié a priori.
- **Test témoin** (2026-10-10, dépôt jetable hors du projet) : une commande
  « drwil-temoin-cmd » du dossier des commandes de Claude Code
  (`disable-model-invocation: true`)
  contenant une ligne `` !`date … | tee -a temoin-cmd.txt` ``.
  - Copilot CLI v1.0.91 lit les dossiers de skills et de commandes de Claude Code, mais
    transmet la commande au modèle, qui l'exécute lui-même par un appel
    Shell et la réécrit : pas de garantie, repli au terminal.
  - Claude Code v2.1.296 exécute la ligne lui-même, sans appel d'outil du
    modèle : garantie probable.
  - Restent à faire dans Claude Code : le skill
    « drwil-temoin » (même ligne) et le test de
    triche (demander au modèle d'invoquer lui-même la commande ; aucune
    nouvelle ligne ne doit s'écrire sans appel Bash visible).
- **Points 5** : forme tranchée le 2026-10-10 (sondage, voir
  « Décisions ») ; reste à vérifier le pré-remplissage de la réponse.
- **Travail non commité** : aucun après le commit de cette reprise.
- **Prochaine étape** : [humain] finir le test témoin dans Claude Code
  (skill, triche) et tester le sondage (réponse non pré-remplissable) ;
  puis ouvrir l'attente et lancer la
  réalisation par l'ancien parcours (dernier usage) ; [IA] Lot 1.

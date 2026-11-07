# Projet : une limite se traite pendant le chantier ; hors cadre, l'humain choisit avant VERIFY

**Statut** : cadré le 2026-11-05.
**Risque** : HIGH
**Maturité** : prêt
**Intention** : `docs/intentions/limites-pendant-le-chantier.md`

<!-- scope
files:
  - packages/drwil/templates/common/tools/claude/.claude/hooks/limit-poll.mjs
  - packages/drwil/templates/common/tools/claude/.claude/hooks/prompt-hook.mjs
  - packages/drwil/templates/common/base/.githooks/state-limits.mjs
  - packages/drwil/templates/common/base/.githooks/close-limits.mjs
  - packages/drwil/templates/common/base/.githooks/close.mjs
  - packages/drwil/templates/common/base/.githooks/state-texts.mjs
  - packages/drwil/templates/common/base/.githooks/state-messages-fr.mjs
  - packages/drwil/templates/common/base/.githooks/state-messages-en.mjs
  - packages/drwil/templates/common/base/.githooks/state-validate.mjs
  - packages/drwil/templates/common/base/AGENTS.md
  - packages/drwil/templates/common/base/docs/ia-first/8-conduct-rules.md
  - packages/drwil/templates/common/base/docs/ia-first/7-starting-and-closing.md
  - packages/drwil/templates/common/base/docs/recipes/working-with-branches.md
  - packages/drwil/templates/common/base/docs/projects/kit-mechanics.md
  - .claude/hooks/limit-poll.mjs
  - .claude/hooks/prompt-hook.mjs
  - .githooks/state-limits.mjs
  - .githooks/close-limits.mjs
  - .githooks/close.mjs
  - .githooks/state-texts.mjs
  - .githooks/state-messages-fr.mjs
  - .githooks/state-messages-en.mjs
  - .githooks/state-validate.mjs
  - AGENTS.md
  - docs/ia-first/8-conduct-rules.md
  - docs/ia-first/7-starting-and-closing.md
  - docs/recipes/working-with-branches.md
  - docs/projects/kit-mechanics.md
  - .githooks/state-limits.test.mjs
  - .githooks/close-limits.test.mjs
  - .githooks/close.test.mjs
  - .githooks/state.test.mjs
  - packages/drwil/test/claude-hooks.test.mjs
  - docs/contracts.md
  - .drwil/ia-first.json
  - docs/architecture.md
  - docs/features.md
  - packages/drwil/CHANGELOG.md
  - docs/intentions/limites-pendant-le-chantier.md
  - docs/projects/pending.md
  - docs/projects/journal.md
-->

## 1. Besoin

Aujourd'hui, à la clôture, chaque limite non traitée devient une fiche d'intention (QUA-036). Des
limites qui auraient pu être traitées dans le chantier, contexte encore chargé, partent ainsi en
intentions. Le demandeur veut :

- une limite **dans le cadre** de la fiche (bloc `scope`, contrats déclarés) : traitée sur le champ,
  jamais notée ;
- une limite **hors cadre** : soumise à l'humain par un sondage, une fois, à la fin de BUILD et avant
  VERIFY : « traiter maintenant » (cadrage élargi sur ce oui) ou « noter en intention » ;
- la clôture refusée si une intention est née sur la branche sans ce choix de l'humain.

## Critères d'acceptation

- Le sondage des limites (`drwil-limite`) est refusé avec une réponse remplie, une valeur par
  défaut ou une recommandation ; la réponse de l'humain, lue par le hook, est enregistrée dans
  l'état pour chaque limite — `QUA-253`
- La clôture refuse une fiche d'intention ajoutée par la branche sans réponse « Noter en
  intention » enregistrée pour son chemin, et une limite répondue « Traiter maintenant » qui finit
  quand même en fiche d'intention ; elle dit quelle limite et le sondage à poser — `QUA-264`
- Le rappel de BUILD et les règles de conduite disent : limite dans le cadre, traitée sur le champ ;
  hors cadre, sondage avant VERIFY — `QUA-036`

## Contrats modifiés

- `QUA-036` — ancien critère : « chaque limite non traitée devient une fiche d'intention […] l'agent
  peut l'écrire seul » — raison : une limite hors cadre ne devient fiche d'intention que sur la
  réponse « Noter en intention » de l'humain au sondage des limites ; une limite dans le cadre se
  traite (validé par le demandeur le 2026-11-05)
- `.githooks/close.mjs` — la clôture appelle le contrôle des limites (`.githooks/close-limits.mjs` (à créer)) et refuse, avant toute écriture, une intention née sans le choix de l'humain ; aucun
  autre refus ne change (validé par le demandeur le 2026-11-05)
- `.githooks/state-texts.mjs` — le rappel de BUILD ajoute la règle des limites et la liste des
  réponses déjà enregistrées ; aucun autre rappel ne change (validé par le demandeur le 2026-11-05)
- `.githooks/state-messages-fr.mjs` — messages des limites ajoutés (rappel, enregistrement, refus) ;
  aucun message existant modifié (validé par le demandeur le 2026-11-05)
- `.githooks/state-messages-en.mjs` — mêmes messages, en anglais ; aucun message existant modifié (validé par le demandeur le 2026-11-05)
- `.githooks/state.test.mjs` — tests du rappel de BUILD et de l'enregistrement des limites ajoutés ; aucun test existant modifié (validé par le demandeur le 2026-11-07)
- `.githooks/state-validate.mjs` — champ des réponses aux limites ajouté, valable hors SCOPING seulement ; aucune autre validation ne change (validé par le demandeur le 2026-11-07)

## 2. Hors périmètre

- Les notes d'une ligne (`node .githooks/note.mjs`) : elles restent libres, l'humain s'en sert
  aussi en cours de chantier ; la règle de conduite dit seulement qu'une limite ne s'y range pas.
- Gemini CLI, Codex, Cursor : sans sondage lu par un hook, la règle de conduite seule s'applique
  (question en conversation) ; le refus de clôture vaut pour tous, l'humain y répond alors par un
  sondage Claude Code ou Copilot CLI.
- Reconstruire les réponses sur un autre clone : `resume` ne reconstruit jamais une décision
  humaine (QUA-245) ; le sondage se repose.
- L'élargissement du bloc `scope` lui-même : il reste un commit séparé signalé par la barrière ;
  la réponse « Traiter maintenant » en est le oui, et vaut aussi pour la puce « Contrats modifiés »
  que la question affiche.

## 3. Contraintes

- `.claude/hooks/prompt-hook.mjs` est à 189 lignes (plafond 200) : le sondage vit dans
  `.claude/hooks/limit-poll.mjs` (à créer), aiguillé en deux lignes, comme `.claude/hooks/queue-poll.mjs`.
- Claude Code : 4 questions au plus par sondage, donc 4 limites ; au-delà, plusieurs sondages.
- Un sous-agent ne peut pas interroger l'humain : il s'arrête avec la liste des limites hors cadre
  (chemin d'intention prévu, fichiers touchés, puce éventuelle) ; la session principale pose le
  sondage, puis relance un sous-agent.
- Les réponses vivent dans `.drwil/state.json` (si présent) (écrit par l'outil seul), comme les autres
  décisions humaines ; elles tombent au retour en SCOPING.

## 4. Décisions

Tranchées par le demandeur le 2026-11-05 :

- **Moment** : un seul sondage, à la fin de BUILD, avant VERIFY (pas une question par limite, pas à la
  clôture).
- **Accord** : un sondage lu par un hook (en-tête dédié, comme `drwil-start`), pas une simple
  consigne.
- **Contrôle** : la clôture refuse une limite hors cadre non soumise (contrôle dur, prouvé par un
  test), pas un simple avertissement.
- **Forme du sondage** (proposée par l'agent dans la ligne de ces choix) : une question par limite,
  en-tête `drwil-limite`, le texte nomme la limite, les fichiers qu'elle toucherait, la puce
  éventuelle et le chemin `docs/intentions/<nom>.md` qu'elle deviendrait ; deux réponses,
  « Traiter maintenant » et « Noter en intention », aucune recommandée.

## 5. Points à trancher

Aucun.

## 6. Increments

- **Lot 1 — sondage et enregistrement** [IA] : `.claude/hooks/limit-poll.mjs` (à créer), `.githooks/state-limits.mjs` (à créer), aiguillage,
  rappel de BUILD, messages. Critère de sortie : tests du premier contrat verts.
- **Lot 2 — refus de clôture et règles** [IA] : `.githooks/close-limits.mjs` (à créer), branchement dans `.githooks/close.mjs`,
  QUA-036 modifié, règles de conduite, recette, doc. Critère de sortie : tests du second contrat
  verts, `GOVERNANCE: PASS`.

## 7. Reprise

- **Dernier état** (2026-11-07) : lot 1 fait — sondage `drwil-limite` (`.claude/hooks/limit-poll.mjs`, aiguillé
  par `.claude/hooks/prompt-hook.mjs`), enregistrement `limits: [{ intent, choice }]` (`.githooks/state-limits.mjs`,
  champ validé par `.githooks/state-validate.mjs`), règle des limites et réponses dans le contexte de BUILD, contrat
  `QUA-253` et contrôle `tests-qua-253` (tests verts). `.githooks/state-messages-fr.mjs` est à 200 lignes (plafond) :
  les textes du refus de clôture du lot 2 vont dans `.githooks/close-limits.mjs` (à créer). Un sondage posé alors que
  `.githooks/state-limits.mjs` manque passe sans contrôle (une erreur de hook ne bloque jamais).
- **Lot 2** (2026-11-07) : fait — `.githooks/close-limits.mjs` (`limitProblems`) branché dans `.githooks/close.mjs` :
  une fiche d'intention ajoutée par la branche sans réponse « Noter en intention », ou répondue « Traiter maintenant »,
  refuse la clôture avant toute écriture (contrat `QUA-264`, contrôle `tests-qua-264`) ; `QUA-036` modifié ; règles de
  conduite (`AGENTS.md`, section 8), section 7, recette des branches, carte, fonctionnalités et changelog.
- **Prochaine étape** : vérifier et clore.

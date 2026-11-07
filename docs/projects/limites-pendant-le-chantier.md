# Projet : une limite se traite pendant le chantier ; hors cadre, l'humain choisit avant VERIFY

**Statut** : cadré le 2026-11-05.
**Risque** : HIGH
**Maturité** : prêt
**Intention** : `docs/intentions/limites-pendant-le-chantier.md`

<!-- scope
files:
  - packages/drwil/templates/common/tools/claude/.claude/hooks/limit-poll.mjs
  - packages/drwil/templates/common/tools/claude/.claude/hooks/prompt-hook.mjs
  - packages/drwil/templates/common/tools/claude/.claude/hooks/merge-poll.mjs
  - packages/drwil/templates/common/base/.githooks/state-merge.mjs
  - packages/drwil/templates/common/base/.githooks/state-resume.mjs
  - packages/drwil/templates/common/base/.githooks/state-limits.mjs
  - packages/drwil/templates/common/base/.githooks/close-limits.mjs
  - packages/drwil/templates/common/base/.githooks/close.mjs
  - packages/drwil/templates/common/base/.githooks/state-texts.mjs
  - packages/drwil/templates/common/base/.githooks/state-context-texts.mjs
  - packages/drwil/templates/common/base/.githooks/close-texts.mjs
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
  - .claude/hooks/merge-poll.mjs
  - .githooks/state-merge.mjs
  - .githooks/state-resume.mjs
  - .githooks/state-limits.mjs
  - .githooks/close-limits.mjs
  - .githooks/close.mjs
  - .githooks/state-texts.mjs
  - .githooks/state-context-texts.mjs
  - .githooks/close-texts.mjs
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
  - .githooks/state-merge.test.mjs
  - .githooks/state-resume.test.mjs
  - packages/drwil/test/claude-hooks.test.mjs
  - docs/contracts.md
  - .drwil/ia-first.json
  - docs/architecture.md
  - docs/features.md
  - packages/drwil/CHANGELOG.md
  - docs/intentions/limites-pendant-le-chantier.md
  - docs/projects/pending.md
  - docs/projects/journal.md
  - packages/drwil/templates/common/tools/claude/.claude/hooks/portable-polls.mjs
  - .claude/hooks/portable-polls.mjs
  - packages/drwil/src/cli-cursor.ts
  - packages/drwil/test/portable-polls.test.mjs
  - package.json
  - packages/drwil/templates/common/base/docs/ia-first/6-limits-and-tool-compatibility.md
  - docs/ia-first/6-limits-and-tool-compatibility.md
  - packages/drwil/templates/common/base/.githooks/close-journal.mjs
  - .githooks/close-journal.mjs
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
- Sous Copilot CLI, Gemini CLI, Codex et le client ACP de Cursor, les sondages `drwil-limite` et
  `drwil-merge` sont lus par le hook, avec les mêmes refus que sous Claude Code (réponse remplie,
  défaut, recommandation), prouvés par la vraie commande de chaque outil — `QUA-266`
- La clôture ne compte plus pour une seconde entrée du journal celle d'un autre chantier qui ne fait
  que citer la branche — `QUA-228`

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
- `.githooks/state-context-texts.mjs` — le rappel de CLOSING dit qu'une limite ne devient fiche d'intention que sur la réponse « Noter en intention » au sondage des limites, et le rappel de fusion automatique la dit « autorisée par l'humain (au lancement ou par le sondage `drwil-merge`) » au lieu de « autorisée au lancement » ; aucun autre rappel ne change (validé par le demandeur le 2026-11-07, réponse « Traiter maintenant » au sondage des limites)
- `.githooks/close-texts.mjs` — le texte `rest` de la clôture dit la même règle ; aucun autre message ne change (validé par le demandeur le 2026-11-07, réponse « Traiter maintenant » au sondage des limites)
- `.githooks/state.test.mjs` — le test QUA-036 du rappel de CLOSING suit la nouvelle phrase (validé par le demandeur le 2026-11-07, réponse « Traiter maintenant » au sondage des limites)
- `QUA-247` — ancien critère : « Il ne reconstruit jamais la fusion automatique, la file ni la réouverture : le message dit qu'elles sont à redemander » — raison : il ne les reconstruit toujours pas, et son message dit en plus comment redonner la fusion automatique : le sondage `drwil-merge`, lu par le hook (validé par le demandeur le 2026-11-07, réponse « Traiter maintenant » au sondage des limites)
- `.githooks/state-resume.mjs` — le message de reprise dit comment redonner la fusion automatique (sondage `drwil-merge`) ; rien d'autre ne change (validé par le demandeur le 2026-11-07, réponse « Traiter maintenant » au sondage des limites)
- `.claude/hooks/prompt-hook.mjs` — aiguillage du sondage autonome `drwil-merge` (fusion automatique redonnée de BUILD à CLOSING) ; aucun autre sondage ne change (validé par le demandeur le 2026-11-07, réponse « Traiter maintenant » au sondage des limites)
- `.githooks/state-resume.test.mjs` — test du message de reprise ajouté ; aucun test existant modifié (validé par le demandeur le 2026-11-07, réponse « Traiter maintenant » au sondage des limites)
- `.claude/hooks/prompt-hook.mjs` — sous Gemini CLI et Codex, l'entrée native (`prompt-hook.mjs gemini|codex`) aiguille aussi les sondages `drwil-limite` et `drwil-merge` vers `.claude/hooks/portable-polls.mjs` (à créer), au lieu de la seule attestation ; l'attestation et les autres sondages ne changent pas (validé par le demandeur le 2026-11-07, réponse « Traiter maintenant » au sondage des limites, parité des sondages hors Claude Code)
- `packages/drwil/src/cli-cursor.ts` — le client ACP de Cursor (`drwil cursor-acp`) passe aussi ses questions au hook des sondages `drwil-limite` et `drwil-merge` ; l'attestation ne change pas (validé par le demandeur le 2026-11-07, réponse « Traiter maintenant » au sondage des limites, parité des sondages hors Claude Code)
- `package.json` — le contrôle de couverture des hooks partagés (`test:claude:coverage`) inclut les tests des sondages portables ; seuils inchangés (validé par le demandeur le 2026-11-07, réponse « Traiter maintenant » au sondage des limites, parité des sondages hors Claude Code)
- `QUA-228` — ancien critère : « L'entrée est reconnue par la preuve déjà citée, le titre de la fiche, son nom ou sa branche » — raison : une simple mention de la branche dans l'entrée d'un autre chantier comptait pour une seconde entrée et refusait la clôture ; la branche ne compte plus que sur la ligne de clôture de l'entrée (« Clôturé par », « Closed by »), ou à défaut de toute autre entrée reconnue (validé par le demandeur le 2026-11-07, réponse « Traiter maintenant » au sondage des limites, reconnaissance de l'entrée du journal)
- `.githooks/close-journal.mjs` — reconnaissance de l'entrée du journal resserrée (QUA-228) ; aucun autre comportement de la clôture ne change (validé par le demandeur le 2026-11-07, réponse « Traiter maintenant » au sondage des limites, reconnaissance de l'entrée du journal)
- `.githooks/close.test.mjs` — tests de la reconnaissance de l'entrée du journal ajoutés ; aucun test existant modifié (validé par le demandeur le 2026-11-07, réponse « Traiter maintenant » au sondage des limites, reconnaissance de l'entrée du journal)

## 2. Hors périmètre

- Les notes d'une ligne (`node .githooks/note.mjs`) : elles restent libres, l'humain s'en sert
  aussi en cours de chantier ; la règle de conduite dit seulement qu'une limite ne s'y range pas.
- Le chat habituel de Cursor : aucun hook natif n'y est établi ; les sondages `drwil-limite` et
  `drwil-merge` y passent par le client ACP dédié (`drwil cursor-acp`), comme l'attestation.
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
- **Réouverture** (2026-11-07, QUA-116, PR #373) : deux limites hors cadre répondues « Traiter maintenant » —
  parité des sondages `drwil-limite` et `drwil-merge` hors Claude Code (l'entrée native de Gemini CLI et de Codex
  n'aiguillait que l'attestation ; Copilot CLI les lit par `.claude/settings.json`) et reconnaissance de l'entrée du
  journal (`.githooks/close-journal.mjs`). Cadrage élargi dans un commit séparé.
- **Réalisation de la réouverture** (2026-11-07) : `.claude/hooks/portable-polls.mjs` (QUA-266), entrée native de
  `.claude/hooks/prompt-hook.mjs`, `crochetCursor` du client ACP, reconnaissance de l'entrée du journal (QUA-228),
  doc et changelog ; tests verts. Le commit est refusé par la barrière tant que l'humain n'a pas donné son oui au
  correctif de réouverture (`node .githooks/detour.mjs allow`, terminal) ; QUA-063 et QUA-236 sont à réattester
  (fichiers couverts modifiés).
- **Prochaine étape** : commiter (deux commits : journal, puis parité), vérifier et clore à nouveau.

# Projet : la fusion automatique est le comportement par défaut, sans sondage

**Statut** : cadré le 2026-11-12.
**Risque** : HIGH
**Maturité** : prêt
**Intention** : `docs/intentions/retours-du-demandeur-0-11-2.md` (point 4)

<!-- scope
files:
  - packages/drwil/templates/common/base/.githooks/merge-auto.mjs
  - packages/drwil/templates/common/base/.githooks/state-merge.mjs
  - packages/drwil/templates/common/base/.githooks/state-validate.mjs
  - packages/drwil/templates/common/base/.githooks/state-context-texts.mjs
  - packages/drwil/templates/common/base/.githooks/state-messages-fr.mjs
  - packages/drwil/templates/common/base/.githooks/state-messages-en.mjs
  - packages/drwil/templates/common/base/.githooks/state.mjs
  - packages/drwil/templates/common/base/.githooks/state-transitions.mjs
  - .githooks/state.mjs
  - .githooks/state-transitions.mjs
  - packages/drwil/templates/common/base/.githooks/state-texts.mjs
  - packages/drwil/templates/common/base/.githooks/state-resume.mjs
  - packages/drwil/templates/common/base/.githooks/detour.mjs
  - packages/drwil/templates/common/base/.githooks/detour-texts.mjs
  - .githooks/state-texts.mjs
  - .githooks/state-resume.mjs
  - .githooks/detour.mjs
  - .githooks/detour-texts.mjs
  - packages/drwil/templates/common/base/.githooks/contracts.mjs
  - packages/drwil/templates/common/base/.githooks/contracts-validate.mjs
  - .githooks/contracts.mjs
  - .githooks/contracts-validate.mjs
  - .githooks/contracts.test.mjs
  - packages/drwil/src/verify.ts
  - packages/drwil/src/closure.ts
  - packages/drwil/src/coverage.ts
  - packages/drwil/src/doctor.ts
  - packages/drwil/src/serve-watch.ts
  - packages/drwil/src/serve-board.ts
  - packages/drwil/templates/common/tools/claude/.claude/hooks/merge-poll.mjs
  - packages/drwil/templates/common/tools/claude/.claude/hooks/start-poll.mjs
  - packages/drwil/templates/common/tools/claude/.claude/hooks/queue-poll.mjs
  - packages/drwil/templates/common/tools/claude/.claude/hooks/portable-polls.mjs
  - packages/drwil/templates/common/tools/claude/.claude/hooks/prompt-hook.mjs
  - packages/drwil/templates/common/tools/claude/.claude/skills/start-a-workstream/SKILL.md
  - packages/drwil/templates/common/tools/claude/.claude/skills/scope-a-workstream/SKILL.md
  - packages/drwil/templates/common/base/docs/ia-first/7-starting-and-closing.md
  - packages/drwil/templates/common/base/docs/ia-first/8-conduct-rules.md
  - packages/drwil/templates/common/base/AGENTS.md
  - packages/drwil/templates/common/base/docs/recipes/working-with-branches.md
  - docs/recipes/working-with-branches.md
  - .githooks/merge-auto.test.mjs
  - .githooks/merge-auto-forge.test.mjs
  - .githooks/worktree.test.mjs
  - .githooks/state-resume.test.mjs
  - .githooks/detour.test.mjs
  - .githooks/state-merge.test.mjs
  - .githooks/state.test.mjs
  - packages/drwil/test/claude-hooks.test.mjs
  - packages/drwil/test/portable-polls.test.mjs
  - packages/drwil/test/kit.test.mjs
  - packages/drwil/test/serve.test.mjs
  - docs/contracts.md
  - docs/architecture.md
  - docs/projects/pending.md
  - docs/projects/journal.md
  - .drwil/ia-first.json
  - packages/drwil/CHANGELOG.md
  - packages/drwil/test/guarantees.test.mjs
  - packages/drwil/templates/common/base/.githooks/state-cli.mjs
  - .githooks/state-cli-process.test.mjs
  - packages/drwil/templates/common/base/docs/ia-first/6-limits-and-tool-compatibility.md
  - packages/drwil/templates/common/tools/claude/.claude/skills/drwil/SKILL.md
  - docs/features.md
  - packages/drwil/src/serve-texts.ts
  - packages/drwil/serve/page.html
  - packages/drwil/templates/common/base/docs/projects/kit-mechanics.md
  - docs/projects/kit-mechanics.md
-->

## 1. Besoin

Le demandeur veut que la fusion automatique soit le comportement par défaut : plus de sondage `drwil-merge` au
lancement d'un chantier, plus de sondage `drwil-scope` à la fin d'un cadrage. Aujourd'hui l'autorisation
« Automatic merge » est une réponse humaine, lue par un hook (`merge-poll`, supprimé par ce chantier), sans laquelle
`.githooks/merge-auto.mjs` refuse (QUA-163).

## Critères d'acceptation

- Après la clôture d'un chantier et son push, `.githooks/merge-auto.mjs` programme la fusion sans autorisation
  préalable de l'humain, avec toutes ses autres garanties (état calculé, mise à jour si en retard, relecture sur la
  forge) — `QUA-161`
- Les garde-fous restent : jamais de fusion programmée sur un état inconnu, en retard, en conflit, une MR fermée ou
  d'une autre branche ; la PR (MR) dont la branche (`headRefName`) n'est pas la branche git courante est refusée sans
  rien programmer — `QUA-162`
- Tant que la marque `merge_cancelled` (fusion annulée par une réouverture non aboutie) est dans l'état,
  `.githooks/merge-auto.mjs` refuse sans appel à la forge : la reprogrammation reste à l'humain — `QUA-181`
- L'outil d'état n'écrit plus `auto_merge` (lancement, file, sondage `drwil-merge`) ni `scoping_merge` (fin de
  cadrage) ; les marques déjà écrites restent lisibles, sans effet — `QUA-188`
- Un contrat retiré reste au registre, marqué « **Retiré** : <date> — <raison> », sans preuve (ni Contrôle ni Manuel),
  citable par le journal, les preuves et les recettes, et n'est jamais compté PASS ni ATTESTED par `drwil verify` ; un
  champ Retiré sans date ou sans raison est refusé — `QUA-298`
- Le sondage de lancement ne pose plus `drwil-merge` et celui de fin de cadrage disparaît ; un cadrage poussé voit sa
  PR mise en fusion automatique par l'agent — `QUA-187`
- Un réglage hérité (`auto_merge`, `scoping_merge`) dans un état existant ne casse rien — `QUA-188`

## Contrats modifiés

- `QUA-163` — ancien critère : « L'outil de fusion automatique ne s'exécute qu'avec l'autorisation « Automatic merge » donnée au lancement » — raison : la fusion automatique est le comportement par défaut, sans autorisation (validé le 2026-11-12)
- `QUA-187` — ancien critère : « En fin de cadrage, le skill pose un sondage à trois réponses » — raison : le sondage de fin de cadrage est retiré (validé le 2026-11-12)
- `QUA-188` — ancien critère : « La réponse « Automatic merge » de fin de cadrage ouvre l'outil de fusion automatique pour la PR de sa branche » — raison : plus de réponse, la PR de la branche est mise en fusion automatique d'office (validé le 2026-11-12)
- `QUA-164` — ancien critère : « La consigne de l'état et le skill de lancement appellent l'outil de fusion automatique » — raison : l'appel n'est plus conditionné à une autorisation (validé le 2026-11-12)
- `QUA-266` — ancien critère : sondages `drwil-limite` et `drwil-merge` lus par le hook sous les autres outils — raison : `drwil-merge` n'existe plus (validé le 2026-11-12)
- `QUA-162` — ancien critère : « L'outil de fusion automatique ne programme jamais sur un état inconnu ou pas à jour, et ne dit jamais la fusion programmée sans l'avoir vue » (sans condition sur la branche hors SCOPING) — raison : la PR dont la branche (`headRefName`) n'est pas la branche git courante est refusée, garde-fou qui remplace l'autorisation (validé le 2026-11-13)
- `QUA-181` — ancien critère : « `merge-auto` qui voit la fusion programmée sur la PR de la marque `merge_cancelled` l'efface ; l'outil ne reprogramme jamais seul : `merge-auto` exige toujours l'autorisation de l'humain (QUA-163, QUA-188) » — raison : sans autorisation, `merge-auto` refuse tant que la marque est présente (réouverture non aboutie), la reprogrammation reste à l'humain (validé le 2026-11-13)
- `QUA-189` — marqué « Retiré le 2026-11-13 » au registre (règle conservée pour l'historique), sans contrôle ni tests ; ancien critère : « « Manual merge » et « Continue scoping » ne programment rien ; « Continue scoping » garde la branche et la PR » — raison : le sondage de fin de cadrage est retiré, la PR de cadrage est mise en fusion automatique d'office (validé le 2026-11-13)
- `QUA-265` — marqué « Retiré le 2026-11-13 » au registre (règle conservée pour l'historique), sans contrôle ni tests ; ancien critère : « La fusion automatique se redonne en cours de chantier par un sondage `drwil-merge` dont la réponse humaine est lue par le hook » — raison : la fusion automatique est le comportement par défaut, il n'y a plus rien à redonner ; le module `state-merge` (supprimé au lot 2) lit encore les marques héritées sans les produire (validé le 2026-11-13)
- `QUA-037` — ancien critère : « Une file de chantiers décidée d'un geste », la fusion automatique de la file décidée par l'humain (seconde question `drwil-merge`, `queue_merge`) et portée au chantier suivant (`auto_merge`) — raison : la fusion automatique est le comportement par défaut, le lancement d'une file n'écrit plus `auto_merge` (validé le 2026-11-13)
- `QUA-142` — ancien critère : « Le sondage de lancement peut mener le chantier dans un nouveau worktree, sur la seule réponse de l'humain », la fusion choisie écrite dans l'état du worktree — raison : `auto_merge` n'est plus écrit (validé le 2026-11-13)
- `QUA-147` — ancien critère : « Une file de chantiers peut se lancer en parallèle, un worktree par fiche, sur la seule réponse de l'humain », chaque worktree portant la fusion — raison : `auto_merge` n'est plus écrit (validé le 2026-11-13)
- `QUA-165` — ancien critère : « Sous Copilot CLI, le sondage de lancement propose et lit un choix multiple de fiches, comme sous Claude Code », la fusion lue écrite dans l'état — raison : `auto_merge` n'est plus écrit (validé le 2026-11-13)
- `QUA-180` — ancien critère : « Sous Copilot CLI, le sondage de lancement pose le champ des fiches en choix unique », la fusion lue écrite dans l'état — raison : `auto_merge` n'est plus écrit (validé le 2026-11-13)
- `QUA-247` — ancien critère : « `resume` … ne reconstruit jamais une décision humaine », le message disant comment redonner la fusion automatique par le sondage `drwil-merge` (QUA-265) — raison : plus de sondage, la fusion automatique est le comportement par défaut (validé le 2026-11-13)
- `QUA-050` — ancien critère : « La PR du détour est intitulée « Détour de <fiche> », au mode de fusion décidé au lancement » — raison : la PR de détour est en fusion automatique, comme toute PR (validé le 2026-11-13)
- `QUA-099` — ancien critère : « Une PR de documentation seule part en fusion automatique sans question », la question `drwil-merge` gardée pour les PR qui touchent du code — raison : toute PR (code ou documentation) part en fusion automatique, sans question ; `drwil-merge` retiré du skill de lancement, d'`AGENTS.md` et de la section 8 (validé le 2026-11-13)
- `.githooks/state-cli.mjs` — gardé à sa version de la branche (QUA-113) : `start` au terminal ne pose plus « Retapez MERGE » (QUA-037) (validé le 2026-11-13)
- `.githooks/state-cli-process.test.mjs` — gardé à sa version de la branche (QUA-113) : le terminal simulé ne répond plus à la question MERGE (validé le 2026-11-13)
- `.githooks/state-transitions.mjs` — gardé à sa version de la branche (QUA-113) (validé le 2026-11-13)
- `.githooks/contracts.mjs` — gardé à sa version de la branche (QUA-113) : lit le champ Retiré (validé le 2026-11-13)
- `.githooks/contracts-validate.mjs` — gardé à sa version de la branche (QUA-113) : accepte un contrat retiré sans preuve (validé le 2026-11-13)
- `.githooks/state-texts.mjs` — gardé à sa version de la branche (QUA-113), au lot 2 (validé le 2026-11-13)
- `.githooks/state-resume.mjs` — gardé à sa version de la branche (QUA-113), au lot 2 (validé le 2026-11-13)
- `.githooks/detour.mjs` — gardé à sa version de la branche (QUA-113), au lot 2 (validé le 2026-11-13)
- `.githooks/detour-texts.mjs` — gardé à sa version de la branche (QUA-113), au lot 2 (validé le 2026-11-13)
- `tests-qua-189` — contrôle retiré avec QUA-189 (validé le 2026-11-13)
- `tests-qua-265` — contrôle retiré avec QUA-265 (validé le 2026-11-13)
- `.githooks/merge-auto.mjs` — gardé à sa version de la branche (QUA-113) (validé le 2026-11-12)
- `.githooks/state-merge.mjs` — gardé à sa version de la branche (QUA-113), c'est-à-dire supprimé avec son test au lot 2 : la CI le compare à la branche principale, où il reste présent jusqu'à la fusion (si présent) (validé le 2026-11-12)
- `.githooks/state-validate.mjs` — gardé à sa version de la branche (QUA-113), si le chantier le modifie (validé le 2026-11-12)
- `.githooks/state-context-texts.mjs` — gardé à sa version de la branche (QUA-113) (validé le 2026-11-13)
- `.githooks/state-messages-fr.mjs` — gardé à sa version de la branche (QUA-113) (validé le 2026-11-13)
- `.githooks/state-messages-en.mjs` — gardé à sa version de la branche (QUA-113) (validé le 2026-11-13)
- `.githooks/state.mjs` — gardé à sa version de la branche (QUA-113) (validé le 2026-11-13)

## 2. Hors périmètre

- Le client GitLab de merge-auto (`docs/projects/journal.md`, fait le 2026-11-12) : à faire avant, les deux chantiers touchent le même hook.
- Le sondage `drwil-limite`, le sondage de lancement lui-même (fiche, worktree).
- Un réglage pour refuser la fusion automatique (décidé : inconditionnelle).

## 3. Contraintes

- Décidé le 2026-11-12 : inconditionnelle, sans réglage. Le garde-fou qui remplace l'autorisation est la preuve : CI
  verte, PR de la branche active, vérification relue sur la forge.
- Les fichiers d'état déjà écrits avec `auto_merge` ou `scoping_merge` restent lisibles (QUA-013 : illisible = refus, pas succès).
- On édite le gabarit `packages/drwil/templates/` puis `npm run installer-depot` (QUA-018).

## 4. Décisions

- 2026-11-12 : fusion automatique inconditionnelle, sans réglage ; sondages `drwil-merge` et `drwil-scope` retirés ; modification de QUA-163, QUA-164, QUA-187, QUA-188 et QUA-266 validée par le demandeur.
- 2026-11-13 : QUA-181 garde son garde-fou (`merge-auto` refuse tant que la marque `merge_cancelled` est présente) ; QUA-189 et QUA-265 retirés du registre avec leurs tests ; `.githooks/state.mjs` et `.githooks/state-transitions.mjs` (gabarit, copies, tests) entrent dans le périmètre au lot 1, l'outil cesse d'y écrire `auto_merge` et `scoping_merge` ; le refus d'une PR d'une autre branche que la branche git courante s'ajoute à QUA-162 — décidé par le demandeur.
- 2026-11-13 (suite) : QUA-189 et QUA-265 restent au registre, marqués « Retiré le 2026-11-13 », sans contrôle (leurs contrôles `tests-qua-189` et `tests-qua-265` retirés) ; QUA-037, QUA-142, QUA-147, QUA-165 et QUA-180 modifiés (plus d'`auto_merge` écrit), leurs tests `.githooks/worktree.test.mjs` et `packages/drwil/test/kit.test.mjs` au périmètre ; `.githooks/merge-auto-forge.test.mjs` et `packages/drwil/test/portable-polls.test.mjs` validés au périmètre ; pour le lot 2, `.githooks/state-texts.mjs` (consigne de CLOSING inconditionnelle, QUA-164), `.githooks/state-resume.mjs` (QUA-247), `.githooks/detour.mjs` (QUA-050) et `drwil serve` (`packages/drwil/src/serve-watch.ts`, `packages/drwil/src/serve-board.ts`) entrent au périmètre — décidé par le demandeur.
- 2026-11-13 (suite) : le validateur du registre reconnaît un champ « **Retiré** : <date> — <raison> » ; un contrat qui le porte est accepté sans Contrôle ni Manuel, n'est jamais compté PASS ni ATTESTED par `drwil verify`, reste citable ; un champ Retiré mal formé est refusé ; nouveau contrat au lot 1 — décidé par le demandeur (change une règle du jeu, avec son oui).
- 2026-11-13 (suite) : `packages/drwil/src/closure.ts` (`judgeProofs`) et son test (`packages/drwil/test/kit.test.mjs`)
  entrent au périmètre : un critère d'une preuve de clôture passée lié à un contrat retiré (champ « Retiré ») est
  rapporté « retiré », ni succès ni échec, et `drwil verify` le dit (cas concret : `docs/preuves/fin-de-cadrage-sondage.md`,
  lié à QUA-189, inchangée) ; rattaché à QUA-298 (créé par ce chantier, texte mis à jour) — décidé par le demandeur.
- 2026-11-13 (suite) : la recette `docs/recipes/working-with-branches.md` (gabarit et copie) entre au périmètre : la PR
  de cadrage passe en fusion automatique, sans sondage — décidé par le demandeur.

- 2026-11-13 (suite) : QUA-099 modifié, réécrit en « toute PR (code ou documentation) part en fusion automatique,
  sans question » ; son test (`packages/drwil/test/guarantees.test.mjs`) adapté ; `drwil-merge` retiré du skill de
  lancement `start-a-workstream`, d'`AGENTS.md` (gabarit) et de la section 8 (gabarit et copies) — décidé par le
  demandeur.
- 2026-11-13 (suite) : sondage des limites, « Traiter maintenant » aux quatre limites hors cadre (la réponse vaut le oui
  de l'élargissement) : `start` au terminal ne pose plus « Retapez MERGE » (`.githooks/state-cli.mjs`, gabarit, copie
  et test ; QUA-037) ; la section 6 ne décrit plus la parité du sondage `drwil-merge`
  (`docs/ia-first/6-limits-and-tool-compatibility.md`, gabarit et copie ; QUA-266) ; le menu du skill `drwil` ne
  décrit plus `/drwil-scope` comme un sondage et `docs/features.md` ne cite plus `drwil-merge` (QUA-187) ; code mort
  retiré : textes de fusion de `drwil serve` (`packages/drwil/src/serve-texts.ts`, `packages/drwil/serve/page.html`),
  le module `state-merge` plus appelé (gabarit, copie, test ; `docs/projects/kit-mechanics.md` et la carte),
  `queue_merge` plus écrit (`.githooks/state-transitions.mjs`), un état ancien qui porte ces marques restant valide
  (QUA-188) — décidé par le demandeur.

## 5. Points à trancher

Aucun.

## 6. Increments

- **Lot 1 — outil et état** [IA] : `.githooks/merge-auto.mjs` n'exige plus d'autorisation, refuse la PR d'une autre branche que la branche courante et tant que la marque `merge_cancelled` est présente ; le module `state-merge`, `.githooks/state.mjs`, `.githooks/state-transitions.mjs` et `.githooks/state-validate.mjs` lisent sans la produire les marques héritées ; QUA-189 et QUA-265 retirés avec leurs tests et contrôles ; tests. Critère de sortie : tests de merge-auto et de l'état verts.
- **Lot 2 — sondages, skills, docs, contrats** [IA] : retrait de `drwil-merge` et `drwil-scope` des hooks et skills, consignes, `AGENTS.md`, `docs/contracts.md`, `npm run installer-depot`. Critère de sortie : `node .githooks/run-checks.mjs` sans échec, `drwil verify --agent` en `GOVERNANCE: PASS`.

## 7. Reprise

- **Dernier état** (2026-11-13) : lot 1 commité ; lot 2 commité en entier (QUA-099 réécrit, `drwil-merge` retiré du
  skill de lancement, d'`AGENTS.md` et de la section 8 ; les quatre limites répondues « Traiter maintenant » traitées :
  `start` au terminal sans « Retapez MERGE », section 6 « Limits poll parity », menu `/drwil` et `docs/features.md`,
  code mort retiré : le module `state-merge` et son test, textes de fusion de `drwil serve`, `queue_merge` plus
  écrit) ; ligne « Unreleased » du changelog.
- **Prochaine étape** : [IA] `node .githooks/state.mjs lot next`, vérification et clôture.
- **Limites hors cadre relevées** (fichiers hors du bloc scope, non traitées) : documentation visiteur qui décrit encore
  la fusion choisie au lancement ou le sondage de fin de cadrage (`README.md`, `packages/drwil/README.md`,
  `docs/recipes/adopt-the-kit.md`) ; paramètre `autoMerge` encore passé, sans effet, par `.githooks/worktree.mjs` et
  `.githooks/state-draft.mjs`.

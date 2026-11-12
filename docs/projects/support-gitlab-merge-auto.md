# Projet : la fusion automatique et le nettoyage des branches fonctionnent sur GitLab (merge-auto, close-branches)

**Statut** : cadré le 2026-11-12.
**Risque** : HIGH
**Maturité** : prêt
**Intention** : `docs/intentions/support-gitlab-et-abandon-de-detour.md` (le support GitLab de merge-auto, close-branches et detour resume ; l'abandon d'un détour reste à cadrer)

<!-- scope
files:
  - .githooks/merge-auto.mjs
  - .githooks/merge-auto.test.mjs
  - .githooks/merge-auto-forge.mjs
  - .githooks/merge-auto-forge.test.mjs
  - .githooks/close-branches.mjs
  - .githooks/close-branches.test.mjs
  - .githooks/close-checks.mjs
  - .githooks/state-resume.mjs
  - .githooks/state-reopen.mjs
  - packages/drwil/templates/common/base/.githooks/merge-auto.mjs
  - packages/drwil/templates/common/base/.githooks/merge-auto-forge.mjs
  - packages/drwil/templates/common/base/.githooks/close-branches.mjs
  - packages/drwil/templates/common/base/.githooks/close-checks.mjs
  - packages/drwil/templates/common/base/.githooks/state-resume.mjs
  - packages/drwil/templates/common/base/.githooks/state-reopen.mjs
  - .claude/skills/start-a-workstream/SKILL.md
  - packages/drwil/templates/common/tools/claude/.claude/skills/start-a-workstream/SKILL.md
  - docs/architecture.md
  - docs/projects/kit-mechanics.md
  - docs/projects/pending.md
  - docs/projects/journal.md
  - docs/contracts.md
  - .drwil/ia-first.json
-->

## 1. Besoin

Signalé par l'adoptant marinade-poulet (GitLab, glab 1.53.0), 2026-11-12. Dans `.githooks/pr-watch.mjs`, la
forge est déjà gérée (`changeForge(root)` détecte la forge, `lookMr` appelle glab, QUA-262). Le hook de fusion
automatique est resté GitHub seul (`gh pr view`, `gh pr update-branch`, `gh pr merge --auto --merge`) : sur GitLab
il sort avec « non exécuté : gh injoignable », code 2, et la fusion automatique autorisée par le sondage
`drwil-merge` ne peut jamais être programmée. Le nettoyage des branches (`mergedPullRequests`, `ghRun` dans
`.githooks/close-branches.mjs`) a le même défaut : sans gh, il ne reconnaît que les fusions classiques, pas les
squash (QUA-059) ; la reprise d'un détour et la réouverture d'un chantier en dépendent (les deux reçoivent
`gh = ghRun`).

Hors périmètre : `.githooks/run-checks-pr.mjs` (gh api, gh run download, verdicts partagés entre CI). Les
`.githooks/` installés sont générés : on corrige le gabarit `packages/drwil/templates/` puis
`npm run installer-depot` (QUA-018).

## Critères d'acceptation

- Sur un remote GitLab, avec `drwil-merge` = « Automatic merge » et une MR ouverte à CI verte, la fusion est
  programmée, `merge_when_pipeline_succeeds` relu à vrai, code 0 ; le comportement GitHub est inchangé (tests
  existants sans modification) — `QUA-161`
- Les garanties tiennent sur les deux forges : jamais de fusion programmée sur un état inconnu, en retard ou en
  conflit, MR fermée ou d'une autre branche refusée (code 1), forge ou outil injoignable en code 2, délai de
  30 minutes, jamais « programmée » sans relecture sur la forge — `QUA-162`
- Sans autorisation « Automatic merge » (ou hors PR de SCOPING autorisée), rien n'est programmé, sur les deux forges
  — `QUA-163`
- Sur GitLab, le nettoyage des branches reconnaît la branche d'une MR fusionnée en squash — `QUA-058`
- Sans l'outil de la forge joignable, seule la fusion classique est reconnue, et le message nomme l'outil de la forge
  (gh ou glab) — `QUA-059`

## Contrats modifiés

- `QUA-058` — ancien critère : « Une branche dont la PR est fusionnée sur GitHub est reconnue fusionnée, squash compris » — raison : la reconnaissance s'étend aux MR GitLab (glab mr list --merged) (validé le 2026-11-12)
- `QUA-059` — ancien critère : « Sans gh joignable, seule la fusion classique est reconnue, et c'est dit » — raison : l'outil est celui de la forge (gh ou glab), le message le nomme (validé le 2026-11-12)
- `.githooks/merge-auto.mjs` — gardé à sa version de la branche (QUA-113) : le rejeu avec les hooks de main ne peut pas juger sa propre correction (validé le 2026-11-12)
- `.githooks/close-branches.mjs` — gardé à sa version de la branche (QUA-113) (validé le 2026-11-12)
- `.githooks/close-checks.mjs` — gardé à sa version de la branche (QUA-113), si le chantier le modifie (validé le 2026-11-12)
- `.githooks/state-resume.mjs` — gardé à sa version de la branche (QUA-113), si le chantier le modifie (validé le 2026-11-12)
- `.githooks/state-reopen.mjs` — gardé à sa version de la branche (QUA-113), si le chantier le modifie (validé le 2026-11-12)

## 2. Hors périmètre

- Les verdicts partagés entre CI (`.githooks/run-checks-pr.mjs`).
- La commande d'abandon d'un détour (reste dans l'intention).
- Les hooks de publication et de recette : create-release, promote-release, recette-note, release-verdict, acceptance-sheet.

## 3. Contraintes

- Choix de la forge : réutiliser `changeForge(root)` de `.githooks/close-checks.mjs` et injecter un client forge
  (gh ou glab), comme pr-watch ; le comportement GitHub reste strictement inchangé.
- Le hook de fusion automatique fait 149 lignes et close-checks 192 : le plafond est 200 lignes (QUA-001) ; le
  client forge va dans un fichier neuf, merge-auto-forge (même dossier, à citer dans l'architecture et dans
  `docs/projects/kit-mechanics.md`).
- Équivalences glab :
  - lire la MR : `glab mr view <n> -F json`, normalisé vers `{number, state, headRefName, mergeStateStatus, autoMergeRequest}` ;
  - état : opened / merged / closed (GitHub : OPEN / MERGED) ;
  - mergeStateStatus : has_conflicts et detailed_merge_status (need_rebase, checking, mergeable, ci_still_running…) mappés vers DIRTY / BEHIND / UNKNOWN / autre ;
  - mettre à jour la branche : `glab mr rebase <n>` ;
  - programmer : `glab mr merge <n> --auto-merge` (fusion quand le pipeline réussit) ;
  - vérifier : merge_when_pipeline_succeeds vrai (GitHub : autoMergeRequest non nul) ;
  - déjà fusionnée : state = merged ;
  - auto-merge refusé : message équivalent de glab ou du projet (GitHub : /not allowed/i) ;
  - nettoyage : `glab mr list --merged` filtré par --source-branch, rend `{headRefName, headRefOid}`.
- Garanties conservées sur les deux forges : refus sans `state.auto_merge` (ou sans PR de SCOPING autorisée), code 1 ;
  refus d'une MR d'une autre branche, fermée ou en conflit, code 1 ; attente de mergeStateStatus, mise à jour si
  la branche est en retard, délai de 30 minutes, code 2 si non exécuté ; jamais « fusion programmée » sans
  vérification relue sur la forge ; marque d'autorisation effacée via `withMarkCleared`. Un état illisible refuse,
  jamais un succès par défaut (QUA-013).
- Messages FR/EN : « gh » devient le nom de l'outil de la forge, « PR » devient « MR » sur GitLab ; réutiliser
  `T.mr` et `T.noGlab` de pr-watch. Le message `noGh` de close-branches devient neutre ou dépend de la forge.
- Skill start-a-workstream : remplacer `gh pr merge --auto`, `gh pr view` et « only GitHub » par une formulation
  neutre ; « never chain the gh commands by hand » reste valable.
- Un hook corrigé par une MR est jugé par les hooks de main (QUA-113) : déclaration « Contrats modifiés » ci-dessus.

## 4. Décisions

- 2026-11-12 : urgence demandée par le demandeur, priorité P0 en tête de l'index ; fiche reprise du rapport de l'adoptant.
- 2026-11-12 : modification de QUA-058 et QUA-059 validée par le demandeur.

## 5. Points à trancher

Aucun.

## 6. Increments

- **Lot 1 — client forge de merge-auto** [IA] : fichier neuf merge-auto-forge (gh et glab, normalisation de la MR),
  injecté par le hook de fusion automatique via `changeForge`, messages FR/EN, tests avec un faux glab injecté (MR
  en retard : rebase puis programmation, conflit, MR fermée, autre branche, glab absent ou non connecté code 2,
  fusion immédiate, délai dépassé, auto-merge non permis). Critère de sortie : les tests GitHub existants passent
  sans modification, ceux de GitLab aussi.
- **Lot 2 — close-branches, reopen, resume** [IA] : `mergedPullRequests` utilise `glab mr list --merged` ; message
  neutre ou selon la forge ; reprise et réouverture suivent. Critère de sortie : `pruneMergedBranches` supprime la
  branche d'une MR fusionnée en squash (test).
- **Lot 3 — skill, docs, contrats** [IA] : skill et copie gabarit en formulation neutre, architecture,
  `docs/projects/kit-mechanics.md`, QUA-058 et QUA-059 mis à jour, `npm run installer-depot`. Critère de sortie :
  `node .githooks/run-checks.mjs` sans échec, `drwil verify --agent` en `GOVERNANCE: PASS`.

## 7. Reprise

- **Dernier état** (2026-11-12) : cadrage terminé, non commité.
- **Travail non commité** : cette fiche.
- **Prochaine étape** : [humain] `/drwil-start`.

# Projet : une PR de doc passe la CI et fusionne en quelques minutes

**Statut** : cadré le 2026-11-05.
**Risque** : HIGH
**Maturité** : prêt

<!-- scope
files:
  - packages/drwil/templates/common/base/.githooks/run-checks-verdicts.mjs
  - .githooks/run-checks-verdicts.mjs
  - packages/drwil/templates/common/base/.githooks/run-checks.mjs
  - .githooks/run-checks.mjs
  - packages/drwil/templates/common/ci/github/.github/workflows/ia-first.yml
  - packages/drwil/templates/common/ci/gitlab/.gitlab-ci.yml
  - packages/drwil/test/kit.test.mjs
  - .githooks/run-checks.test.mjs
  - .github/workflows/ia-first.yml
  - .github/scripts/ci-multi-os.mjs
  - .github/scripts/ci-multi-os.test.mjs
  - .github/scripts/workflows-yaml.test.mjs
  - .github/ruleset-master.json
  - docs/contracts.md
  - .drwil/ia-first.json
  - docs/architecture.md
  - docs/features.md
  - packages/drwil/CHANGELOG.md
  - docs/projects/pending.md
  - docs/projects/journal.md
  - packages/drwil/templates/common/base/.githooks/pr-watch.mjs
  - .githooks/pr-watch.mjs
  - .githooks/pr-watch.test.mjs
  - packages/drwil/templates/common/base/.githooks/state-cli.mjs
  - .githooks/state-cli.mjs
  - packages/drwil/templates/common/base/.githooks/state-transitions.mjs
  - .githooks/state-transitions.mjs
  - .githooks/state.test.mjs
  - packages/drwil/templates/common/base/.githooks/state-context-texts.mjs
  - .githooks/state-context-texts.mjs
  - packages/drwil/templates/common/base/.githooks/state-messages-fr.mjs
  - .githooks/state-messages-fr.mjs
  - packages/drwil/templates/common/base/.githooks/state-messages-en.mjs
  - .githooks/state-messages-en.mjs
  - packages/drwil/templates/common/tools/claude/.claude/skills/start-a-workstream/SKILL.md
  - .claude/skills/start-a-workstream/SKILL.md
  - packages/drwil/templates/common/base/docs/recipes/working-with-branches.md
  - docs/recipes/working-with-branches.md
  - packages/drwil/templates/common/base/.githooks/pr-watch-main.mjs
  - .githooks/pr-watch-main.mjs
  - packages/drwil/templates/common/base/docs/projects/kit-mechanics.md
  - docs/projects/kit-mechanics.md
-->

## 1. Besoin

Mesuré le 2026-11-05 sur la PR #362 (doc seule) : 6 min 40 s de l'ouverture à la fusion. Le job
`checks` rejoue tout (6 min 11 s, dont construction et tests du paquet 184 s, tests des contrôles
72 s, tests des hooks 59 s) ; `kit-tests (ubuntu-latest)` joue les tests du paquet (2 min) ; la
règle « à jour avec master » relance toute la CI dès qu'une autre PR est fusionnée. En local, la
reprise contrôle par contrôle (`QUA-141`) évite déjà ce coût ; en CI elle est désactivée.

Le demandeur veut qu'une PR de doc pousse et fusionne vite, sans perdre la preuve : dans ce dépôt
la doc est une donnée (les tests lisent `docs/contracts.md`, les fiches, l'index), donc « doc seule »
ne suffit pas à sauter un contrôle.

**Contrats concernés** : `QUA-141` (reprise d'un verdict contrôle par contrôle), `QUA-013`
(contrôle non exécuté n'est pas passé), `QUA-045` (Windows et macOS testés avant la fusion de tout
code), `QUA-113` (la CI d'une PR rejoue les contrôles avec les hooks de la branche principale).

## Critères d'acceptation

- Sur une PR, la CI reprend le verdict de la dernière CI de la branche principale pour chaque
  contrôle dont l'empreinte (fichiers et commande) est identique ; elle rejoue les autres ; le
  push sur la branche principale rejoue tout et seul écrit ces verdicts — `QUA-250`
- Sur une PR qui ne touche que la documentation, `kit-tests (ubuntu-latest)` saute les tests du
  paquet comme Windows et macOS, et le dit — `QUA-045`
- La CI livrée aux projets (GitHub et GitLab, gabarit) restaure les verdicts de la dernière CI
  de leur branche principale sur une PR (ou merge request) et ne les sauvegarde que sur la branche
  principale ; un projet adoptant reprend donc ses contrôles inchangés comme ce dépôt — `QUA-250`
- La protection de la branche principale n'exige plus qu'une PR soit à jour avec elle ;
  `.github/ruleset-master.json` le dit et la CI vérifie que la forge le tient — `QUA-252`
- Une file de chantiers ne lance le suivant (`node .githooks/state.mjs next`) que sur la preuve,
  écrite par `node .githooks/pr-watch.mjs` après la fusion, que la CI de la branche principale est
  verte sur le commit de fusion et qu'aucune issue « CI broken on the main branch » n'est ouverte ;
  sinon `next` refuse et dit pourquoi (CI rouge, en cours ou non suivie, issue ouverte) ; un
  `start` humain n'est pas bloqué — `QUA-251`

## Contrats modifiés

- `.githooks/run-checks-verdicts.mjs` — en CI, la reprise des verdicts s'active quand la CI le
  demande (PR), sur le fichier de verdicts restauré depuis la branche principale ; hors CI, rien ne
  change (validé par le demandeur le 2026-11-05)
- `QUA-045` — ancien critère : Ubuntu joue les tests du paquet sur toute PR — raison : sur une PR
  de doc seule, Ubuntu les saute comme Windows et macOS ; le push sur la branche principale les
  joue toujours (validé par le demandeur le 2026-11-05)
- `.githooks/pr-watch.mjs` — une PR vue fusionnée, il suit aussi la CI de la branche principale sur
  le commit de fusion et l'issue d'alerte, le dit, et écrit la preuve dans `.drwil/evidence/` sur
  une CI verte ; aucun autre verdict ne change (validé par le demandeur le 2026-11-06)
- `.githooks/state-cli.mjs` — `next` refuse sans cette preuve pour la dernière fusion de la file ;
  `start`, `queue stop` et les autres transitions ne changent pas (validé par le demandeur le 2026-11-06)
- `.githooks/state-transitions.mjs` — même décision : `next` refuse sans cette preuve pour la
  dernière fusion de la file ; `start`, `queue stop` et les autres transitions ne changent pas
  (validé par le demandeur le 2026-11-06)
- `.githooks/state-context-texts.mjs`, messages `fr`/`en`, skill `start-a-workstream`, recette
  `docs/recipes/working-with-branches.md` — rappel de la file et refus ajoutés ; aucun texte existant contredit
  (validé par le demandeur le 2026-11-06)
- `.githooks/state-messages-fr.mjs` — les messages `fr` de la décision précédente : refus de
  `next` ajoutés (validé par le demandeur le 2026-11-06)
- `.githooks/state-messages-en.mjs` — les messages `en` de la même décision (validé par le
  demandeur le 2026-11-06)
- `.githooks/state.test.mjs` — tests du refus de `next` et de l'enchaînement décidés ci-dessus
  (`QUA-251`, `QUA-178`), aucun autre test changé (validé par le demandeur le 2026-11-06)
- `.githooks/run-checks.mjs` — commentaires seuls, qui disent la reprise en CI décidée pour
  `.githooks/run-checks-verdicts.mjs` (validé par le demandeur le 2026-11-05)
- `.githooks/run-checks.test.mjs` — tests de cette reprise en CI (`QUA-250`), aucun autre test
  changé (validé par le demandeur le 2026-11-05)
- `QUA-100` — ancien critère : « fusionnée » sort en code 0 — raison : la PR fusionnée, `pr-watch` suit
  la CI de la branche principale et son code de sortie devient le sien (0 verte, 1 rouge ou issue
  ouverte, 2 non suivie) ; « fusionnée » est toujours dit (suite du suivi validé par le demandeur le
  2026-11-06, lot 4)
- `QUA-178` — ancien critère : l'enchaînement à la fusion constatée lance aussitôt la tête de file —
  raison : il attend la même preuve que `next`, sinon la file lancerait le suivant sans elle ; refus
  dit, état SCOPING, file gardée (conséquence du dernier critère d'acceptation, « une file ne lance
  le suivant que sur la preuve » ; validé par le demandeur le 2026-11-06)
- `QUA-251` — le verrou ne vaut que sur une forge GitHub : `origin` sur une autre forge (GitLab…),
  `next` et l'enchaînement ne sont pas bloqués et la sortie le dit en une ligne (pas de preuve
  possible sur cette forge, CI de la branche principale à vérifier à la main) ; forge reconnue
  comme `drwil guarantees` (URL d'`origin`) ; sans `origin`, le verrou tient (validé par le
  demandeur le 2026-11-06)

## 2. Hors périmètre

- La règle « à jour avec la branche principale » que `drwil guarantees` pose chez les adoptants
  (`packages/drwil/src/guarantees-forge.ts`) : inchangée, levée seulement dans ce dépôt (décidé le
  2026-11-05).
- Sauter un contrôle sur le seul critère « doc seule » : écarté, la doc est une donnée.
- Le push local : il reprend déjà les verdicts (`QUA-141`).

## 3. Contraintes

- Le cache des verdicts n'est écrit que par un push sur la branche principale, jamais par une PR :
  une PR ne peut pas fabriquer le verdict qu'elle relira. Il est restauré par `actions/cache/restore`,
  sa sauvegarde n'a lieu que sur la branche principale.
- Sans cache restauré (premier passage, cache expiré), tout est rejoué : jamais « repris » sans
  verdict.
- Le rejeu avec les hooks de la branche principale (`QUA-113`) reste inchangé.
- Lever « à jour avec master » touche les réglages de la forge : le changement du réglage
  lui-même est un geste du demandeur (lot 3), la CI vérifie ensuite que la forge tient
  `.github/ruleset-master.json`.
- Risque accepté le 2026-11-05 : deux PR vertes chacune peuvent casser une fois fusionnées
  ensemble ; la CI de la branche principale le voit après la fusion et ouvre l'alerte existante.

## 4. Décisions

Tranchées par le demandeur le 2026-11-05 : les trois mesures (reprise des verdicts en CI, Ubuntu
sans tests sur une PR de doc, « à jour avec master » levé) ; le kit en profite aussi : la CI du
gabarit (GitHub et GitLab) reçoit la reprise des verdicts, sans changer la protection de forge
posée chez les adoptants.

## 5. Points à trancher

Aucun.

## 6. Increments

- **Lot 1 — reprise en CI et Ubuntu sur doc** [IA] : `.githooks/run-checks-verdicts.mjs`,
  `.github/workflows/ia-first.yml`, `.github/scripts/ci-multi-os.mjs`, tests. Critère de sortie :
  le premier contrat vert, une PR de doc mesurée.
- **Lot 2 — CI du gabarit** [IA] : étapes de cache des verdicts dans
  `packages/drwil/templates/common/ci/github/.github/workflows/ia-first.yml` et
  `packages/drwil/templates/common/ci/gitlab/.gitlab-ci.yml`, tests du paquet. Critère de sortie :
  le contrat prouvé aussi sur la CI livrée.
- **Lot 3 — « à jour avec master » levé** [humain] : le demandeur change le réglage de la forge
  (commande prête dans la reprise), l'agent met `.github/ruleset-master.json` d'accord. Critère de
  sortie : `.github/scripts/verifier-ruleset.mjs` vert.
- **Lot 4 — la file attend une branche principale verte** [IA] : ajouté le 2026-11-06 sur décision
  du demandeur, parce que lever « à jour avec master » laisse deux PR vertes casser la branche
  principale ensemble, vu seulement après coup. `.githooks/pr-watch.mjs` suit la CI de la branche principale
  après la fusion et écrit la preuve ; `next` refuse sans elle ; rappels, skill et recette le
  disent ; gabarit et copies. Critère de sortie : le contrat de la file prouvé par des tests (CI
  verte, rouge, en cours, issue ouverte, preuve d'une autre fusion), refus de `next` testé.

## 7. Reprise

- **Dernier état** (2026-11-06) : lot 1 fait (commits 49b5c72, 522795e). `QUA-250` créé :
  `.githooks/run-checks-verdicts.mjs` (gabarit et copie) ne reprend en CI que si `DRWIL_CI_REUSE=1` ;
  le job `checks` de `.github/workflows/ia-first.yml` restaure (`actions/cache/restore@v6`, clé
  `run-checks-verdicts-<sha de base>`, `restore-keys: run-checks-verdicts-`) puis sauvegarde
  (`actions/cache/save@v6`, push sur la branche principale seulement) le fichier
  `.drwil/evidence/run-checks-verdicts.json` (si présent). `QUA-045` : Ubuntu saute aussi sur une PR de doc.
  Contrôle `tests-qua-250` (`.githooks/run-checks.test.mjs`, `.github/scripts/workflows-yaml.test.mjs`).
- **Lot 2** (2026-11-06) : fait. CI GitHub du gabarit : mêmes étapes que le dépôt. CI GitLab du
  gabarit : pas de cache GitLab (non partagé par défaut entre branches protégées et non protégées,
  et inscriptible par une merge request s'il l'est) ; hors de la branche principale, le job
  `checks` télécharge avec `CI_JOB_TOKEN` l'artefact de verdicts du dernier pipeline réussi de la
  branche principale (`jobs/artifacts/<branche>/raw/...?job=checks`) et lance
  `DRWIL_CI_REUSE=1 node .githooks/run-checks.mjs` ; `after_script` efface le fichier hors de la
  branche principale avant l'envoi de l'artefact. `QUA-250` « livré à tout projet », troisième
  critère relié, contrôle `tests-qua-250` étendu à `packages/drwil/test/kit.test.mjs`.
- **Lot 4** (2026-11-06) : fait. `QUA-251` créé : `.githooks/pr-watch-main.mjs` (nouveau, gabarit et
  copie : `pr-watch.mjs` et `state-transitions.mjs` étaient à leur plafond) suit la CI `ia-first.yml`
  du commit de fusion et l'issue d'alerte, consigne le verdict dans `.drwil/evidence/main-ci.json` (si présent) ;
  la « dernière fusion » est le sommet de la branche principale à jour (`origin/<principale>` après
  fetch, comme `createBranch`), vérifié dans `start` pour la tête de file lancée par l'agent (donc
  `next` et l'enchaînement de `QUA-178`). Contrôle `tests-qua-251`.
- **Lot 3** (2026-11-06) : fait. Le demandeur a levé « à jour avec master » dans le ruleset 24840343
  (`strict_required_status_checks_policy` à `false`) ; `.github/ruleset-master.json` remis d'accord
  par `verifier-ruleset.mjs --ecrire`, comparaison verte. `QUA-252` créé, contrôle `tests-qua-252`.
- **Forge** (2026-11-06, décision du demandeur) : le verrou de `QUA-251` ne vaut que sur GitHub ;
  `originForge` (URL d'`origin`, règle de `forgeOf` de `drwil guarantees`) et `mainCiGate` dans
  `.githooks/pr-watch-main.mjs` ; hors GitHub, `next` et l'enchaînement passent et le disent.
- **Prochaine étape** : la clôture.
- **Reste à mesurer** : une PR de doc, après la fusion (le cache n'existe qu'après un push sur master).

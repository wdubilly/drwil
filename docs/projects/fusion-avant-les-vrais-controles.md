# Projet : aucune fusion n'est permise avant un contrôle réellement exécuté et réussi

**Statut** : cadré le 2026-11-26 ; P1 tranché le 2026-11-27, après la reproduction du lot 1.
**Risque** : HIGH
**Maturité** : prêt

<!-- scope
files:
  - .github/workflows/ia-first.yml
  - .github/scripts/ci-multi-os.mjs
  - .github/scripts/workflows-yaml.test.mjs
  - .githooks/run-checks.test.mjs
  - packages/drwil/templates/common/ci/github/.github/workflows/ia-first.yml
  - packages/drwil/test/kit-ci.test.mjs
  - packages/drwil/test/ci-parite.test.mjs
  - packages/drwil/test/montee-de-version.test.mjs
  - packages/drwil/src/guarantees-forge.ts
  - packages/drwil/test/guarantees.test.mjs
  - .drwil/ia-first.json
  - docs/contracts.md
  - docs/projects/pending.md
  - docs/projects/journal.md
  - packages/drwil/CHANGELOG.md
-->

## 1. Besoin

La protection de la branche principale exige des contrôles par leur nom. La fusion ne doit être permise qu'après leur
exécution réelle et leur réussite.

**Observé le 2026-11-26** sur la PR de cadrage #481 (heures UTC) :

- 21:18:57 : l'exécution `push` de la branche (run 45897249039) marque son job `checks` « skipped », la branche ayant
  une PR ouverte ;
- 21:19:07 : la PR est fusionnée (fusion automatique programmée par `.githooks/merge-auto.mjs`) ;
- 21:19:22 à 21:21:36 : le job `checks` de l'exécution `pull_request` (run 45897255645) tourne, et réussit.

La règle de `master` exige `checks` et les trois `kit-tests (<os>)`. La documentation GitHub
(`docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/control-jobs-with-conditions`, lue le
2026-11-26) dit qu'un job sauté par sa condition rapporte « Success » et ne bloque pas la fusion, même exigé. Elle ne
dit pas comment deux contrôles du même nom sur un même commit sont départagés.

**Déduit, non reproduit** : le `checks` sauté du push a satisfait la règle, et une PR dont le vrai `checks` échoue
pourrait être fusionnée avant que l'échec soit connu. Sur la #481, le vrai contrôle a réussi après coup.

**Lu dans les workflows le 2026-11-26** :

- Dépôt (`.github/workflows/ia-first.yml`) : `checks` a une condition de job sur la sortie `saute` de `matrice-os`
  (QUA-121). Sur ce push, `kit-tests (ubuntu-latest)` réussit aussi sans tester.
- CI livrée (`packages/drwil/templates/common/ci/github/.github/workflows/ia-first.yml`) : `checks` s'exécute
  toujours (`if: always()`) ; sur un push sauté, seule sa première étape (état du plan et des tranches) tourne et le
  job réussit sous le nom exigé (QUA-263). `drwil guarantees` propose d'exiger ce nom
  (`packages/drwil/src/guarantees-forge.ts`) : un adoptant qui le suit serait exposé de même.

Conséquence observée en plus : fusionnée avant la fin de la CI de la PR, la branche principale n'avait sans doute pas
d'arbre prouvé à reprendre ; sa CI a duré environ 11 minutes (lien non vérifié dans le journal du job `plan`).

## Critères d'acceptation

- Dans ce dépôt, aucune exécution ne rapporte un succès sous un nom exigé (`checks`, `kit-tests (<os>)`) pour un travail que seule une autre exécution doit faire — `QUA-121`
- La CI GitHub livrée ne rapporte pas `checks` réussi quand ses contrôles sont sautés au profit de la PR — `QUA-263`
- Un même commit de branche n'est toujours pas contrôlé deux fois, et une branche sans PR reste testée — `QUA-121`
- Sur un vrai dépôt GitHub dont la règle exige ces noms, une PR au contrôle en échec reste non fusionnable avant, pendant et après sa CI, fusion automatique programmée comprise [humain] — contrat `Manuel` à créer par le chantier — `QUA-339`

## Contrats modifiés

- `QUA-121` — le texte suit le mécanisme D : le nom rapporté dépend de l'évènement (validé par le demandeur le 2026-11-27)
- `QUA-263` — le texte suit le mécanisme D dans la CI livrée (validé par le demandeur le 2026-11-27)
- `.githooks/run-checks.test.mjs` — ses cas de structure du workflow suivent le mécanisme retenu à P1, sans retirer l'exigence qu'une branche sans PR reste testée ni que les noms exigés soient conservés (validé par le demandeur le 2026-11-27)

## 2. Hors périmètre

- La CI GitLab livrée : un seul pipeline par push (QUA-263), cette voie n'y existe pas.
- La durée de la CI de la branche principale.

## 3. Contraintes

- Les noms exigés par les règles de branche existantes (dépôt et adoptants) ne changent pas sans geste annoncé : un
  nom exigé que plus rien ne rapporte bloque toute fusion.
- Un nom de job calculé par une expression n'est pas sûr sur un job sauté : sur la #481, le job de tranche sauté
  s'affiche avec son expression non évaluée.
- Aucun contrôle affaibli (QUA-019) ; contrôle non exécuté n'est pas passé (QUA-013).
- Un projet déjà installé doit recevoir le correctif à la mise à jour (QUA-283), et l'apprendre au changelog.

## 4. Décisions

- 2026-11-26 : P0, en tête de la 0.11.3.
- 2026-11-27 : P1, mécanisme D (nom selon l'évènement, options en fin de section 8).
- 2026-11-27 : le premier critère ne vise pas les `kit-tests` Windows et macOS, réussis sans tester sur une PR par
  conception (QUA-045) ; il vise le travail confié à une autre exécution du même commit.

## 5. Points à trancher

Aucun.

## 6. Increments

- **Lot 1 — reproduction** [IA, avec l'accord du demandeur pour tout dépôt ou PR d'essai] : sur un dépôt d'essai
  protégé comme `master`, une PR dont le contrôle échoue ; relever si GitHub la laisse fusionner et à quel moment,
  CI du dépôt et CI livrée. Aucun essai sur `master`. Critère de sortie : constat daté dans la fiche, P1 tranché.
- **Lot 2 — correctif** [IA] : tests en échec d'abord, les deux workflows, QUA-121 et QUA-263 réécrits.
- **Lot 3 — preuve réelle** [humain] : rejouer le lot 1 avec le correctif et attester.

## 7. Reprise

- **Dernier état** (2026-11-27) : lots 1 et 2 faits. Mécanisme D dans les deux workflows, QUA-121 et QUA-263 réécrits,
  QUA-339 (contrat `Manuel` du critère 4) créé, changelog écrit ; essai réel de D sur la CI du dépôt en section 9.
  Le lien `QUA-339` est ajouté au critère 4 sans changer son texte (empreinte des critères identique, QUA-174).
- **En attendant** la fusion du correctif : avant de fusionner une PR, de code ou de documentation, vérifier que le
  `checks` de l'exécution `pull_request` est terminé et réussi ; ne pas programmer sa fusion automatique avant. De même
  ensuite pour une branche créée avant le correctif, tant qu'elle n'a pas intégré `master` : son push rapporte encore
  `checks`.
- **Prochaine étape** : [IA] vérification et clôture ; [humain] lot 3 : juger les essais réels (sections 9 et 10) et
  attester QUA-339.
- **Dépôt d'essai** : conservé jusqu'à l'attestation. Disposition d'origine rétablie après la section 10 : `master`
  (branche par défaut) porte le projet factice avec la protection classique de la CI livrée ; la copie de drwil est sur
  `etat-depot` (avancée à `9e63446`), protégée par les quatre noms exigés (protection classique, administrateurs
  inclus) ; le ruleset 28200085 est désactivé. L'issue #4 reste ouverte, les PR #14 à #17 sont fermées, les branches
  d'essai sont gardées.

## 8. Constat du lot 1 (reproduction)

Dépôt d'essai public `wdubilly/drwil-essai-fusion`, heures UTC du 2026-11-27.

**Montage** : copie de `master` (`a19a19f3`) en un seul commit (`5d78f2b`) ; ruleset 28200085 copié du ruleset
24840343, seul écart `require_code_owner_review: false` (aussi dans `.github/ruleset-master.json` de la copie) ; fusion
automatique permise. Contrôle ajouté `essai-echec` : il échoue si un fichier du dossier d’essai, propre à la copie, contient
`ECHEC-TOUJOURS`, ou `ECHEC-SUR-PR` sur un run `pull_request`. Aucun workflow ne s'est enregistré après les premiers
push ; Actions désactivé puis réactivé sur ce seul dépôt les a fait apparaître (cause inconnue). La PR #1, restée sans
aucun contrôle et `BLOCKED`, a été fermée.

### CI du dépôt : défaut reproduit

**Observé, PR #3** (documentation seule, `ECHEC-TOUJOURS` ; push, puis PR ouverte à 00:17:09 ; fusion automatique non
programmée ; run push 45915831859, run PR 45915839546) :

- 00:17:16 : `checks` du push sauté (140234728433) ; 00:17:26 : les `kit-tests` exigés sont tous réussis.
- 00:17:28 : `mergeStateStatus` vaut `UNSTABLE` ; une boucle d'observation lance alors `gh pr merge 3 --merge`,
  **fusion demandée à la main, sans `--admin` ni `--auto`**.
- 00:17:31 : **PR fusionnée** (commit `301c43dd`). Le relevé suivant montre le `checks` de la PR (140234799105) en
  file, `started_at` 00:17:30.
- 00:37:38 : ce `checks` finit en **échec** (« ECHEC VOLONTAIRE DE L ESSAI » ; deux contrôles en échec, `essai-echec`
  et miroirs dépôt/gabarit, tous deux dus au fichier d'essai).
- La CI de `master` sur la fusion (run 45915870861) échoue ; l'issue d'alerte #4 s'ouvre à 00:29:54.

**Observé, PR #2** (même contenu, fusion automatique programmée à 00:07:10, une seconde après l'ouverture ; run push
45914846239, run PR 45914852203) :

- 00:07:16 : `checks` du push sauté (140231523787).
- 00:07:35 : **`UNSTABLE`** (fusionnable), le `plan` de la PR en cours, son `checks` absent du relevé.
- 00:07:37 : le `checks` de la PR (140231634850) apparaît en file ; 00:07:38 : `BLOCKED`, et GitHub désactive la
  fusion automatique (`repository_rule_violation`, « Repository rule violations found »). PR non fusionnée.
- Pendant, à 00:09:57 : fusion normale refusée (« the base branch policy prohibits the merge ») ; fusion automatique
  réarmée à 00:10:00, PR `BLOCKED`.
- 00:24:17 : `checks` en échec (`essai-echec`, miroirs, périmètre de l'attente sans trailer) ; ensuite PR `BLOCKED`,
  non fusionnée, fusion automatique toujours armée.

La base `5d78f2b` passe les mêmes contrôles (dernière étape des deux jobs en échec) : les échecs viennent des PR.

**Déduit** :

- Tant que le `checks` de la PR n'existe pas, celui, sauté, du push satisfait la règle. La fenêtre va du dernier autre
  contrôle exigé réussi jusqu'à la création de ce `checks`.
- PR #3 : GitHub aurait évalué la règle avant la création du `checks` de la PR, malgré un `started_at` antérieur d'une
  seconde à la fusion.
- PR #2 : la fusion automatique aurait été tentée dans la fenêtre et aurait abouti trop tard. **La fusion par la seule
  fusion automatique n'est pas reproduite ici** ; sur la #481, elle a gagné la course (fusion à 21:19:07, `checks` de
  la PR commencé à 21:19:22).
- Une PR de code, dont les `kit-tests` Ubuntu testent réellement, dure sans doute assez pour fermer la fenêtre (non
  essayé).

**Observé ensuite sur la PR #2, après l'échec** : fusion normale refusée à 00:39:11 ; run push relancé à 00:39:13, qui
crée un nouveau `checks` sauté (140241718802, 00:39:25), plus récent que l'échec ; la PR reste `BLOCKED`, fusion
automatique armée, et la fusion normale est encore refusée à 00:39:53.

### CI livrée : défaut reproduit

**Montage** : l'ancien `master` d'essai renommé `etat-depot` ; nouveau `master` = projet factice avec le kit construit
depuis la branche du chantier (CI GitHub identique au gabarit), plus le même contrôle `essai-echec`. Ruleset désactivé ;
protection classique telle que la pose `drwil guarantees --protect` (`checks` exigé, `strict: true`, administrateurs
inclus, PR obligatoire, 0 approbation). La barrière de périmètre du kit exige un cadrage lu dans le commit parent : les
fichiers d'essai ont été déclarés dans la fiche permanente par la PR #5, verte et fusionnée normalement. Un premier push
sans ce cadrage a échoué sur cette seule barrière (non compté).

**Observé, push testé avant l'ouverture de la PR** (`ECHEC-SUR-PR` : le push réussit réellement, la PR échoue) :

| PR | Runs push / PR | Observé |
|---|---|---|
| #6, sans fusion demandée | 45961247033 / 45961339764 | `UNSTABLE` de 07:51:20 jusqu'à la création du `checks` de la PR (07:51:39), puis `BLOCKED` en file, en cours et après son échec (07:51:53) ; fusion normale refusée à 07:53:03 |
| #7, `--auto` dès l'ouverture | 45969286634 / 45969394631 | `CLEAN` à 08:55:02, `gh pr merge --auto --merge` : **PR fusionnée à 08:55:04**, immédiatement : l'historique de la PR ne porte aucun évènement de fusion automatique (vérifié) ; le `checks` de la PR, apparu à 08:55:12, **échoue** à 08:55:25 (`essai-echec`) |

**Observé, push puis PR aussitôt** (`ECHEC-TOUJOURS`, fusion automatique dès l'ouverture) :

- PR #8 (runs 45978233529 / 45978241821) : le push se dit sauté (notice à 09:59:17) ; son `checks` (140435353785)
  **réussit à vide**, seule l'étape « Refuse a plan or a slice… » jouée. Il finit à 09:59:26, une seconde après le
  `started_at` du `checks` de la PR : jamais `UNSTABLE`, `BLOCKED` jusqu'après l'échec (09:59:39).
- PR #9 (runs 45978642572 / 45978648485) : même succès à vide (140436692807, 10:02:15) ; **`UNSTABLE` à 10:02:17**,
  le `checks` de la PR pas encore créé ; il apparaît à 10:02:18 ; à 10:02:19 GitHub désactive la fusion automatique
  (`protected_branch`) ; échec à 10:02:37, PR non fusionnée.
- PR #10 et #11 : deux essais de fusion à la main dans la fenêtre, sans résultat. Sur la #11, 78 tentatives refusées, le
  succès à vide étant arrivé trop tard ; sur la #10, la boucle d'observation n'a vu aucun état fusionnable.

**Déduit** : même course que sur la CI du dépôt ; un succès à vide arrivé avant la création du `checks` de la PR rend
celle-ci fusionnable. **Une fusion aboutie avec ce succès à vide n'est pas obtenue** ; la fusion aboutie sur la CI
livrée est celle de la PR #7. `strict: true` ne l'a pas empêchée.

### Ce qu'on sait des trois temps

- **Avant** la création du `checks` de la PR : fusionnable dès qu'un autre `checks` réussi ou sauté existe sur le
  commit ; fusions abouties : #3 (dépôt, à la main) et #7 (livrée, commande `--auto` exécutée en fusion immédiate).
  **Une fusion par une fusion automatique restée programmée n'a été obtenue dans aucun essai.**
- **Pendant** : `BLOCKED` observé (#2, #6, #8, #9). **Après** l'échec : `BLOCKED` observé (#2, #6, #8), y compris après
  relance du run push (#2).
- La fusion automatique tentée trop tard est désactivée par GitHub (#2, #9) alors qu'elle avait été annoncée
  programmée.
- Non essayés : PR de code sur la CI du dépôt ; push testé avant la PR sur la CI du dépôt (déduit identique, son push
  ne rejouant pas les contrôles avec les hooks de la branche principale).

### Options pour P1 (tranché le 2026-11-27 : D)

- **A. Renommer la seule exécution sautée.** Peu coûteux, noms exigés inchangés, saut conservé. **Insuffisant** : le
  push testé avant la PR n'est pas sauté et son succès, sous le nom exigé, suffit à fusionner (#7).
- **B. Ne pas émettre les noms exigés sur un push avec PR.** Un déclencheur ignore qu'une PR existe : revient à A ou à
  deux workflows. Même insuffisance tant qu'un push antérieur à la PR émet ces noms.
- **C. Abandonner le saut.** Double passage (payant pour un adoptant en dépôt privé), QUA-121 et QUA-263 renversés.
  **Insuffisant** (déduit de #7) : un `checks` de push réellement réussi compte avant celui de la PR.
- **D. Nommer selon l'événement** : seuls les runs `pull_request` et les push de la branche principale rapportent
  `checks` ; tout autre run rapporte `checks (push)`. Dans le dépôt, même suffixe pour les `kit-tests (<os>)`. Le saut
  reste : pas de double passage ; une branche sans PR reste testée, sous l'autre nom.
  - **Essayé sur la CI livrée** (une ligne `name:` sur le job `checks`) : PR #12 verte, portant le changement, fusionnée
    normalement (`checks` et `checks (push)` réussis) ; PR #13, push testé avant la PR et fusion automatique dès
    l'ouverture (runs 46058345022 / 46058408636) : `checks (push)` réussi à 19:40:47, PR ouverte à 19:40:59,
    **`BLOCKED` à chaque relevé** avant, pendant et après l'échec du `checks` (19:41:30), jamais `UNSTABLE`, fusion
    automatique restée armée ; fusion normale refusée après l'échec.
  - **Non essayé** : D sur la CI du dépôt et le suffixe des `kit-tests` ; push puis PR aussitôt sous D (déduit : même
    expression, qui ignore le saut). Dans le dépôt, `checks` sauté par sa condition garde un nom à vérifier : évalué ou
    laissé en expression, il ne devrait pas valoir `checks` sur un push de branche (déduit).
  - **Adoptants** : le nom exigé `checks` ne change pas et vient de la PR ; effet à la mise à jour du kit, à annoncer au
    changelog. À examiner : une règle ou un outil qui attendrait `checks` d'un run autre que ces deux-là (file de fusion
    `merge_group`, non déclenchée par le workflow livré ; lancement manuel du workflow du dépôt sur une branche).
- **Recommandation : D.** Seule des quatre à couvrir les deux chemins vers la fusion prématurée, essayée avec succès sur
  la CI livrée, sans double passage ni changement des noms exigés. Limite de toute option fondée sur les noms (déduit) :
  un autre run `pull_request` réussi sur le même commit (autre base, par exemple) rapporte aussi `checks`.

## 9. Constat du lot 2 (D sur la CI du dépôt)

Dépôt d'essai, heures UTC du 2026-11-27. Montage : `etat-depot` (`301c43dd`) protégée par les quatre noms exigés
(protection classique, `strict` à faux, administrateurs inclus) ; seuls le workflow de `a62db940` et un fichier
d'échec volontaire sont ajoutés aux branches d'essai.

- **Push puis PR aussitôt** (PR #14, fusion automatique dès l'ouverture à 20:24:50, runs push 46063455652 et PR
  46063461619, commit `5b9d8f53`) : le push s'est sauté. Son `checks` sauté s'affiche sous l'expression non évaluée
  (`(github.event_name == 'pull_request' || …) && 'checks' || 'checks (push)'`), qui n'est aucun nom exigé ; son
  `kit-tests`, réussi sans tester, s'appelle `kit-tests (ubuntu-latest) (push)`. Le run `pull_request` rapporte `checks`
  et les trois `kit-tests (<os>)` sans suffixe. `BLOCKED` à chaque relevé (toutes les 15 s) avant, pendant et après
  l'échec de `checks` (20:39:44) ; fusion automatique restée programmée, aucun évènement de désactivation dans
  l'historique ; fusion normale refusée à 20:40:01. PR fermée ensuite.
- **Push sans PR** (branche `essai/d-depot-sans-pr`, run 46063804171, commit `62bf2986`) : le push teste, ses jobs
  s'appellent `checks (push)` et `kit-tests (ubuntu-latest) (push)`.
- **Échecs de la PR #14**, dus au montage : l'échec volontaire ; le contrôle des miroirs (fichiers d'essai) ; le test
  QUA-251 de la copie, d'avant le correctif, qui attend `checks` sans `name:`.
- **Non essayés** : push réellement réussi avant l'ouverture de la PR sur la CI du dépôt ; PR de code ; CI livrée avec
  l'expression finale (celle des PR #12 et #13 n'avait pas la condition `github.event_name == 'push'`).

## 10. Essais avec le workflow final avant l'attestation

Joués par l'agent à la demande du demandeur, sur le seul dépôt d'essai, heures UTC du 2026-11-27 ; workflows de
`080d6fb5`, identiques au gabarit et à ceux du dépôt. Fusion automatique demandée à l'ouverture
(`gh pr merge --auto --merge`) ; relevés toutes les quelques secondes (toutes les 10 s environ après les 90 premières
secondes). Ce constat ne vaut pas attestation de QUA-339.

| Essai | PR ; runs push / PR ; commit | Ouverture, fusion automatique à l'historique, `checks` de la PR vu, échec, fusion normale refusée |
|---|---|---|
| 1. CI livrée, PR aussitôt | #15 ; 46071140202 / 46071146170 ; `2ff290f` | 21:34:06, 21:34:09, 21:34:19, 21:34:33, 21:35:22 |
| 2. CI livrée, PR après la réussite du push | #16 ; 46071324458 / 46071384457 ; `428b016` | 21:36:14, 21:36:16, 21:36:27, 21:36:40, 21:37:30 |
| 3. CI du dépôt, PR après la réussite du push | #17 ; 46072721961 / 46073774593 ; `2bebc6f` | 21:59:17, 21:59:20, 21:59:38, 22:14:01, 22:15:05 |

**Observé** :

- Les trois PR : `BLOCKED` à chaque relevé une fois la fusion automatique enregistrée, avant l'apparition du `checks`
  de la PR, pendant et après son échec ; jamais `UNSTABLE` ni `CLEAN` ; aucune fusion. Les seuls autres états sont ceux
  du premier relevé : `UNKNOWN` (#16, #17), ou `BLOCKED` sans fusion automatique encore (#15). L'historique de chacune
  porte un évènement d'activation de la fusion automatique, sans désactivation ni fusion ; elle restait programmée au
  dernier relevé. Fusion normale (sans `--admin`) refusée : « the base branch policy prohibits the merge ».
- Chaque échec d'agrégation du `checks` de la PR (jobs 140748164567, 140748918044, 140756726797) compte un seul
  contrôle en échec, `essai-echec` (« ECHEC VOLONTAIRE DE L ESSAI »).
- Aucun run push n'a rapporté un nom exigé. #15 : le push s'est sauté (la PR existait déjà), `checks (push)` réussi
  sans rejouer. #16 : le push a réellement joué les contrôles, `checks (push)` réussi à 21:36:07, avant l'ouverture.
  #17 : push réellement réussi à 21:59:11 (`checks (push)`, contrôles et vérification du ruleset joués, 36
  avertissements, non exécutés compris ; `kit-tests (ubuntu-latest) (push)` testé).
- #16, avant l'apparition du `checks` de la PR : `checks (push)` réussi était le seul contrôle de ce genre sur le
  commit et la PR restait `BLOCKED`.
- #17 : les `kit-tests (<os>)` de la PR (changement de documentation) réussissent sans tester, vers 21:59:35-41. Le
  premier relevé qui les montre en partie réussis montre déjà le `checks` de la PR en file : aucun relevé n'isole
  l'instant où les trois sont réussis sans ce `checks`.

**Montage et écarts** :

- Essais 1 et 2 : le workflow final n'est posé que sur la branche de la PR ; le `master` d'essai garde la version sans
  la condition `github.event_name == 'push'`. Protection classique seule, `checks` exigé, `strict`.
- Essai 3 : le `master` factice n'ayant aucun commit commun avec la copie de drwil, un push de branche de la copie
  échouait (« aucune branche de référence »). Le temps de l'essai, `master` a été renommé `etat-livre` et `etat-depot`
  renommé `master` (branche par défaut), puis l'inverse. Base `9e63446` : les 10 fichiers changés par le chantier,
  identiques à `080d6fb5`, ancien fichier d'échec retiré, dossier d'essai déclaré dans les miroirs ; poussée directement,
  l'application aux administrateurs levée le temps du push puis rétablie. La PR n'ajoute qu'un fichier au dossier d'essai.
- Premier essai 3 non compté (run 46071818517, commit `1051e49`) : contrôles réussis, mais run en échec à la
  vérification du ruleset, désactivé depuis le lot 2 ; PR non ouverte. Ruleset 28200085 réactivé pour la #17 (en plus
  de la protection classique : le blocage ne s'attribue pas à l'un des deux), désactivé ensuite.
- La base `9e63446` échoue elle-même sur les miroirs (défaut du montage : la ligne du dossier d'essai n'y couvre aucun
  fichier ; run 46071786812). L'étape de diagnostic de la #17 dit donc « Échec déjà présent sur la base » ; elle ne
  porte pas sur l'échec du `checks` de la PR, dont l'agrégation ne compte que `essai-echec`. Les renommages ont aussi
  déclenché des runs de push, en échec, sur les branches renommées.
- CI du dépôt, PR aussitôt : non rejoué ici ; joué au lot 2 (PR #14) avec le même workflow que `080d6fb5`.
- **Non essayés** : PR de code ; rejeu avec les hooks de la branche principale (l'agrégation échoue avant).


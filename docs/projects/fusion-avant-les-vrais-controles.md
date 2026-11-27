# Projet : aucune fusion n'est permise avant un contrôle réellement exécuté et réussi

**Statut** : cadré le 2026-11-26 — P1 se tranche après la reproduction du lot 1.
**Risque** : HIGH
**Maturité** : à affiner

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
- Sur un vrai dépôt GitHub dont la règle exige ces noms, une PR au contrôle en échec reste non fusionnable avant, pendant et après sa CI, fusion automatique programmée comprise [humain] — contrat `Manuel` à créer par le chantier

## Contrats modifiés

Aucun validé : QUA-121 et QUA-263 décrivent le mécanisme actuel ; leur nouveau texte dépend de P1 et sera validé avec lui.

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

## 5. Points à trancher

- [décision] P1 : le mécanisme, après la reproduction. Pistes non essayées : l'exécution sautée rapporte sous un
  autre nom ; le workflow ne contrôle plus les push de branche qui ont une PR sans émettre les noms exigés ; abandon
  du saut, au prix d'un double passage.

## 6. Increments

- **Lot 1 — reproduction** [IA, avec l'accord du demandeur pour tout dépôt ou PR d'essai] : sur un dépôt d'essai
  protégé comme `master`, une PR dont le contrôle échoue ; relever si GitHub la laisse fusionner et à quel moment,
  CI du dépôt et CI livrée. Aucun essai sur `master`. Critère de sortie : constat daté dans la fiche, P1 tranché.
- **Lot 2 — correctif** [IA] : tests en échec d'abord, les deux workflows, QUA-121 et QUA-263 réécrits.
- **Lot 3 — preuve réelle** [humain] : rejouer le lot 1 avec le correctif et attester.

## 7. Reprise

- **Dernier état** (2026-11-27) : lot 1 en cours ; défaut reproduit sur la CI du dépôt (section 8) ; CI livrée pas
  encore essayée ; P1 non tranché.
- **En attendant** : avant de fusionner une PR, de code ou de documentation, vérifier que le `checks` de l'exécution
  `pull_request` est terminé et réussi ; ne pas programmer sa fusion automatique avant.
- **Prochaine étape** : [IA] CI livrée, puis push testé avant l'ouverture de la PR.

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

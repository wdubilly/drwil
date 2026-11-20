# Projet : les contrôles de contrats d'un projet lancent chaque fichier de tests une fois par passe, pas une fois par contrat

**Statut** : cadré le 2026-11-19.
**Risque** : HIGH
**Maturité** : prêt
**Intention** : constat du demandeur sur `marinade-poulet` (2026-11-19) : CI passée d'environ 12 à 22 minutes en deux
jours.

<!-- scope
files:
  - packages/drwil/templates/common/base/.githooks/engine.mjs
  - packages/drwil/templates/common/base/.githooks/engine-pass.mjs
  - packages/drwil/templates/common/base/.githooks/engine-launch.mjs
  - packages/drwil/templates/common/base/.githooks/run-checks.mjs
  - packages/drwil/templates/common/base/.githooks/contract-tests.mjs
  - packages/drwil/templates/common/base/.githooks/contract-tests-reporters.mjs
  - packages/drwil/templates/common/base/docs/recipes/adopt-the-kit.md
  - .githooks/engine.mjs
  - .githooks/engine-pass.mjs
  - .githooks/engine-launch.mjs
  - .githooks/run-checks.mjs
  - .githooks/contract-tests.mjs
  - .githooks/contract-tests-reporters.mjs
  - .githooks/contract-tests.test.mjs
  - docs/recipes/adopt-the-kit.md
  - packages/drwil/src/doctor.ts
  - packages/drwil/src/guarantees-merge.ts
  - packages/drwil/src/guarantees-layers.ts
  - packages/drwil/test/coverage-merge.test.mjs
  - packages/drwil/templates/common/ci/gitlab/.gitlab-ci.yml
  - packages/drwil/templates/common/ci/github/.github/workflows/ia-first.yml
  - .github/workflows/ia-first.yml
  - packages/drwil/test/kit-ci.test.mjs
  - .githooks/run-checks-verdicts.mjs
  - packages/drwil/templates/common/base/.githooks/run-checks-verdicts.mjs
  - packages/drwil/test/kit-verify.test.mjs
  - docs/architecture.md
  - docs/contracts.md
  - .drwil/ia-first.json
  - docs/projects/pending.md
  - docs/projects/journal.md
  - packages/drwil/CHANGELOG.md
  - packages/drwil/templates/common/base/docs/projects/kit-mechanics.md
  - packages/drwil/src/doctor-checks.ts
  - packages/drwil/test/doctor-checks.test.mjs
  - packages/drwil/src/doctor-coverage.ts
  - packages/drwil/test/coverage-vitest.test.mjs
  - packages/drwil/test/ci-parite.test.mjs
  - packages/drwil/templates/common/base/docs/contracts.md
  - packages/drwil/test/kit-consignes.test.mjs
  - packages/drwil/src/doctor-texts.ts
  - docs/features.md
  - packages/drwil/templates/common/base/.githooks/wait-command.mjs
  - .githooks/wait-command.mjs
  - .githooks/wait-command.test.mjs
  - outils/tests-par-fichier.mjs
  - outils/tests-par-fichier.test.mjs
  - outils/miroirs.json
  - packages/drwil/templates/common/base/.githooks/engine-selftest.mjs
  - .githooks/engine-selftest.mjs
  - .githooks/engine.test.mjs
  - packages/drwil/src/guarantees-verify.ts
  - packages/drwil/test/guarantees.test.mjs
  - packages/drwil/src/doctor-fix.ts
  - packages/drwil/test/doctor-fix.test.mjs
  - packages/drwil/src/cli-verify.ts
  - packages/drwil/README.md
  - docs/intentions/qua-018-gain-non-reporte.md
  - docs/intentions/suivi-ci-et-contexte.md
-->

## 1. Besoin

Chez un projet qui a adopté le kit, chaque contrat métier a son propre contrôle (recette
`docs/recipes/adopt-the-kit.md`, étape 5 : `npm test -- -t "APP-001"`). Chez `marinade-poulet` (relevé le
2026-11-19), 27 des 31 contrôles sont `npx vitest run -t "<ID>"` : chacun relance Vitest sur **tous** les fichiers de
tests et ne garde que les tests de son ID. En CI, chaque lancement coûte environ 31 s, presque tout en démarrage
(transformation, jsdom, imports) ; les 27 démarrages font l'essentiel des 22 minutes. Chaque nouveau contrat ajoute
le sien : le temps croît avec le registre.

Le dépôt drwil a déjà résolu ce problème pour lui-même (QUA-033) : outils/tests-par-fichier.mjs lance chaque
fichier de tests une seule fois par passe de `run-checks` (`DRWIL_PASS_ID`), un reporter laisse le résultat de chaque
test, le verdict de chaque contrat est lu par ID. Mais cet outil est propre au dépôt (`outils/`), ne sait que
`node --test`, et n'est pas livré.

Le projet : livrer ce mécanisme aux projets, pour les lanceurs de tests de la pile JavaScript (Vitest, Jest,
`node --test`), sans retirer aucun contrôle ni perdre le verdict par contrat.

## Critères d'acceptation

- Un contrôle de contrat déclaré par le mécanisme livré (`node .githooks/contract-tests.mjs <ID> [fichiers…]`) lance
  son lanceur de tests (Vitest, Jest ou `node --test`, détecté ou déclaré) **une seule fois par passe** pour tous les
  contrats qui le partagent ; son verdict ne vient que des tests dont le nom commence par son ID : un test cassé fait
  échouer ce seul contrat — `QUA-316`
- Un contrat dont aucun test ne porte l'ID, ou un lancement qui n'a rien joué (erreur de chargement, processus mort),
  échoue, jamais un succès (QUA-013) ; hors passe (lancement à la main), le lanceur est rejoué — `QUA-317`
- La recette d'adoption déclare désormais un contrôle de contrat par ce mécanisme ; un projet déjà adopté est guidé :
  `drwil doctor` signale, sans rien écrire, les contrôles `vitest|jest … -t "<ID>"` qui relancent chacun le lanceur, et
  donne la forme groupée — `QUA-318`
- Mesure : sur une copie de `marinade-poulet` (ou un projet de test de même forme, 27 contrats Vitest), le temps de
  `run-checks` avant et après est relevé dans le journal de clôture — `QUA-013`
- Lot 2 : sur un commit dont les contrôles viennent de passer, la seconde passe ne rejoue pas l'e2e ; la cause du
  rejeu est d'abord reproduite et dite (contrôle sans `paths`, ou passe qui ne reprend pas ses verdicts) ; cause : contrôle sans
  `paths`, corrigée par la recette et signalée par `doctor` — `QUA-141`
- Lot 4 : sur une couche Node **à 100 %** (seuil déjà au maximum), la paire `coverage-<couche>` et
  `coverage-diff-<couche>` exactement telle que le kit la génère est aussi fusionnée en un seul run ; une paire
  modifiée à la main n'est jamais réécrite et `drwil doctor` la signale — `QUA-302`
- Lot 5 : la CI GitLab livrée sauvegarde le cache des verdicts à chaque fusion sur la branche principale et le
  restaure sur une MR, comme la CI GitHub ; une MR dont le code des contrôles n'a pas changé reprend leurs verdicts.
  Éprouvé sur un vrai projet GitLab (`marinade-poulet` ou bac à sable) — `QUA-250`
- Lot 5 : un pipeline GitLab de la branche principale dont l'arbre est celui qu'une MR verte a prouvé saute ses
  contrôles et sauvegarde quand même ses verdicts, comme le push GitHub — `QUA-296`
- Lot 5 : la CI GitHub et la CI GitLab livrées sont iso : chaque optimisation de l'une a son équivalent dans l'autre,
  ou un écart déclaré avec sa raison ; un test compare les deux fichiers livrés étape par étape — `QUA-319`

## Contrats modifiés

- `QUA-302` — ancien critère : la fusion de la paire de couverture ne vise que la couche Node en dette ; une couche à
  100 % garde ses deux runs — raison : une couche à 100 % paie aussi deux runs (constat `marinade-poulet`, environ
  2 min 30 s) (validé par le demandeur le 2026-11-19)
- `QUA-303` — ancien critère : « Un projet déjà fusionné (QUA-301, QUA-302), une couche à 100 % et une paire Python ne
  sont pas signalés. » (seuil c8 seul) — raison : accorder la règle au code (une paire c8 à 100 % réglée à la main est
  déjà signalée) et à QUA-302 ; cas réel `marinade-poulet` : paire Vitest à 100 % réglée à la main, hors table du kit,
  qui joue les tests deux fois (environ 2 min 30 s), ni fusionnée ni signalée — désormais signalée avec sa commande
  unique, jamais réécrite (validé par le demandeur le 2026-11-20)
- `QUA-250` — ancien critère : la sauvegarde du cache à chaque fusion n'est corrigée que pour la CI GitHub livrée,
  la reprise GitLab jamais éprouvée — raison : `marinade-poulet` est sur GitLab (validé par le demandeur le
  2026-11-19)
- `QUA-296` — ancien critère : le saut du push déjà prouvé et la sauvegarde de ses verdicts, CI GitHub seule —
  raison : GitHub et GitLab doivent être iso (validé par le demandeur le 2026-11-19)
- `.githooks/engine.mjs` — le lanceur de tests des contrats est lancé une seule fois par passe et partagé entre les
  contrats (lot 1), l'e2e n'est plus rejoué en seconde passe (lot 2) (validé par le demandeur le 2026-11-19)
- `.githooks/engine-pass.mjs` — même changement : lancement partagé par passe (lot 1), e2e non rejoué en seconde passe
  (lot 2) (validé par le demandeur le 2026-11-19)
- `.githooks/engine-launch.mjs` — même changement : lancement partagé par passe (lot 1), e2e non rejoué en seconde
  passe (lot 2) (validé par le demandeur le 2026-11-19)
- `.githooks/run-checks.mjs` — même changement : lancement partagé par passe (lot 1), e2e non rejoué en seconde passe
  (lot 2) (validé par le demandeur le 2026-11-19)
- `.githooks/run-checks-verdicts.mjs` — la seconde passe reprend les verdicts déjà acquis au lieu de rejouer (lot 2)
  (validé par le demandeur le 2026-11-19)
- `QUA-219` — ancien critère : la commande, jointe en une ligne, passe toujours par l'interpréteur de commandes,
  stdin fermé — raison : `git commit -F -` recevait un message vide et un `-m` à parenthèses échouait (« Syntax error »)
  (validé par le demandeur le 2026-11-20, réponse « Traiter maintenant » au sondage des limites)
- `.githooks/wait-command.mjs` — une commande de plusieurs mots est lancée sans interpréteur et reçoit le stdin
  redirigé (QUA-219) (validé par le demandeur le 2026-11-20, réponse « Traiter maintenant » au sondage des limites)
- `.githooks/wait-command.test.mjs` — tests des guillemets, parenthèses, stdin et programme absent (QUA-219) (validé
  par le demandeur le 2026-11-20, réponse « Traiter maintenant » au sondage des limites)
- `QUA-033` — ancien critère : les contrôles `tests-<id>` du dépôt passent par son lanceur propre,
  outils/tests-par-fichier.mjs (`--tous` pour l'autotest et `miroirs-gabarit`) — raison : une seule source, le module
  livré `.githooks/contract-tests.mjs` (QUA-316, mode `--all`) (validé par le demandeur le 2026-11-20, réponse
  « Traiter maintenant » au sondage des limites)
- `QUA-093` — ancien critère : « à 100 %, le contrôle est câblé à 100 % », `verify` exigeant pourtant
  `coverage-diff-<couche>` d'une couche existante — raison : `guarantees` et `verify` incohérents (« contrôle
  `coverage-diff-<couche>` non déclaré ») (validé par le demandeur le 2026-11-20, réponse « Traiter maintenant » au
  sondage des limites)
- `QUA-318` — ancien critère : `doctor` signale, sans rien écrire — raison : `doctor --fix` réécrit la forme sûre
  (validé par le demandeur le 2026-11-20, réponse « Traiter maintenant » au sondage des limites)
- `QUA-303` — ancien critère : signal sans écriture — raison : `doctor --fix` fusionne la paire quand c'est sûr
  (validé par le demandeur le 2026-11-20, réponse « Traiter maintenant » au sondage des limites)
- `.githooks/engine-selftest.mjs` — l'autotest des hooks passe par le module livré (`--runner node --all`) au lieu du
  lanceur du dépôt (validé par le demandeur le 2026-11-20, réponse « Traiter maintenant » au sondage des limites)

## 2. Hors périmètre

- Les piles hors JavaScript (pytest, go test) : la recette garde pour elles le filtre par ID, un lancement par
  contrat.
- Le découpage de l'e2e en tranches : `docs/projects/controles-lents-decoupes-des-le-depart.md`.
- Toute modification de `marinade-poulet` : le projet se met à jour par `npx drwil init` puis adopte la forme groupée
  dans sa propre session.

## 3. Contraintes

- Cause avant correctif : mesurer d'abord, sur une copie, le coût d'un lancement Vitest et le gain d'un lancement
  unique (avec reporter JSON par test) ; vérifier que `-t` et le reporter de Vitest et Jest donnent le nom complet de
  chaque test.
- Reprendre le fonctionnement prouvé de outils/tests-par-fichier.mjs (passe, dossier partagé sous `.drwil/evidence`,
  effacé en fin de passe ; verdict refusé sans test à l'ID) sans le recopier : le dépôt l'utilise aussi, une seule
  source (`outils/miroirs.json` dit l'écart si le dépôt garde son outil).
- Plafond de 200 lignes par fichier (QUA-001) ; on édite le gabarit puis `npm run installer-depot` (QUA-018) ;
  couverture à 100 % des hooks (QUA-004).

## 4. Décisions

- 2026-11-19 (demandeur) : GitHub et GitLab doivent être iso ; le lot 5 devient la parité de la CI livrée.
- 2026-11-19 (demandeur) : couverture unique sur une couche à 100 % et cache des verdicts sur GitLab ajoutés
  (lots 4 et 5), constat `marinade-poulet`.
- 2026-11-19 (demandeur) : P0, rangé dans la 0.11.2 avant la release, après le cadrage en BUILD et avant les tranches
  dès le départ ; cadré dans la PR de cadrage #455.

## 5. Points à trancher

- [IA] Forme exacte du lanceur unique par outil — tranché au lot 1 : Vitest `run --reporter=default --reporter=json
  --outputFile.json=<f>`, Jest `--json --outputFile=<f>` (même rapport, `ancestorTitles` + `title` : le nom complet de
  chaque test), `node --test` avec le reporter du module ; lancés par `node` depuis le `bin` du paquet trouvé dans
  `node_modules`, sans `npx` ni interpréteur de commandes.

## 6. Increments

- **Lot 1 — lanceur groupé et recette** [IA] : le module contract-tests du gabarit, reporters par outil, tests
  (verdict par ID, aucun test à l'ID refusé, un seul lancement par passe), recette d'adoption, contrat créé.
  Critère de sortie : tests verts ; `node .githooks/run-checks.mjs` sans échec.
- **Lot 2 — e2e non rejoué dans la seconde passe** [IA] : reproduire, dire la cause, corriger.
- **Lot 3 — `doctor`** [IA] : avertissement des contrôles non groupés.
- **Lot 4 — une seule couverture sur une couche à 100 %** [IA] : `drwil guarantees` fusionne aussi la paire d'une
  couche à 100 % ; `doctor` signale la paire modifiée à la main.
- **Lot 5 — parité GitHub et GitLab de la CI livrée** [IA] puis [humain] : reproduire (une MR rejoue-t-elle tout ?),
  dire la cause, corriger ; saut du pipeline de la branche principale déjà prouvé ; test de parité des deux CI
  livrées ; essai réel sur GitLab.
- **Lot 6 — mesure** [humain] : temps de CI de `marinade-poulet` avant/après, au journal ; ligne « Unreleased » du
  CHANGELOG (dernier lot [IA] : le lot 5).

## 7. Reprise

- **Dernier état** (2026-11-20) : lot 1 fait. Mesure sur une copie de même forme (27 contrats Vitest 3.2, jsdom) :
  27 lancements `vitest run -t "<ID>"` en 38,8 s, les 27 contrôles `node .githooks/contract-tests.mjs <ID>` en 3,8 s
  dans une passe (un seul lancement). Livrés : `.githooks/contract-tests.mjs` et `.githooks/contract-tests-reporters.mjs`
  (gabarit et copies), tests `.githooks/contract-tests.test.mjs` (couverture 100 %), recette d'adoption étape 5,
  contrats `QUA-316` et `QUA-317` avec leurs contrôles. Le moteur n'a pas eu à changer pour le lot 1 : il pose déjà
  `DRWIL_PASS_ID` et `run-checks` efface déjà le dossier des résultats partagés de la passe.
  outils/tests-par-fichier.mjs (QUA-033) reste l'outil du dépôt, hors du bloc scope : sa bascule sur le module livré
  est une limite hors cadre. Bloc scope élargi au lot 1 à `packages/drwil/templates/common/base/docs/projects/kit-mechanics.md` (et sa copie) : tout hook
  livré y est cité, sinon le rappel de cadrage d'un projet installé le dit orphelin.
- **Lot 2 fait** (2026-11-20) : cause reproduite — **contrôle sans `paths`**, pas une passe qui ne reprend pas ses
  verdicts. Deux passes CI successives (`CI=1 DRWIL_CI_REUSE=1`, comme le rejeu de `.githooks/base-checks.mjs`, QUA-113) sur un
  même commit : un contrôle sans `paths` est lancé deux fois, le même avec `paths: ["**"]` une seule (repris). Le
  `e2e` de `marinade-poulet` est déclaré sans `paths` : il n'a pas d'empreinte propre (QUA-141) et la seconde passe le
  rejoue. Correctif : la recette d'adoption (étape 3 bis, gabarit et copie) fait déclarer les `paths` du contrôle e2e ;
  contrats existants cités (QUA-141, QUA-113), aucun créé, le moteur inchangé. La recette livrée ne cite pas leurs ID
  (absents du registre d'un projet : `check-docs` refuse la mise à jour du kit, tests QUA-237, QUA-239, QUA-244).
  `marinade-poulet` ajoute ses `paths` dans sa propre session (hors périmètre).
- **Lot 3 fait** (2026-11-20) : `drwil doctor` lit les contrôles déclarés, sans rien écrire (`packages/drwil/src/doctor-checks.ts`,
  branché d'une ligne dans `packages/drwil/src/doctor.ts`, textes français et anglais dans le module : `packages/drwil/src/doctor-texts.ts` hors du bloc scope).
  Point « Contrôles de contrats non groupés » : commande `vitest`, `jest` ou `npm test` filtrée par `-t`/`--testNamePattern`
  sur un ID, avec sa forme groupée (`node .githooks/contract-tests.mjs [--runner vitest|jest] <ID> [fichiers]`). Point
  « Contrôles confiés à la CI sans paths » : `runAt: ["ci"]` seul, `paths` absent ou vide, avec la ligne
  `"paths": ["**"]`. Contrat créé `QUA-318`, contrôle `tests-qua-318`, tests `packages/drwil/test/doctor-checks.test.mjs`.
  Bloc scope élargi au module et à ses tests (commit de la fiche seule).
- **Lot 4 fait** (2026-11-20) : cause reproduite — le code fusionnait déjà la paire de série à 100 % (`C8_CHECK` écrit
  `--lines 100…` pour des seuils absents : `tool.run({})` est la commande à 100 %, que `seriesThresholds` reconnaît) ;
  seuls le texte de QUA-302 et sa preuve l'excluaient : tests `packages/drwil/test/coverage-merge.test.mjs` étendus, QUA-302 réécrit.
  Décisions du demandeur (2026-11-20) : QUA-303 clarifié (« une couche à 100 % qui ne déclare qu'un `coverage-<couche>` »)
  et paire Vitest réglée à la main traitée : `singleFromPair` (`packages/drwil/src/guarantees-merge.ts`) compose aussi la commande unique
  Vitest (`--coverage.reporter=cobertura` et `--coverage.reportsDirectory` ajoutés après `--coverage`) ; `doctor` la
  signale, `guarantees` ne la réécrit jamais (signal seul). Commande éprouvée sur un projet Vitest 4.1 de test : échoue
  sur seuil manqué et sur diff non couvert, passe couverte, un seul run. Tests `packages/drwil/test/coverage-vitest.test.mjs` (fichier
  séparé : l'autre est à 200 lignes), ajoutés au contrôle `tests-qua-303`. Bloc scope élargi à
  `packages/drwil/src/doctor-coverage.ts` et à ce test (commit de la fiche seule). Le texte `twiceDetail`
  (`packages/drwil/src/doctor-texts.ts`, hors du bloc scope) dit « `npx drwil guarantees` le fait pour une paire de série » : vrai, mais
  sans dire qu'une paire Vitest ne l'est jamais — limite hors cadre.
- **Lot 5 fait, partie [IA]** (2026-11-20) : cause lue dans les deux CI livrées (un banc local de pipeline GitLab simulé
  a été refusé par le garde-fou de l'agent ; la preuve est le test bash). Une MR GitLab ne rejoue pas tout par
  construction : elle télécharge l'artefact de verdicts du dernier pipeline **réussi** de la branche principale et
  reprend chaque contrôle d'empreinte inchangée (QUA-250), plus les verdicts lents de sa passe précédente (QUA-291) ;
  elle rejoue tout sans pipeline réussi de la branche principale, sur téléchargement refusé, ou pour un contrôle sans
  `paths` (lot 2). Le cache est sauvegardé à chaque fusion, mais **au prix d'un rejeu complet** du pipeline de la
  branche principale : le saut du push déjà prouvé (QUA-296) n'existait que sur GitHub, et rien ne disait au journal
  de quand dataient les verdicts repris (QUA-297, GitHub seul). Correctif dans `packages/drwil/templates/common/ci/gitlab/.gitlab-ci.yml` :
  le `checks` d'une branche garde les verdicts de sa passe avant le rejeu et pose l'arbre prouvé en dernière ligne du
  kit (artefact `pr-verdicts`) ; le `plan` de la branche principale retrouve la branche fusionnée (pointant sur le
  commit ou son second parent, ou nommée par le message de fusion par défaut : le jeton du job ne lit pas l'API des
  MR), compare les arbres, ne planifie aucune tranche et passe arbre et verdicts à `checks` dans son plan de tranches
  (seul artefact du plan, figé par `packages/drwil/test/ci-shards.test.mjs`), qui revérifie l'arbre, saute la passe et garde ces
  verdicts ; date des verdicts restaurés dite. GitHub inchangé ; fichier GitLab ramené à 199 lignes (plafond QUA-157).
  Contrat créé `QUA-319` (parité, contrôle `tests-qua-319`, tableau `OPTIMISATIONS` et écarts déclarés `ECARTS` : seul
  QUA-251) ; QUA-250 et QUA-296 modifiés. Les tests vivent dans `packages/drwil/test/ci-parite.test.mjs`, pas dans
  `packages/drwil/test/kit-ci.test.mjs` : les fichiers `kit-*.test.mjs` sont figés par l'inventaire de leur découpe (QUA-315) ; bloc scope
  élargi à ce fichier (commit de la fiche seule). Ligne « Unreleased » du CHANGELOG ajoutée. Limite hors cadre :
  `docs/features.md` dit encore « le push sur la branche principale rejoue tout » (faux depuis QUA-296 sur GitHub,
  désormais aussi sur GitLab).
- **Limites traitées sur le champ** (2026-11-20, réponse « Traiter maintenant » au sondage des limites ; bloc scope
  élargi par un commit de la fiche seule) : registre livré, l'exemple `APP-001` enseigne la forme groupée
  `node .githooks/contract-tests.mjs APP-001` (QUA-030 inchangé : « filtre ses tests par l'ID » reste vrai) ; recette
  d'adoption, étape 7 : `doctor` signale contrôles de contrats non groupés, contrôles CI sans `paths` et paire de
  couverture en double (248 lignes) ; `twiceDetail` dit qu'une paire réglée à la main, Vitest comprise, n'est jamais
  fusionnée, seulement signalée ; `docs/features.md` dit le saut du push prouvé ; `wait-command` (QUA-219 modifié) :
  cause reproduite (ligne jointe rejouée par `sh`, stdin fermé), plusieurs mots lancés sans interpréteur, stdin
  redirigé transmis, programme absent en échec.
- **Trois limites traitées sur le champ** (2026-11-20, réponse « Traiter maintenant » au sondage des limites ; bloc
  scope élargi par deux commits de la fiche seule) : (1) **une seule source pour le lanceur par fichier** : les
  contrôles `tests-<id>` du dépôt, `miroirs-gabarit` et l'autotest des hooks passent par le module livré
  `.githooks/contract-tests.mjs`, qui gagne `--all` (tous les tests doivent passer, code non nul ou fichier en erreur
  en échec, QUA-316) ; outils/tests-par-fichier.mjs et son test retirés, leurs cas prouvés par les tests de
  QUA-316/QUA-317. Autotest seul (45 fichiers `.githooks/*.test.mjs`, hors passe partagée) : 310 s avec l'ancien
  lanceur, 268 s avec le module livré, sur la même machine, code 0 les deux. (2) **couche existante à 100 %** :
  reproduit (`guarantees` câblait `coverage-root` seul, `verify` disait « `coverage-diff-root` non déclaré ») ;
  `verify` n'exige plus que `coverage-<couche>` quand sa commande est celle du kit à 100 % (QUA-093). (3) **`doctor
  --fix`** (aucune option de correction n'existait dans `doctor`) : `packages/drwil/src/doctor-fix.ts` réécrit la forme
  sûre (QUA-318, QUA-303), tests `packages/drwil/test/doctor-fix.test.mjs`. Limite non traitée : une paire dont un
  contrat cite `coverage-<couche>` reste signalée (réécrire le registre sortirait du sûr) ; `drwil guarantees`, en
  fusionnant une paire de série (QUA-302), retire `coverage-<couche>` sans regarder s'il est cité — à vérifier.
- **Prochaine étape** : lot 5 [humain] — essai sur un vrai pipeline GitLab (`marinade-poulet` après `npx drwil init`, ou
  bac à sable) : une MR verte à jour avec la branche principale, fusionnée ; le job `plan` du pipeline de la branche
  principale dit « Checks not replayed: tree … proved », `checks` dit « this tree is proven » et garde le fichier de
  verdicts en artefact ; la MR suivante dit « Verdicts cache: … run at … » et reprend ses contrôles inchangés. Puis
  lot 6 [humain] — mesure du temps de CI avant/après, au journal de clôture.

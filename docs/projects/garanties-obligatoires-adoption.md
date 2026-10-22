# Projet : garanties obligatoires à l'adoption — couverture, e2e, versionnement et présentation du projet

**Statut** : cadré le 2026-10-22 — rien de commencé.
**Risque** : HIGH
**Maturité** : prêt

(cadrage : le livrable — le gabarit de `packages/drwil/templates/` —, pas
drwil-le-dépôt, QUA-018. Un seuil de couverture ne redescend jamais.)

<!-- scope
files:
  - packages/drwil/src/index.ts
  - packages/drwil/src/stack.ts
  - packages/drwil/src/doctor.ts
  - packages/drwil/src/config.ts
  - packages/drwil/src/guarantees.ts
  - packages/drwil/src/verify.ts
  - packages/drwil/src/i18n.ts
  - packages/drwil/test/guarantees.test.mjs
  - packages/drwil/templates/common/base/.githooks/briefs.mjs
  - packages/drwil/templates/common/base/README.md
  - packages/drwil/templates/common/base/AGENTS.md
  - packages/drwil/templates/common/base/.githooks/pr-watch.mjs
  - packages/drwil/templates/common/tools/claude/.claude/skills/start-a-workstream/SKILL.md
  - packages/drwil/templates/common/optional/create-release/*
  - packages/drwil/templates/common/base/docs/features.md
  - packages/drwil/templates/common/base/docs/contracts-catalog.md
  - packages/drwil/templates/common/base/docs/recipes/adopt-the-kit.md
  - packages/drwil/templates/common/tools/claude/.claude/skills/adopt-the-kit/SKILL.md
  - docs/contracts.md
  - .drwil/ia-first.json
  - docs/architecture.md
  - packages/drwil/CHANGELOG.md
  - packages/drwil/bin/drwil.js
  - packages/drwil/src/guarantees-*.ts
  - packages/drwil/test/kit.test.mjs
  - packages/drwil/test/cycle.test.mjs
  - .githooks/briefs.mjs
  - .githooks/state.test.mjs
  - .githooks/pr-watch.mjs
  - .githooks/pr-watch.test.mjs
  - .githooks/create-release.mjs
  - .githooks/create-release.test.mjs
  - .githooks/release-review.mjs
  - .githooks/release-review.test.mjs
  - .claude/skills/start-a-workstream/SKILL.md
  - .claude/skills/adopt-the-kit/SKILL.md
  - docs/recipes/adopt-the-kit.md
  - docs/features.md
  - packages/drwil/templates/common/base/docs/projects/kit-mechanics.md
-->

(périmètre : la commande des garanties et son code, la détection de pile
réutilisée, la prise en compte dans `verify` et dans l'ordre des fiches, ses
tests, le catalogue, la recette et le skill d'adoption, le registre et la
carte ; à compléter au lancement si le découpage du code l'exige — élargir
coûte un commit séparé. Élargi au lancement (2026-10-22) : la CLI
`packages/drwil/bin/drwil.js` qui expose la commande, les modules `guarantees-*.ts`
(plafond de 400 lignes, QUA-001), les copies installées du gabarit dans le
dépôt (`.githooks/`, `.claude/skills/`, recette) et leurs tests ; puis le
cadrage livré de la mécanique du kit, qui doit couvrir les nouveaux scripts.)

## 1. Besoin

Le demandeur veut que drwil **garantisse** la qualité de tout ce qu'un agent
génère, pour toute pile et tout projet, sans exception (2026-10-22) : une
couverture de test à 100 % dès le départ d'une pile neuve, et un test de bout
en bout (e2e) des chemins critiques. Sans cela, la promesse de qualité de
drwil est creuse.

Obstacles aujourd'hui :
- `init` sur un dossier vide ne détecte **aucune pile** : elle n'existe qu'une
  fois choisie à l'étape 0 de `/drwil-adopt` ;
- le câblage du contrôle de couverture se fait à la main, pile par pile ;
- l'e2e (`catalog:QUA-020`) n'est qu'un objectif du catalogue, jamais exigé ;
- rien n'empêche de continuer à travailler quand l'outil d'une pile manque.

Principe retenu : le **contrat** est universel, seule la **preuve** change
selon la techno. Une garantie est soit câblée et prouvée, soit une **fiche
bloquante** `[P0]` est créée automatiquement.

## Critères d'acceptation

(les contrats sont à créer au lancement, avec leur champ **Origine** ; IDs à
attribuer à ce moment-là dans le registre.)

- Une commande drwil, lancée par `/drwil-adopt` une fois la pile connue, câble
  dans `.drwil/ia-first.json` → `checks` le contrôle de couverture de chaque
  couche dont la pile est dans la table des outils, à 100 % lignes, branches,
  fonctions et instructions — `QUA-087`
- Pour une couche dont l'outil de couverture est absent ou inconnu, la
  commande crée une fiche bloquante `[P0]` (`docs/projects/couverture-<couche>.md`)
  qui demande au demandeur de choisir l'outil ; tant qu'elle existe, `verify`
  est en `FAIL` sur cette couche et `/drwil-start` ne propose qu'elle —
  `QUA-088`
- Le même mécanisme exige un e2e des chemins critiques (`catalog:QUA-020`) :
  une fiche bloquante `[P0]` demande au demandeur de nommer ces chemins, et
  ne se clôt que lorsqu'un test e2e rejoué par un contrôle les couvre —
  `QUA-089`
- Aucune exception : pas de profil léger, pas de dérogation à ces garanties ;
  une exclusion de fichier (configuration, point d'entrée…) reste permise si
  elle est déclarée et justifiée dans le contrat de couverture du projet —
  `QUA-090`
- Un outil de couverture non installable ou non lançable ne donne jamais un
  « passé » : la commande le dit, le contrôle reste « non exécuté » et la
  fiche bloquante est créée (QUA-013) — `QUA-091`
- La recette d'adoption et le catalogue disent : projet neuf = 100 % et e2e
  d'emblée ; projet existant en dette = seuil bas, couverture du diff,
  cliquet — la recette ne se contredit plus — `QUA-011`
- [humain] Sur un dossier vide, une pile connue (Node/TypeScript d'abord) puis
  un premier test : le contrôle à 100 % passe, retirer le test le fait échouer ;
  sur une pile hors table, la fiche bloquante apparaît et bloque —
  `QUA-092`

- Sur un projet **existant** adopté avec du code legacy non couvert, la
  commande mesure la couverture actuelle de chaque couche et la pose comme
  seuil (cliquet, jamais en baisse), exige 100 % sur le code nouveau ou
  modifié (couverture du diff) et crée une fiche de montée `[P1]` non
  bloquante, cible 100 % ; l'e2e reste exigé comme sur un projet neuf —
  `QUA-093`

- Un projet gouverné a un dépôt Git et une forge, GitHub ou GitLab : CI
  déclarée (`--ci github|gitlab`), dépôt distant, protection de la branche
  principale (fusion par PR/MR, contrôles requis). Un élément absent crée une
  fiche bloquante `[P0]` ; la protection de branche se pose par `gh` ou
  `glab` **avec l'accord de l'humain**, jamais en silence ; sans accès à la
  forge, le contrôle reste « non exécuté » et la fiche reste ouverte
  (QUA-013) — `QUA-094`
- Bonnes pratiques de versionnement imposées par la même protection de
  branche : CI verte obligatoire, sans contournement même pour les
  administrateurs ; la CI rejoue les contrôles du hook local, donc un
  `--no-verify` est rattrapé avant la fusion ; l'usage de `--no-verify` est
  signalé par `drwil verify` quand il est détectable. Projet neuf : tout est
  imposé dès `init` (fiche bloquante `[P0]`) ; projet existant adopté : même
  liste, aussi en fiche bloquante `[P0]` (aucune souplesse, contrairement à
  la couverture) — `QUA-095`

- Le README livré présente le **produit de l'utilisateur** d'abord (ce que fait
  l'application, pour qui, comment la lancer) ; l'outillage drwil n'y tient
  que quelques lignes de renvoi vers `AGENTS.md` et `docs/` — `QUA-096`
- Tant que le README, la ligne « Le projet en 5 lignes » d'`AGENTS.md` ou
  `docs/features.md` gardent le texte du squelette (« to describe »,
  « template to fill in »), une fiche bloquante `[P0]` demande à l'humain de
  les rédiger (à partir de la carte `docs/architecture.md` si elle existe) ;
  elle se clôt quand le texte a changé — `QUA-097`
- La commande de release refuse de poser le tag (aperçu et création) tant que
  l'examen de `README.md`, `docs/features.md` et `docs/architecture.md`
  n'est pas fait : pour chacun, le script montre ce qui a changé depuis le
  dernier tag (chantiers clos, fichiers de code touchés, document modifié ou
  non) ; l'agent le met à jour dans la PR de version, ou enregistre
  « inchangé » avec sa raison (une ligne versionnée) ; un document qui
  garde du texte de squelette bloque aussi — `QUA-098`
- Une PR qui ne touche que de la documentation est mise en fusion
  automatique par l'agent sans poser la question `drwil-merge` ; le sondage
  ne garde la question que pour les PR qui touchent du code. Le dépôt doit
  autoriser l'auto-merge, sinon le message de refus existant s'applique —
  `QUA-099`
- Après un push ou la création d'une PR, un script attend la fin de la CI
  (`gh pr checks`) et dit « verte », « fusionnée » ou « rouge » avec le
  contrôle en échec ; l'agent corrige l'échec sans jamais le contourner
  (QUA-019, pas de contournement) ; sans accès à la forge, le suivi reste
  « non exécuté » et le dit (QUA-013) ; script Node, valable pour tous les
  outils — `QUA-100`

## Contrats modifiés

- Entrée `catalog:QUA-004` du **gabarit livré** — ancien critère : « Test
  coverage does not drop below a declared threshold; on a project already in
  test debt […] diff coverage » — raison : y ajouter le cas du projet neuf
  (100 % d'emblée, obligatoire). Rien n'est retiré. (validé par le
  demandeur le 2026-10-22)
- Entrée `catalog:QUA-020` du **gabarit livré** — ancien critère : « The
  project's critical paths are covered by an automated end-to-end test,
  replayed in CI » (présenté comme un objectif) — raison : elle devient une
  garantie obligatoire à l'adoption. (validé par le demandeur le
  2026-10-22)
- `QUA-004` du **dépôt drwil** : inchangé.

## 2. Hors périmètre

- Le 100 % du paquet `packages/drwil` lui-même : intention
  `docs/intentions/couverture-paquet-100.md`.
- La qualité des tests (un test qui ne vérifie rien) : une couverture à
  100 % garantit que chaque ligne est **exécutée** par un test, pas qu'elle
  est **correcte** — limite à écrire dans la recette.
- La publication sur npm.
- Toute forge autre que GitHub et GitLab (Bitbucket, Gitea…).

## 3. Contraintes

- Une table de données (pile → outil, commande, métriques que l'outil sait
  mesurer), pas une implémentation par pile : ajouter une pile = une ligne.
- Un outil qui ne mesure qu'une partie des métriques (Go : instructions
  seulement) est dit tel quel, jamais présenté comme les quatre.
- Plusieurs couches dans un projet : une garantie par couche.
- Ce qui ne tourne pas dans un test (HTML, CSS, scripts) n'entre pas dans une
  couverture de lignes : le dire, le couvrir par l'e2e ou le déclarer exclu
  avec sa justification.
- Pas de contradiction avec l'objectif du 2026-10-11 (exigences adaptées au
  risque du produit) : ce chantier **tranche** que ces deux garanties sont
  hors de cette adaptation ; à reporter dans la décision P1 « profils par
  risque ».
- Code et messages de la commande en français et en anglais
  (`packages/drwil/src/i18n.ts`) ; aucun fichier de code au-dessus de 400
  lignes (QUA-001).
- Rien n'est écrasé : un `checks` déjà déclaré est signalé, pas remplacé.

## 4. Décisions

- 2026-10-22 (demandeur) : 100 % de couverture à tout démarrage de pile de
  zéro, sur lignes, branches, fonctions et instructions ; exclusions permises
  si déclarées et justifiées dans le contrat ; portée : recette, catalogue
  **et** câblage automatique ; moment : une commande drwil lancée par
  `/drwil-adopt` quand la pile est connue ; piles : toutes celles que `init`
  détecte.
- 2026-10-22 (demandeur) : outil d'une pile absent ou inconnu → fiche
  bloquante `[P0]` tant que la garantie n'est pas résolue ; l'e2e est exigé de
  la même manière ; **pour tout projet, sans exception** — c'est la garantie
  de drwil.

- 2026-10-22 (demandeur) : projet existant adopté : cliquet au niveau mesuré
  + 100 % sur le code nouveau ou modifié + fiche de montée non bloquante.

- 2026-10-22 (demandeur) : le versionnement est une garantie obligatoire au
  même titre : GitHub ou GitLab (CI et dépôt distant) obligatoire, sinon
  fiche bloquante ; la fiche inclut la protection de la branche principale ;
  même chantier que les garanties, en lot supplémentaire.

- 2026-10-22 (demandeur) : le README d'un projet gouverné doit correspondre au
  projet de l'utilisateur, pas à drwil ; constat sur `drwil_dbox` : README,
  « 5 lignes » et `docs/features.md` jamais remplis alors que la carte l'est (seule
  la carte a un contrôle) ; même chantier, lot supplémentaire.

- 2026-10-22 (demandeur) : c'est la commande de release qui impose la mise à
  jour du README, de `docs/features.md` et de la carte, pas la clôture ; le
  script impose l'examen, l'agent rédige ; ces mises à jour partent dans la PR
  de version, avant le tag (la version publiée doit les contenir) ; la note de
  recette reste après le tag, dans sa PR (elle a besoin de l'empreinte du
  tarball).

- 2026-10-22 (demandeur) : les bonnes pratiques de versionnement (CI sans
  contournement, `--no-verify` rattrapé) sont bloquantes aussi sur projet
  existant, sans la souplesse de la couverture.

- 2026-10-22 (demandeur) : règle livrée au kit : toute PR de documentation
  seule se fusionne en automatique sans poser la question ; même chantier,
  lot supplémentaire.

- 2026-10-22 (demandeur) : le suivi de la CI d'une PR par un script (verte,
  rouge, fusionnée) est un minimum ; même chantier, lot supplémentaire.

## 5. Lots

Un seul chantier : l'e2e est obligatoire au même titre que la couverture, donc
aucune release ne part avec l'une sans l'autre.

- **Lot 1 — couverture** : table des outils (Node/TypeScript, Python, Go, JVM
  d'abord ; toute autre pile passe par la fiche bloquante tant que sa ligne
  n'existe pas), commande de câblage à 100 %, fiche bloquante `[P0]`, prise en
  compte dans `verify`, l'ordre de `/drwil-start` et les commits de code de
  la couche.
- **Lot 1bis — projet existant** : mesure du niveau actuel, cliquet,
  couverture du diff à 100 % sur le code nouveau ou modifié, fiche de montée
  `[P1]` non bloquante.
- **Lot 2 — e2e obligatoire** : la fiche bloquante demande les chemins
  critiques ; le test est écrit avec l'outil de la pile (choix du demandeur) ;
  un seul contrôle le rejoue ; la fiche ne se clôt qu'une fois ce contrôle
  vert.
- **Lot 2bis — versionnement** : détection du dépôt, de la CI et de la
  forge (gabarits GitHub et GitLab existants), fiche bloquante `[P0]` quand un
  élément manque, protection de la branche principale par `gh` ou `glab` avec
  l'accord de l'humain ; mêmes règles de bonne pratique (CI obligatoire sans
  contournement administrateur, CI rejouant les contrôles du hook, signalement
  de `--no-verify` si détectable), imposées en fiche bloquante `[P0]`, sur
  projet neuf comme sur projet existant.
- **Lot 2ter — présentation du projet** : gabarit du README recentré sur le
  produit (`packages/drwil/templates/common/base/README.md`), détection du
  texte de squelette dans le README, `AGENTS.md` et `docs/features.md`,
  fiche bloquante `[P0]` ; examen imposé par `packages/drwil/templates/common/optional/create-release/create-release.mjs`
  (`packages/drwil/templates/common/optional/create-release/`) avant le tag.
- **Lot 2quater — fusion automatique des PR de documentation** : règle dans
  `packages/drwil/templates/common/base/AGENTS.md` et le skill
  `packages/drwil/templates/common/tools/claude/.claude/skills/start-a-workstream/SKILL.md`.
- **Lot 2quinquies — suivi de la PR** : script Node du gabarit (dossier
  `.githooks` du gabarit de base) qui suit la CI d'une PR par `gh`, et
  consigne dans `AGENTS.md` de le lancer après un push.
- **Lot 3 — documents** : recette, catalogue et skill d'adoption.

## 6. Reprise

- **Dernier état** (2026-10-22) : cadré ; recommandations de l'agent : blocage
  du verdict **et** des commits de code de la couche concernée (les commits de
  documents et de la fiche restent libres) ; table de départ Node/TypeScript,
  Python, Go, JVM ; e2e non automatisé par pile. Validées par le demandeur le 2026-10-22.
- **Prêt** : recommandations, modification de `catalog:QUA-004` et
  `catalog:QUA-020` validées le 2026-10-22 ; reste à reporter dans la
  décision P1 « profils par risque » que ces garanties sont hors de
  l'adaptation au risque.
- **Prochaine étape** : lancer le lot 1 (`/drwil-start`).

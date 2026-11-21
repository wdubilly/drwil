# Projet : `drwil init` s'installe et se met à jour dans un dépôt existant sans commit refusé ni CI perdue

**Statut** : cadré le 2026-11-21.
**Risque** : HIGH
**Maturité** : prêt
**Intention** : notes du demandeur du 2026-11-21 (cette conversation), constats reproduits sur une copie de
marinade-poulet et sur un dépôt minimal ; pas de fiche d'intention.

<!-- scope
files:
  - packages/drwil/src/index.ts
  - packages/drwil/src/kit-install.ts
  - packages/drwil/src/kit-update.ts
  - packages/drwil/src/install.ts
  - packages/drwil/src/ci-zone.ts
  - packages/drwil/src/ci-zone-move.ts
  - packages/drwil/src/render.ts
  - packages/drwil/src/cli-texts.ts
  - packages/drwil/templates/common/base/.githooks/scope-gate-kit.mjs
  - packages/drwil/templates/common/base/.githooks/scope.mjs
  - packages/drwil/templates/common/base/.githooks/check-docs-workstreams.mjs
  - packages/drwil/templates/common/base/.githooks/run-checks.mjs
  - packages/drwil/templates/common/base/.githooks/run-checks-kit.mjs
  - packages/drwil/templates/common/base/.githooks/pre-push
  - packages/drwil/templates/common/base/docs/projects/kit-mechanics.md
  - packages/drwil/templates/common/ci/gitlab/.gitlab-ci.yml
  - .githooks/scope-gate-kit.mjs
  - .githooks/scope.mjs
  - .githooks/check-docs-workstreams.mjs
  - .githooks/run-checks.mjs
  - .githooks/run-checks-kit.mjs
  - .githooks/pre-push
  - .githooks/scope-gate.test.mjs
  - .githooks/scope.test.mjs
  - .githooks/check-docs.test.mjs
  - .githooks/run-checks.test.mjs
  - packages/drwil/test/kit-installation.test.mjs
  - packages/drwil/test/kit-mise-a-jour.test.mjs
  - packages/drwil/test/montee-de-version.test.mjs
  - packages/drwil/test/kit-ci.test.mjs
  - docs/projects/kit-mechanics.md
  - docs/architecture.md
  - docs/contracts.md
  - .drwil/ia-first.json
  - docs/projects/pending.md
  - docs/projects/journal.md
  - INSTALL.md
  - packages/drwil/README.md
  - packages/drwil/CHANGELOG.md
-->

## 1. Besoin

Le 2026-11-21, le paquet construit depuis master (tarball local) a été installé sur une copie de marinade-poulet
(`main`, kit 0.11.1, GitLab) et sur un dépôt minimal. Un projet existant ne peut aujourd'hui ni adopter le kit ni le
mettre à jour sans se bloquer :

- **a.** Installation à neuf dans un dépôt Git qui a déjà des commits : aucun chemin de commit. `init` ne commite que
  le dépôt qu'il crée (`QUA-206`, `init` commite le kit sur le dépôt neuf) ; la barrière de périmètre refuse ensuite
  « 197–201 fichier(s) hors fiches commité(s) en SCOPING ». Reproduit sur les deux dépôts.
- **b.** Au commit de cette installation, le contrôle « paths and contracts cited in docs » (`check-docs`) refuse dix
  hooks récents (`.githooks/close-done.mjs`, `.githooks/consumption-split.mjs`, `.githooks/contract-tests-reporters.mjs`,
  `.githooks/contract-tests.mjs`, `.githooks/detour-resume.mjs`, `.githooks/engine-selftest.mjs`, `.githooks/merge-auto-forge.mjs`, `.githooks/scope-derived.mjs`,
  `.githooks/state-history.mjs`, `.githooks/state-polls.mjs`) comme « code file outside any docs/projects/ brief (scope block) », alors
  que la fiche générée `docs/projects/kit-mechanics.md` les cite. Reproduit sur la copie de marinade, pas sur le dépôt
  minimal.
- **c.** Sur un .gitlab-ci.yml qui porte des jobs du projet hors de la zone projet : en mise à jour (copie de
  marinade, fichier de la 0.11.1 balisé mais `build`, ses stages `build`/`deploy` et `only: main` hors zone), `init`
  le réécrit et perd ces 16 lignes, avec un message faux (« the update branch keeps the old version ») ; sur le dépôt
  minimal (fichier sans balises), en installation, `init` refuse de le toucher (« no project zone… Nothing was
  changed ») : comportement incohérent, et dans les deux cas l'adoptant reste sans CI du kit ou sans la sienne.
- **d.** Le commit de mise à jour lancé par `init` (`packages/drwil/src/kit-update.ts`, `timeout: 60_000` sur chaque
  appel git) est coupé (ETIMEDOUT) ; mesuré sans délai : 142 s, dont cliquet de couverture 85 s et couverture du diff
  52 s — deux contrôles du projet déclarés avec `paths: ["**"]`, rejoués alors que le commit ne touche que des
  fichiers du kit.

Cause proposée pour **b** (établie le 2026-11-21 par exécution en lecture seule sur le dossier de reproduction, à
confirmer par un test en échec au lot 2) : dans `outsideBriefs` (`.githooks/scope.mjs`),
`new Map([...byBrief, ...closed])` laisse la version **supprimée** d'une fiche écraser sa version **présente** de même
chemin. Sur la branche de reproduction, des commits antérieurs avaient supprimé `docs/projects/` (désinstallation)
depuis la base de fusion : `closedBriefPatterns` relit l'ancienne `docs/projects/kit-mechanics.md` (0.11.1, sans ces dix hooks), qui
remplace la nouvelle dans la table ; le dépôt minimal n'a aucune fiche supprimée, d'où l'écart. Le même cas se
présente hors réinstallation dès qu'une fiche supprimée par la branche est recréée au même chemin (réouverture
après clôture, `QUA-116`).

## Critères d'acceptation

- `drwil init` sur un dépôt Git existant (commits présents, sans kit) coupe `workstream/kit-installation` depuis la
  branche principale, y commite le kit avec le trailer `Drwil-Kit-Update`, refuse avant d'écrire dans les cas de la
  mise à jour (arbre sale, sans identité, principale en retard, branche existante), et dit de fusionner par une PR ;
  en SCOPING la barrière accepte ce commit et l'arbre est propre ; prouvé sur un dépôt temporaire — `QUA-206`
- La barrière reconnaît le commit d'installation par le manifeste comme celui de mise à jour (parent sans manifeste,
  configuration créée sans garde coupée), et refuse toujours un fichier hors manifeste ou une garde coupée dans ce
  commit — `QUA-238`
- Une fiche présente sur disque n'est jamais remplacée par sa version supprimée par la branche dans le calcul de
  couverture ; un fichier qu'elle cite n'est plus « outside any brief » ; prouvé par le scénario de la reproduction
  (fiche supprimée puis recréée au même chemin) — `QUA-173`
- Sur un fichier de CI GitLab ou GitHub, balisé ou non, en installation comme en mise à jour, `init` réécrit la partie
  du kit et replace dans une zone projet balisée chaque job et chaque stage qui n'est pas du kit, en nommant ce qu'il
  a déplacé ; aucune ligne du projet n'est perdue ; rejouer `init` ne change rien ; le message ne cite une branche de
  mise à jour que s'il y en a une — `QUA-283`
- Le commit lancé par `init` (installation et mise à jour) n'a plus de délai qui le coupe et montre la sortie des hooks
  pendant qu'il tourne — `QUA-237`
- Au pre-commit d'un commit posé par `init` (variable `DRWIL_KIT_UPDATE`) dont tous les fichiers sont expliqués par le
  manifeste (`nonKitFiles` vide), un contrôle du projet qui déclare `paths` est différé (« non exécuté », rejoué au push
  et en CI) ; un seul fichier hors manifeste dans le commit et les contrôles du projet sont joués comme avant — contrat
  à créer
- Au pre-push, quand chaque commit poussé porte le trailer `Drwil-Kit-Update` et que le manifeste explique tous ses
  fichiers (`nonKitFiles` vide), les contrôles du projet à `paths` sont différés (« non exécuté », rejoués par la CI de
  la PR) ; un seul commit poussé qui n'en est pas un et ils sont joués comme avant — même contrat à créer
- Une clé globale du fichier de CI que le projet et le gabarit définissent tous deux (GitLab : `workflow`, `default`,
  `variables`, `include` ; GitHub : `on`, `env`, `permissions`) avec un contenu différent : `init` laisse le fichier
  tel quel, nomme la clé en conflit et dit quoi faire ; rien n'est perdu, en installation comme en mise à jour —
  `QUA-283`
- Recette : la réinstallation à neuf et la mise à jour rejouées sur une copie de marinade-poulet avec un tarball du
  chantier, commit fait sans erreur, CI du projet conservée [humain] — contrat `Manuel` à créer

## Contrats modifiés

- `QUA-206` — ancien critère : « une première installation sur un dépôt existant n'est jamais commitée » — raison :
  sans commit, la barrière refuse l'installation en SCOPING (constat a) ; `init` la commite sur sa branche dédiée
  coupée de la branche principale (validé par le demandeur le 2026-11-21, D-a)
- `QUA-238` — ancien critère : « configuration où seuls changent les réglages recalculés par `init` » (une
  configuration absente du parent est refusée) — raison : le commit d'installation crée la configuration ; elle est
  admise si aucune garde n'y est coupée ; et le pre-commit d'un commit entièrement expliqué par le manifeste diffère
  les contrôles du projet à `paths`, au pre-commit comme au pre-push d'une suite de commits de kit (validé par le
  demandeur le 2026-11-21, D-a, D-d et D-e)
- `QUA-237` — ancien critère : chaque appel git du commit de mise à jour limité à 60 s, sortie des hooks capturée —
  raison : coupure arbitraire (ETIMEDOUT) d'un commit légitime ; plus de délai, progression montrée (validé par le
  demandeur le 2026-11-21, D-d)
- `QUA-283` — ancien critère : « une ligne modifiée à la main hors zone est réécrite et nommée » et « sans marqueurs
  […] ne le remplace qu'après un oui […] hors terminal ou sans oui, le fichier reste tel quel » — raison : les jobs et
  stages du projet sont replacés automatiquement dans une zone projet balisée, même comportement installation et mise
  à jour, rien n'est perdu ; une clé globale en conflit laisse le fichier tel quel, nommée avec ce qu'il faut faire
  (validé par le demandeur le 2026-11-21, D-c et D-f)
- `QUA-173` — ancien critère : une fiche supprimée par la branche couvre les fichiers qu'elle citait, sans dire ce qui
  prime quand une fiche de même chemin est présente — raison : la version supprimée écrasait la version présente
  (constat b) ; la fiche présente prime (validé par le demandeur le 2026-11-21)
- `.githooks/scope-gate-kit.mjs` — gardé à sa version de la branche (QUA-113) : reconnaît le commit d'installation
  (parent sans manifeste, configuration créée sans garde coupée) (validé par le demandeur le 2026-11-21)
- `.githooks/scope.mjs` — gardé à sa version de la branche (QUA-113) : dans `outsideBriefs`, une fiche présente n'est
  plus écrasée par sa version supprimée (validé par le demandeur le 2026-11-21)
- `.githooks/check-docs-workstreams.mjs` — gardé à sa version de la branche (QUA-113) : seulement si la cause de b
  l'exige, même règle pour les fichiers dérivés (`closedBriefTexts`) (validé par le demandeur le 2026-11-21)
- `.githooks/run-checks.mjs` — gardé à sa version de la branche (QUA-113) : au pre-commit d'un commit de `init`
  entièrement expliqué par le manifeste, et au pre-push d'une suite de tels commits, les fichiers du kit sortent de
  la liste qui juge les `paths` ; ce tri vit dans
  sa découpe neuve, .githooks/run-checks-kit.mjs, à déclarer ici par son nom entre accents graves dès sa création
  (validé par le demandeur le 2026-11-21)
- `.githooks/pre-push` — gardé à sa version de la branche (QUA-113) : transmet aussi les commits poussés (SHA local et
  distant de chaque référence) pour que `.githooks/run-checks.mjs` reconnaisse une suite de commits de kit et diffère les
  contrôles du projet à `paths` (validé par le demandeur le 2026-11-21, D-e)
- `.githooks/scope-gate.test.mjs` — gardé à sa version de la branche (QUA-113) : cas du commit d'installation reconnu,
  et refus maintenus (fichier hors manifeste, garde coupée) (validé par le demandeur le 2026-11-21)
- `.githooks/check-docs.test.mjs` — gardé à sa version de la branche (QUA-113) : cas de la fiche supprimée puis
  recréée au même chemin, ses fichiers couverts (validé par le demandeur le 2026-11-21)
- `QUA-315` — ancien critère : aucun test de `packages/drwil/test/kit-installation.test.mjs` ne change — raison : D-c
  rend faux deux tests qui affirmaient « à l'installation, le CI du projet n'est jamais réécrit » (« projet existant :
  init complète sans écraser… », « projet existant : doctor signale ce qui manque… ») ; leurs noms et leur place restent,
  leur corps suit D-c (kit écrit, job du projet dans la zone ; doctor partant d'un CI sans job du kit) (validé par le
  demandeur le 2026-11-21)

## 2. Hors périmètre

- e. Sur le clone frais de marinade-poulet, les tests du projet échouent : propre au projet, pas au kit.
- Le rejeu en CI (`QUA-113`, `QUA-250`) : un contrôle différé au commit reste rejoué en CI, jamais réputé passé.
- Les fichiers de CI que le kit ne livre pas, et les autres forges que GitHub et GitLab.
- La migration de format et `--force` : inchangés.

## 3. Contraintes

- Cause avant correctif : chaque lot commence par un test qui reproduit le constat contre le code actuel ; pour b, la
  cause proposée ci-dessus est confirmée ou corrigée par ce test avant tout correctif.
- Plafond de 200 lignes par fichier de code. Déjà au plafond : `packages/drwil/src/index.ts` (200),
  `.githooks/run-checks.mjs` (200), `.githooks/scope.mjs` (200) ; proches : `packages/drwil/src/render.ts` (199),
  `packages/drwil/src/config.ts` (186). Découpes prévues : l'installation sur dépôt existant dans
  packages/drwil/src/kit-install.ts (neuf, appelé par `packages/drwil/src/index.ts`), le déplacement des jobs dans
  packages/drwil/src/ci-zone-move.ts (neuf), le tri des fichiers du kit au pre-commit dans
  .githooks/run-checks-kit.mjs (neuf) ; le correctif de `.githooks/scope.mjs` à nombre de lignes égal.
- Jamais affaiblir `QUA-238` : un fichier non expliqué par le manifeste reste jugé ; la variable seule ne diffère rien.
- GitLab : `stages:` est une clé unique ; les stages du projet vont dans une zone balisée de la liste `stages` du
  gabarit (troisième zone), les jobs dans la zone `jobs`.
- Établir au lot 1, par test, quels fichiers de l'installation le manifeste n'explique pas (fiches générées, registre,
  `AGENTS.md` du projet, carte) et les faire passer sans ouvrir la barrière à une édition à la main.
- On édite le gabarit puis `npm run installer-depot` (`QUA-018`, dépôt et livrable) ; doc visiteur en anglais.

## 4. Décisions

- D-a (2026-11-21) : branche dédiée. Une installation à neuf dans un dépôt qui a déjà des commits coupe une branche
  depuis la branche principale (comme la mise à jour : `workstream/kit-installation`), `init` y commite le kit avec un
  trailer reconnu par la barrière, et dit de fusionner par une PR.
- D-c (2026-11-21) : garder les jobs projet. `init` réécrit la partie du kit et replace automatiquement les jobs et
  stages qui ne sont pas du kit dans une zone projet balisée (`drwil-project-begin/end`), en disant ce qu'il a déplacé ;
  rien n'est perdu ; même comportement en installation et en mise à jour, GitLab et GitHub.
- D-d (2026-11-21) : les deux. Plus de coupure arbitraire du commit (il va au bout et montre sa progression) et les
  contrôles de code projet ne sont pas rejoués sur un commit qui ne touche que des fichiers du kit, sans affaiblir
  `QUA-238` : la barrière reconnaît la mise à jour du kit par son manifeste.

- D-e (2026-11-21) : pre-push d'une branche de kit, différer aussi. Le pre-push ne rejoue pas les contrôles de code
  projet quand chaque commit poussé est un commit de kit reconnu par le manifeste ; la CI de la PR les rejoue.
  Écartée : garder le rejeu au push (142 s mesurés sur marinade, pour des fichiers que le projet n'a pas écrits).
- D-f (2026-11-21) : clé globale de CI en conflit (GitLab `workflow`, `default`, `variables`, `include` ; GitHub `on`,
  `env`, `permissions`), ne rien réécrire. `init` laisse le fichier tel quel et nomme la clé en conflit avec ce qu'il
  faut faire ; rien n'est perdu. Écartée : fusionner la clé du projet avec celle du gabarit (fusion YAML
  sémantique, risque de garde du kit affaiblie sans que rien ne le dise).

## 5. Points à trancher

Aucun.

## 6. Increments

- **Lot 1 — a : installation commitée sur sa branche** [IA] : test en échec d'abord (dépôt temporaire avec commits,
  `init`, commit refusé) ; packages/drwil/src/kit-install.ts (neuf) coupe la branche et commite, préconditions de
  `packages/drwil/src/kit-update.ts` partagées ; `.githooks/scope-gate-kit.mjs` admet le commit d'installation ; `QUA-206` et `QUA-238` réécrits ;
  `npm run installer-depot`. Critère de sortie : `packages/drwil/test/kit-installation.test.mjs`, `packages/drwil/test/kit-mise-a-jour.test.mjs` et
  `.githooks/scope-gate.test.mjs` verts.
- **Lot 2 — b : la fiche présente prime** [IA] : test qui reproduit la reproduction (fiche supprimée puis recréée au
  même chemin, hook neuf cité) en échec contre le code actuel ; correctif de `outsideBriefs` (et des fichiers dérivés
  si la cause l'exige) ; `QUA-173` réécrit. Critère de sortie : `.githooks/scope.test.mjs` et `.githooks/check-docs.test.mjs` verts.
- **Lot 3 — c : jobs et stages du projet replacés** [IA] : tests sur les deux forges, fichier balisé avec jobs hors
  zone, fichier sans balises et clé globale en conflit (D-f), en installation et en mise à jour ; packages/drwil/src/ci-zone-move.ts (neuf), zone `stages` du gabarit
  GitLab, message juste ; `QUA-283` réécrit. Critère de sortie : `packages/drwil/test/montee-de-version.test.mjs` et `packages/drwil/test/kit-ci.test.mjs`
  verts, rejeu sans effet.
- **Lot 4 — d : commit du kit sans coupure ni contrôles du projet** [IA] : test d'un contrôle projet `paths: ["**"]`
  différé sur un commit de kit et au pre-push d'une suite de commits de kit (D-e), joué dès qu'un fichier ou un commit
  hors kit s'y ajoute ; `.githooks/pre-push` transmet les commits poussés ; délai retiré, sortie montrée ;
  .githooks/run-checks-kit.mjs (neuf), carte et `docs/projects/kit-mechanics.md` ; contrat créé, `QUA-237` réécrit. Critère de
  sortie : `.githooks/run-checks.test.mjs` et `packages/drwil/test/kit-mise-a-jour.test.mjs` verts.
- **Lot 5 — documentation et CHANGELOG** [IA] : `INSTALL.md` et `packages/drwil/README.md` (installation sur dépôt
  existant, branche, PR, CI conservée), ligne « Unreleased » de `packages/drwil/CHANGELOG.md`, en anglais. Critère de
  sortie : `node .githooks/run-checks.mjs` sans échec, `drwil verify --agent` en `GOVERNANCE: PASS`, puis recette
  humaine sur une copie de marinade-poulet.

## 7. Reprise

- **Dernier état** (2026-11-21) : lots 1 (a), 2 (b) et 3 (c) commités. Lot 1 : `init` sur un dépôt git qui a des commits et
  pas de manifeste coupe `workstream/kit-installation` depuis la principale (packages/drwil/src/kit-install.ts,
  `prepareKitCommit` ; préconditions et commit partagés avec la mise à jour : `cutBranch` et `finishUpdate` de
  `packages/drwil/src/kit-update.ts`) et y commite le kit avec le trailer ; la configuration créée est admise par
  `.githooks/scope-gate-kit.mjs` si le parent n'a pas de manifeste et qu'aucune garde n'est coupée ; fichiers du projet
  complétés notés à part (`noteInstallCompletions`). Lot 2 : cause de b confirmée par test (en échec puis vert, dans
  `.githooks/scope.test.mjs`) et par rejeu de `check-docs` sur une copie de la reproduction (10 refus avant, 0 après) :
  dans `outsideBriefs` la table se construit désormais fiches supprimées d'abord, fiches présentes ensuite (la
  présente prime) ; `.githooks/check-docs-workstreams.mjs` inchangé (les fichiers dérivés parcourent les deux
  versions, la présente d'abord, sans remplacement). `QUA-206`, `QUA-238` et `QUA-173` réécrits. Les fichiers
  `packages/drwil/test/kit-<thème>.test.mjs` sont figés par `QUA-315` (inventaire de la découpe) : les tests du paquet
  vont dans packages/drwil/test/montee-de-version.test.mjs. Lot 3 : `placeProject` (packages/drwil/src/ci-zone-move.ts)
  découpe le fichier de CI en blocs (clés de premier niveau GitLab, jobs GitHub), replace dans la zone `jobs` ce que le
  gabarit n'a pas et dans la zone `stages` (neuve, gabarit GitLab, après `test`) les stages qui ne sont pas du kit ;
  conflit (fichier tel quel, clé nommée, D-f) : clé de la zone que le gabarit a aussi, clé du gabarit de contenu
  différent dans un fichier sans balises, clé GitHub de premier niveau sans place. Hors zone d'un fichier balisé, une
  clé du gabarit reste celle du kit (réécrite, signalée). `ciContent` (packages/drwil/src/ci-zone.ts) ne cite la
  branche principale que si `init` commite sur sa branche ; même correction dans `driftQuestion` et `ciQuestion`
  (packages/drwil/src/cli-texts.ts). Deux tests de packages/drwil/test/kit-installation.test.mjs alignés sur D-c (noms
  inchangés, exception `QUA-315` validée le 2026-11-21). `QUA-283` réécrit ; rejeu sur le fichier de CI GitLab de
  marinade `main` : aucune ligne du projet perdue.
- **Travail non commité** : aucun. Dossier de reproduction (hors dépôt, peut disparaître) :
  `/tmp/claude-1000/-home-wdubilly-projects-drwil/853fbde2-e7f4-4598-86e4-35a450054ace/scratchpad/repro-marinade`,
  branche `reinstall`, installation non commitée.
- **Limite hors cadre relevée au lot 1** : `QUA-244` dit « rien n'y est noté à une première installation » et le
  commentaire de `recordCompletion` (packages/drwil/src/manifest-completed.ts) aussi ; l'installation commitée note
  désormais à part les fichiers complétés. Contrat et fichier hors du cadrage : à soumettre au sondage des limites
  (intention prévue : `docs/intentions/` à nommer par la session principale).
- **Limites hors cadre relevées au lot 3** (au sondage des limites, fin de BUILD) : `ci-confirmation-morte` —
  `confirmCi`/`confirmCiWith` ne sont plus appelés mais `packages/drwil/src/cli-install.ts` et
  `packages/drwil/src/config.ts` les branchent encore (intention à créer : ci-confirmation-morte, sous docs/intentions/) ;
  `apercu-ci-replace` — l'aperçu (`packages/drwil/src/preview.ts`) annonce encore le manque « ci » qu'`init` traite
  désormais (intention à créer : apercu-ci-replace, sous docs/intentions/). Le commentaire de `packages/drwil/src/drift.ts` dit
  encore « the update branch keeps the old version ».
- **Prochaine étape** : lot 4 — d, commit du kit sans coupure ni contrôles du projet : test d'un contrôle projet
  `paths: ["**"]` différé sur un commit de kit et au pre-push d'une suite de commits de kit (D-e), joué dès qu'un
  fichier ou un commit hors kit s'y ajoute ; `.githooks/pre-push` transmet les commits poussés ; délai retiré, sortie
  montrée ; .githooks/run-checks-kit.mjs (neuf) ; contrat créé, `QUA-237` réécrit.

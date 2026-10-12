# Projet : le cœur en anglais (chantier A du livrable en anglais)

**Statut** : en cours (2026-10-12) — lots 1 à 3 faits, lot 4 à faire.
**Risque** : HIGH

<!-- scope
files:
  - packages/drwil/templates/*
  - packages/drwil/src/*.ts
  - packages/drwil/bin/drwil.js
  - packages/drwil/test/*.test.mjs
  - packages/drwil/test/fixtures/*
  - packages/drwil/README.md
  - packages/drwil/package.json
  - packages/drwil/CHANGELOG.md
  - .githooks/scope.mjs
  - .githooks/scope.test.mjs
  - .githooks/check-code-rules.mjs
  - .githooks/check-code-rules.test.mjs
  - .githooks/check-control-coverage.mjs
  - .githooks/check-control-coverage.test.mjs
  - .githooks/check-docs.mjs
  - .githooks/check-docs.test.mjs
  - .githooks/check-file-size.mjs
  - .githooks/check-file-size.test.mjs
  - .githooks/check-file-size.legacy.json
  - .githooks/commit-msg
  - .githooks/contracts.mjs
  - .githooks/contracts.test.mjs
  - .githooks/create-release.mjs
  - .githooks/create-release.test.mjs
  - .githooks/state-texts.mjs
  - .githooks/state.mjs
  - .githooks/state.test.mjs
  - .githooks/briefs.mjs
  - .githooks/glob.mjs
  - .githooks/glob.test.mjs
  - .githooks/engine.mjs
  - .githooks/engine.test.mjs
  - .githooks/scope-gate.mjs
  - .githooks/scope-gate.test.mjs
  - .githooks/pre-commit
  - .githooks/pre-push
  - .githooks/prepare-commit-msg
  - .githooks/risk.mjs
  - .githooks/risk.test.mjs
  - .githooks/run-checks.mjs
  - .githooks/run-checks.test.mjs
  - .githooks/dashboard.mjs
  - .githooks/dashboard.test.mjs
  - .claude/hooks/*
  - .claude/skills/*
  - .claude/settings.json
  - outils/verifier-miroirs.mjs
  - outils/verifier-miroirs.test.mjs
  - outils/miroirs.json
  - outils/installer-depot.mjs
  - outils/installer-depot.test.mjs
  - outils/tester-tarball.mjs
  - outils/tester-tarball.test.mjs
  - outils/consommation.mjs
  - outils/consommation.test.mjs
  - outils/verifier-tests-contrats.mjs
  - outils/verifier-tests-contrats.test.mjs
  - .github/workflows/ia-first.yml
  - .github/pull_request_template.md
  - .drwil/ia-first.json
  - .drwil/usage.jsonl
  - .gitignore
  - .gitleaks.toml
  - .env.example
  - package.json
  - AGENTS.md
  - INSTALL.md
  - README.md
  - docs/architecture.md
  - docs/ia-first.md
  - docs/contracts.md
  - docs/contracts-catalog.md
  - docs/audit-risques.md
  - docs/decouverte-valeur.md
  - docs/recipes/*
-->

## 1. Besoin

Deuxième des trois chantiers du livrable en anglais
(`docs/intentions/livrable-full-english.md`, ordre B, A, C ; B clos, journal
du 2026-10-12). Le gabarit est en anglais, mais tout ce que lisent les
hooks reste en français : activités (`CADRAGE`, `REALISATION`…), champs
de l'état (`attente_active`…), clés et valeurs de config (`barriere`,
`nouvellesExigences`, `chemins`, `recettes`, `bloquant`, `humain`), bloc
`<!-- cadrage`, trailer `Drwil-Attente`, noms des hooks (`etat`,
`perimetre`, `moteur`, `garde-fou-bash`…) et sous-commandes de `.githooks/state.mjs`.
Ce chantier les renomme selon le glossaire de l'intention, avec le code
commun livré, et migre les projets équipés en une fois par `init` /
`apply`.

## 2. Hors périmètre

- Messages et sous-commandes de la CLI, commande unique `init` / `apply`,
  retrait de `DRWIL-012`, nom du skill `/drwil-lancer` (chantier C).
- Contenu des fiches, intentions et journal de ce dépôt : restent en
  français ; seuls leurs blocs et chemins sont migrés.
- Libellés des tests propres au dépôt (`.githooks/*.test.mjs`, `outils/`) :
  restent en français ; seuls noms de fichiers et imports suivent.

## 3. Contraintes

- Migration sans alias (décision du 2026-10-12) : après A, les hooks ne
  lisent plus que les noms anglais ; un projet à l'ancien format est migré
  par `init` / `apply`, idempotent, avec simulation sans écriture.
- Un hook modifié à la main n'est jamais supprimé par la migration : il
  est signalé (mécanisme d'obsolescence du manifeste).
- Aucun contournement (QUA-019) pendant la bascule de ce dépôt : la
  barrière reconnaît un commit gouverné à `.githooks/scope-gate.mjs` dans
  son parent ; renommé, le commit de bascule n'est pas rejugé (mécanisme
  existant). Le `pre-commit` local de ce commit, qui lira le bloc de HEAD
  à l'ancien format, est à vérifier au début du lot 2 ; s'il bloque, en
  parler au demandeur avant toute solution.
- Fichiers livrés : on n'édite que le gabarit, puis
  `npm run installer-depot`.
- Changement cassant : version mineure (0.x) et note de version explicite.
- Couverture du paquet et des hooks : ne baisse pas.

## 4. Décisions

- **2026-10-11 / 2026-10-12** — Héritées de l'intention : français hors du
  livrable, glossaire, migration en une fois sans alias, B puis A puis C
  (demandeur).
- **2026-10-12 — Index : `pending.md`** (demandeur) : le nom livré par B
  reste ; le glossaire de l'intention est corrigé (il disait « backlog.md »).
- **2026-10-12 — Valeurs de config en anglais** (demandeur) : `bloquant` →
  `blocking`, `avertissement` → `warning`, `humain` → `human` ; migrées.
- **2026-10-12 — Code propre au dépôt** (demandeur) : tests et `outils/`
  ne suivent que les renommages de fichiers et d'imports ; la consigne
  « Code en français » de l'`AGENTS.md` du dépôt est corrigée (son code
  suit le livrable, décision du 2026-10-11).
- **2026-10-12 — Une seule PR, lot 3 compris** (demandeur) : le code
  commun se traduit dans A, qui renomme déjà les mêmes fichiers.
- **2026-10-12 — Bascule en deux commits** (demandeur) : la nouvelle
  barrière lit le bloc `scope` de la fiche dans HEAD ; un commit qui ne
  touche que la fiche ajoute d'abord ce bloc à côté de l'ancien, le commit
  de bascule retire l'ancien. Rien n'est désactivé (QUA-019, pas de
  contournement).
- **2026-10-12 — Valeurs visibles hors des hooks, gardées pour C**
  (demandeur) : statuts du moteur (`echec`, `non-execute`), identifiants de
  contrôles (`perimetre-attente`…) et sévérités (`bloquant`…) restent tels
  quels au lot 3, interface stable sans changement de comportement ; le
  chantier C les traite avec la sortie de la CLI.

## Contrats concernés

- **QUA-018** — Périmètre explicite : dépôt drwil vs livrable gabarit :
  renommer dans le gabarit, le dépôt suit par `installer-depot`.
- **QUA-011** — Doc jamais fausse : chaque nom renommé l'est partout dans
  le même commit.
- **QUA-004** — Seuil de couverture : ne baisse pas.
- **QUA-013** — Un contrôle non exécuté n'est jamais un succès : la
  migration ne fait taire aucun contrôle.
- **QUA-016** — Rappel de cadrage : le bloc renommé reste lu par le
  rappel et la barrière.
- **QUA-019** — Pas de contournement : bascule sans `--no-verify`.

## 5. Points à trancher

Aucun.

## 6. Increments

- **Lot 1 — Migration** [IA] : module de la CLI appelé par `init` /
  `apply` sur un projet à l'ancien format : état (activités, champs),
  config (clés, valeurs), blocs des fiches et intentions, section « Lots »
  → « Increments », champs de `.drwil/usage.jsonl` (`chantier`, `lot`,
  `modele`…), dossiers français (docs/projects/ → `docs/projects/`,
  en-attente.md → `docs/projects/pending.md`, contrats, catalogue, recettes) ; anciens
  hooks retirés par l'obsolescence. Critère de sortie : tests sur un
  projet type français à l'ancien format, migration idempotente,
  simulation sans écriture.
- **Lot 2 — Bascule atomique** [IA] : dans un commit, gabarit renommé
  (hooks, hooks Claude Code, modules, activités, état, config, bloc
  `scope`, trailer `Drwil-Brief`, sous-commandes `move` / `start` /
  `briefs` / `reminder`), références suivies (`.claude/settings.json`, CI,
  `package.json`, recettes, `AGENTS.md`), et ce dépôt migré par
  `npm run installer-depot`. Critère de sortie : `run-checks` vert,
  `drwil verify` PASS, tarball vert ; le projet type migré par `apply`
  passe ses contrôles.
- **Lot 3 — Code commun en anglais** [IA] : identifiants et commentaires
  des hooks, modules, CI, `gitignore`, `.gitleaks.toml`, `.env.example`
  du gabarit ; messages des hooks gardés en dictionnaire fr/en. Critère
  de sortie : aucun changement de comportement, tests inchangés et verts,
  plus de français hors dictionnaire de messages.
- **Lot 4 — Limites laissées par B** [IA] : contrôle des intentions qui
  accepte les intitulés dans les deux langues ; liste des anciens noms
  tolérés par `outils/verifier-miroirs.mjs` retirée ; préfixe de branche
  documenté `workstream/` ; note de version. Critère de sortie :
  `miroirs-gabarit` sans tolérance d'anciens noms, CI verte.

## 7. Migration (lots 1 et 2, 2026-10-12)

- **Table des noms** : `packages/drwil/src/migration-table.ts`, seule source
  des anciens noms et de leurs noms anglais. Au-delà du glossaire : champs
  `activite` → `activity` et `depuis` → `since` ; `horsPerimetre` →
  `outOfScope`, `risque.cheminsSensibles` → `risk.sensitivePaths`,
  `dirs.recettes` → `dirs.recipes` ; dans `.drwil/`, fichiers-installes.json
  → installed-files.json et rappel.json → reminder.json ; champs de
  consommation `duree_min` → `duration_min`.
- **Règles** (`packages/drwil/src/migration.ts`) : le contenu du projet
  (fiches, index, contrats) est déplacé, jamais supprimé ; une cible déjà
  modifiée n'est pas écrasée (conflit signalé). Un fichier de l'ancien
  gabarit français (recettes, skills, documents de départ, hooks) est
  supprimé s'il n'a pas changé depuis l'installation, gardé et signalé
  sinon. Références réécrites dans les fichiers texte (docs, réglages,
  `.gitignore`, scripts de la mécanique), jamais dans le code du projet ni
  dans un binaire. La mécanique inchangée (`.githooks/`, `.claude/hooks/`,
  `.claude/settings.json`) est retirée pour être réécrite à neuf par
  l'installation.
- **Branchée** (lot 2) : `init` et `apply` migrent d'abord ; `apply --dry-run`
  affiche la migration sans rien écrire ; `npm run installer-depot` migre ce
  dépôt avant de l'installer. Les hooks ne lisent plus que les noms anglais,
  y compris les dossiers (docs/projects/ n'est plus toléré).
- **Bascule de ce dépôt** (lot 2) : la migration a aussi réécrit les chemins
  cités par les fiches, intentions et journal ; ceux des tests du dépôt
  (`.githooks/*.test.mjs`, hors table) l'ont été à la main. Le module
  `tableau-de-bord` devient `dashboard` (sortie docs/dashboard.html), et
  `creer-une-release` devient `create-release`.

## 8. Reprise

- **Dernier état** (2026-10-12) : lots 1, 2 et 3 faits. Lot 3 : hooks,
  hooks Claude Code, modules optionnels, CI, `gitignore`, `.gitleaks.toml`,
  `.env.example` et réglages Claude en anglais ; messages en dictionnaire
  fr/en (textes français inchangés) ; la CLI garde son modèle français
  derrière un pont (`packages/drwil/src/verify.ts`). Gardés tels quels, car
  visibles hors des hooks : statuts du moteur, identifiants de contrôles,
  sévérités, options `--fiche` / `--demande`, mots tapés `LANCER` /
  `FUSION`, directive `contraste-fond:` du module front-quality.
- **Travail non commité** : aucun.
- **Prochaine étape** : [IA] lot 4, limites laissées par B (version
  mineure et note de version comprises).

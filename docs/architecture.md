# Architecture — drwil

État au 2026-10-16. Carte du dépôt : où vit quoi. Tenue à jour dans le même commit que le code qu'elle décrit, ce que vérifie le contrôle `architecture-map` (QUA-040) : chaque fichier de `packages/drwil/src/`, `.githooks/` et `outils/` (hors tests) y est cité. Elle renvoie aux documents qui détaillent, sans les recopier.

## Ce que fait drwil

drwil est un kit de **gouvernance pour le développement assisté par IA**. Pour un projet logiciel, il installe des consignes pour les agents (Claude Code, Codex, Cursor, Copilot, Gemini), des fiches de chantier, un registre de contrats et des contrôles rejoués au commit, au push et en CI ; `drwil verify` dit ensuite, preuves à l'appui, si le travail est vérifié. Chaque chantier laisse sa non-régression : ses critères d'acceptation deviennent des contrats du registre, rejoués ensuite partout. Pour qui : une équipe, ou une personne seule, qui fait travailler des agents et veut garder la décision et la preuve.

Ce dépôt a deux casquettes (QUA-018) : **drwil-le-livrable**, le paquet npm `packages/drwil` et son gabarit ; **drwil-le-dépôt**, ce projet, qui s'applique sa propre gouvernance.

## Stack

Node.js 22 et plus récent (`engines` du paquet ; CI sur Node 22 et 24), TypeScript pour la CLI, JavaScript sans dépendance (modules `.githooks/*.mjs`) pour les hooks. Une seule dépendance d'exécution : `commander`.

## Le livrable : `packages/drwil`

- **CLI** (`packages/drwil/bin/drwil.js`, code dans `packages/drwil/src/`) :
  - installation : `packages/drwil/src/index.ts` (`init`, git), `packages/drwil/src/install.ts` (ce qu'`init` décide, partagé avec son aperçu ; aucune couche inventée sans pile détectée), `packages/drwil/src/config.ts` (options et config du projet), `packages/drwil/src/render.ts` (rendu et écriture du gabarit), `packages/drwil/src/preview.ts` (aperçu d'`init --dry-run`), `packages/drwil/src/stack.ts` (détection de la pile) ;
  - un projet déjà là : `packages/drwil/src/essentials.ts` (ce que drwil exige dans les fichiers qu'`init` n'écrase pas), `packages/drwil/src/complete.ts` (l'y ajoute sans rien écraser : bloc délimité, entrées JSON et TOML fusionnées), `packages/drwil/src/manifest.ts` (fichiers installés, désinstallation), `packages/drwil/src/drift.ts` (résolution de dérive) ; `packages/drwil/src/migration.ts` et `packages/drwil/src/migration-table.ts` (migration des anciens noms français, table unique) ;
  - vérification : `packages/drwil/src/verify.ts` (juge les contrats), `packages/drwil/src/criteria.ts` (critères d'acceptation de la fiche active : preuve par contrat, Origine, effet sur le verdict), `packages/drwil/src/rules.ts` (bilan des règles métier), `packages/drwil/src/evidence.ts` (évidence d'un verify et caviardage des secrets), `packages/drwil/src/verdict.ts` (sortie humaine et format JSON, libellés des ID), `packages/drwil/src/agent.ts` (présentation pour un agent), `packages/drwil/src/attest.ts` (preuve humaine), `packages/drwil/src/doctor.ts` (`doctor` et `contracts`) ;
  - `packages/drwil/src/i18n.ts` choisit la langue des messages (celle du projet, l'anglais hors projet).
- **Gabarit** (`packages/drwil/templates/`) : un seul gabarit, en anglais, sous `common/` (`base/` : hooks, documents, recettes ; `tools/` : réglages, hooks et skills par outil IA ; `ci/` : CI GitHub ou GitLab ; `layers/` : consignes par couche ; `optional/` : modules optionnels). Les variables `{{…}}` sont rendues à l'installation.
- **Tests** : `packages/drwil/test/kit.test.mjs` installe le gabarit dans des projets temporaires et l'éprouve ; `packages/drwil/test/cycle.test.mjs` déroule des cycles complets (installer, vérifier, attester, clore) ; couverture suivie par QUA-004.

## Les contrôles : `.githooks/`

Copies, dans ce dépôt, des hooks livrés : installées depuis le gabarit par `npm run installer-depot` (`outils/installer-depot.mjs`), jamais éditées ici ; identiques, vérifié par le contrôle `miroirs-gabarit`. Les tests des hooks, eux, s'écrivent ici :

- `.githooks/engine.mjs` : moteur unique des contrôles, partagé par les hooks et `drwil verify` ; `.githooks/run-checks.mjs` l'exécute au commit (`pre-commit`), au push (`pre-push`) et en CI ; `.githooks/glob.mjs` interprète les chemins des contrôles, pour le report au commit comme pour la couverture CI.
- Contrôles du socle : `.githooks/check-docs.mjs` (doc et contrats cités), `.githooks/check-contract-tests.mjs` (tests cités par les contrats, QUA-029), `.githooks/check-architecture.mjs` (cette carte, QUA-040), `.githooks/scope-gate.mjs` (barrière de périmètre de la fiche active), `.githooks/check-control-coverage.mjs` (couverture CI de chaque contrôle).
- Gouvernance : `.githooks/state.mjs` (état, transitions, lancement et file de chantiers ; lit les fiches par `.githooks/briefs.mjs`, met en forme par `.githooks/state-texts.mjs`, ligne de commande dans `.githooks/state-cli.mjs`), `.githooks/scope.mjs` (bloc cadrage des fiches, copies déclarées), `.githooks/contracts.mjs` (lecture du registre), `.githooks/risk.mjs` (niveau de risque et oublis du cadrage), `.githooks/glossary.mjs` (libellés des identifiants, QUA-039).
- Points d'extension à adopter : `.githooks/check-file-size.mjs` (plafond de taille, QUA-001), `.githooks/check-code-rules.mjs` (règles d'hygiène du code, vide par défaut).
- Modules optionnels installés ici : `.githooks/dashboard.mjs` (tableau de bord HTML statique), `.githooks/create-release.mjs` (tag et note de release GitHub, sans publication npm).
- Tests des hooks : `.githooks/*.test.mjs`, propres au dépôt, couverture 100 % exigée (QUA-004).

## Propre au dépôt (jamais livré)

- `outils/` : `outils/installer-depot.mjs` (le dépôt s'installe depuis son gabarit avec la vraie CLI, sans toucher à `.drwil/` ni aux écarts déclarés), `outils/verifier-miroirs.mjs` et sa liste `outils/miroirs.json` (dépôt et gabarit identiques, écarts déclarés), `outils/verifier-tests-contrats.mjs` (lien tests ↔ contrats dans les deux sens, un contrôle par règle, QUA-033), `outils/tester-tarball.mjs` (la CLI installée depuis le tarball, comme un utilisateur), `outils/audit-dependances.mjs` (SEC-006), `outils/consommation.mjs` (tokens consommés par chantier, lus dans les journaux de session).
- Forge : `.github/workflows/ia-first.yml` (CI : contrôles, tests du paquet sur Linux, Windows et macOS), `.github/ruleset-master.json` et `.github/scripts/verifier-ruleset.mjs` (protection de `master`, vérifiée en CI), `.github/CODEOWNERS`.

## Gouvernance de ce dépôt

- Consignes des agents : `AGENTS.md` ; réglages et hooks de Claude Code : `.claude/settings.json`, `.claude/hooks/`, skills dans `.claude/skills/`.
- Invariants : `docs/contracts.md` ; catalogue : `docs/contracts-catalog.md` ; principes : `docs/ia-first.md`.
- Chantiers : index et ordre de réalisation `docs/projects/pending.md`, fiches dans `docs/projects/`, intentions dans `docs/intentions/`, chantiers clos dans `docs/projects/journal.md` ; recettes dans `docs/recipes/`.
- Configuration : `.drwil/ia-first.json` (contrôles déclarés, réglages) ; état local `.drwil/state.json` (si présent), jamais versionné ; preuves `.drwil/evidence/` (si présent), dont les attestations humaines versionnées.

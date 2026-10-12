# Architecture — drwil

État au 2026-10-11. Carte du dépôt : où vit quoi. À tenir à jour dans le même commit que le code qu'elle décrit. Elle renvoie aux documents qui détaillent, sans les recopier.

## Ce que fait drwil

drwil est un kit de **gouvernance pour le développement assisté par IA**. Pour un projet logiciel, il installe des consignes pour les agents (Claude Code, Codex, Cursor, Copilot, Gemini), des fiches de chantier, un registre de contrats et des contrôles rejoués au commit, au push et en CI ; `drwil verify` dit ensuite, preuves à l'appui, si le travail est vérifié. Pour qui : une équipe, ou une personne seule, qui fait travailler des agents et veut garder la décision et la preuve.

Ce dépôt a deux casquettes (QUA-018) : **drwil-le-livrable**, le paquet npm `packages/drwil` et son gabarit ; **drwil-le-dépôt**, ce projet, qui s'applique sa propre gouvernance.

## Stack

Node.js 22 et plus récent (`engines` du paquet ; CI sur Node 22 et 24), TypeScript pour la CLI, JavaScript sans dépendance (modules `.githooks/*.mjs`) pour les hooks. Une seule dépendance d'exécution : `commander`.

## Le livrable : `packages/drwil`

- **CLI** (`packages/drwil/bin/drwil.js`, code dans `packages/drwil/src/`) : `init` et `apply` installent le gabarit (`apply` n'écrase rien et prévisualise d'abord), `uninstall` et `resoudre-derive` le retirent ou résolvent une dérive ; `verify` juge les contrats (`packages/drwil/src/verify.ts`, verdict mis en forme par `packages/drwil/src/verdict.ts`, présentation pour un agent dans `packages/drwil/src/agent.ts`), `attest` enregistre une preuve humaine (`packages/drwil/src/attest.ts`), `doctor` et `contracts` diagnostiquent (`packages/drwil/src/doctor.ts`), `etat` lit et fait évoluer l'état de gouvernance. L'installation : `packages/drwil/src/index.ts` (`init`, `apply`, git), `packages/drwil/src/config.ts` (options et config du projet), `packages/drwil/src/rendu.ts` (rendu et écriture du gabarit), `packages/drwil/src/manifeste.ts` (fichiers installés, désinstallation), `packages/drwil/src/derive.ts` (résolution de dérive), `packages/drwil/src/apercu.ts` (aperçu d'`apply`) ; `packages/drwil/src/stack.ts` détecte la pile.
- **Gabarit** (`packages/drwil/templates/`) : `common/` (hooks, réglages et hooks de Claude Code, CI GitHub ou GitLab, modules optionnels) et une arborescence par langue, `fr/` et `en/` (documents, recettes, skills, consignes par couche). Les variables `{{…}}` sont rendues à l'installation.
- **Tests** : `packages/drwil/test/kit.test.mjs` installe le gabarit dans des projets temporaires et l'éprouve ; couverture suivie par QUA-004.

## Les contrôles : `.githooks/`

Copies, dans ce dépôt, des hooks livrés : installées depuis le gabarit par `npm run installer-depot` (`outils/installer-depot.mjs`), jamais éditées ici ; identiques, vérifié par le contrôle `miroirs-gabarit`. Les tests des hooks, eux, s'écrivent ici :

- `.githooks/engine.mjs` : moteur unique des contrôles, partagé par les hooks et `drwil verify` ; `.githooks/run-checks.mjs` l'exécute au commit (`pre-commit`), au push (`pre-push`) et en CI.
- Contrôles du socle : `.githooks/check-docs.mjs` (doc et contrats cités), `.githooks/scope-gate.mjs` (barrière de périmètre de la fiche active), `.githooks/check-control-coverage.mjs` (couverture CI de chaque contrôle).
- Gouvernance : `.githooks/state.mjs` (état, transitions, lancement ; lit les fiches par `.githooks/briefs.mjs`, met en forme par `.githooks/state-texts.mjs`), `.githooks/scope.mjs` (bloc cadrage des fiches), `.githooks/contracts.mjs` (lecture du registre), `.githooks/risk.mjs` (niveau de risque).
- Tests des hooks : `.githooks/*.test.mjs`, propres au dépôt, couverture 100 % exigée (QUA-004).

## Propre au dépôt (jamais livré)

- `outils/` : `outils/installer-depot.mjs` (le dépôt s'installe depuis son gabarit avec la vraie CLI, sans toucher à `.drwil/` ni aux écarts déclarés), `outils/verifier-miroirs.mjs` et sa liste `outils/miroirs.json` (dépôt et gabarit identiques, écarts déclarés), `outils/audit-dependances.mjs` (SEC-006).
- Forge : `.github/workflows/ia-first.yml` (CI : contrôles, tests du paquet sur Linux, Windows et macOS), `.github/ruleset-master.json` et `.github/scripts/verifier-ruleset.mjs` (protection de `master`, vérifiée en CI), `.github/CODEOWNERS`.

## Gouvernance de ce dépôt

- Consignes des agents : `AGENTS.md` ; réglages et hooks de Claude Code : `.claude/settings.json`, `.claude/hooks/`, skills dans `.claude/skills/`.
- Invariants : `docs/contracts.md` ; catalogue : `docs/contracts-catalog.md` ; principes : `docs/ia-first.md`.
- Chantiers : index et ordre de réalisation `docs/projects/pending.md`, fiches dans `docs/projects/`, intentions dans `docs/intentions/`, chantiers clos dans `docs/projects/journal.md` ; recettes dans `docs/recipes/`.
- Configuration : `.drwil/ia-first.json` (contrôles déclarés, réglages) ; état local `.drwil/state.json` (si présent), jamais versionné ; preuves `.drwil/evidence/` (si présent), dont les attestations humaines versionnées.

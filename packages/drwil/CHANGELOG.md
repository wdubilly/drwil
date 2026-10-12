# Changelog

## 0.4.0

**Breaking change: the governance core is now in English.** The hooks only
read the English names; a project equipped by an earlier version is
migrated once by `drwil init` or `drwil apply` (no aliases).

### Migration

- `drwil apply --dry-run` lists what the migration would do, writing
  nothing; `drwil init` and `drwil apply` run it first, then install.
- The migration is idempotent: on a migrated project it does nothing.
- Project content (briefs, index, contracts, journal) is moved, never
  deleted; a target that was already modified is not overwritten (reported
  as a conflict).
- An old kit file that was not modified since installation is removed and
  reinstalled under its English name; one that was modified by hand is
  kept and reported, to be taken over by hand.
- References are rewritten in text files (docs, settings, `.gitignore`,
  hook scripts), never in the project's code.

### Renamed

| Before | After |
|---|---|
| `docs/projets/`, `en-attente.md` | `docs/projects/`, `pending.md` |
| `docs/contrats.md`, `docs/catalogue-contrats.md` | `docs/contracts.md`, `docs/contracts-catalog.md` |
| `docs/recettes/` | `docs/recipes/` |
| Activities `CADRAGE`, `ATTENTE`, `DEMANDE`, `REALISATION`, `PREUVES`, `CLOTURE` | `SCOPING`, `EXPECTATION`, `REQUEST`, `BUILD`, `EVIDENCE`, `CLOSING` (`VERIFY` unchanged) |
| State fields `activite`, `attente_active`, `demande_active`, `fusion_autorisee`, `depuis` | `activity`, `active_brief`, `active_request`, `auto_merge`, `since` |
| Settings `barriere`, `cadrage`, `nouvellesExigences`, `horsPerimetre`, `risque.cheminsSensibles`, `checks[].chemins`, `dirs.recettes` | `scopeGate`, `scopeReminder`, `newRequirements`, `outOfScope`, `risk.sensitivePaths`, `checks[].paths`, `dirs.recipes` |
| Setting values `bloquant`, `avertissement`, `humain` | `blocking`, `warning`, `human` |
| Brief block `<!-- cadrage` / `fichiers:` | `<!-- scope` / `files:` |
| Commit trailer `Drwil-Attente` | `Drwil-Brief` |
| Hooks `etat`, `perimetre`, `cadrage`, `fiches`, `contrats`, `moteur`, `risque` | `state`, `scope-gate`, `scope`, `briefs`, `contracts`, `engine`, `risk` |
| Claude Code hooks `garde-fou-bash`, `rappel-cadrage`, `saisie-drwil` | `bash-guard`, `scope-reminder`, `prompt-hook` |
| Optional modules `tableau-de-bord`, `creer-une-release` | `dashboard` (output `docs/dashboard.html`), `create-release` |
| `node .githooks/state.mjs` subcommands `passer`, `lancer`, `fiches`, `rappel` | `move`, `start`, `briefs`, `reminder` |
| `.drwil/fichiers-installes.json`, `.drwil/rappel.json` | `.drwil/installed-files.json`, `.drwil/reminder.json` |
| `.drwil/usage.jsonl` fields `chantier`, `lot`, `modele`, `duree_min` | `workstream`, `increment`, `model`, `duration_min` |
| Branch prefix `chantier/` (convention) | `workstream/`; `init` creates `workstream/kit-installation` |
| CI alert job `alerter-si-ci-cassee` | `alert-if-ci-broken` |

The code shipped with the kit (hooks, modules, CI, configuration) is in
English; messages stay in the project's language (French or English).
Intent sections are accepted in either language.

### Unchanged for now

Values visible outside the hooks keep their names until the CLI is
translated: check identifiers cited by contract registries
(`perimetre-attente`…), engine statuses in `drwil verify` evidence
(`echec`, `non-execute`…), contract severities (`bloquant`…), the CLI
commands and messages (`drwil etat`…), the `--fiche` / `--demande`
options, the typed confirmations `LANCER` / `FUSION`, the `/drwil-lancer`
skill and the `contraste-fond:` directive of the front-quality module.

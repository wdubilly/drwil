# Projet : `init` sur un projet existant, ne rien laisser de côté en silence

**Statut** : cadré le 2026-10-13 — points à trancher avant le lot 1.
**Risque** : HIGH

(HIGH : le chantier change ce que `init` écrit dans les fichiers d'un projet
client — `.gitignore`, `.claude/settings.json`, configuration git — et la
façon dont la CI est choisie.)

<!-- scope
files:
  - packages/drwil/src/install.ts
  - packages/drwil/src/render.ts
  - packages/drwil/src/index.ts
  - packages/drwil/src/preview.ts
  - packages/drwil/src/doctor.ts
  - packages/drwil/src/config.ts
  - packages/drwil/src/stack.ts
  - packages/drwil/test/kit.test.mjs
  - packages/drwil/README.md
  - packages/drwil/CHANGELOG.md
  - README.md
-->

## 1. Besoin

Constaté le 2026-10-13 en préparant l'installation de drwil sur un projet
existant (une application React avec un .gitlab-ci.yml, un `.gitignore`
et un `README.md` déjà présents) : `init` n'écrit un fichier déjà présent
que s'il est sous `.githooks/` et inchangé depuis l'installation
(`KIT_MECHANICS`, `packages/drwil/src/install.ts`). Tout le reste est
« laissé tel quel », et l'aperçu (`--dry-run`) le dit en une ligne
(« differs from the kit's template ») sans dire **ce qui manque et ce que
ça casse**. Or plusieurs de ces fichiers portent des lignes dont drwil a
besoin pour fonctionner.

Le tour des fichiers du gabarit qu'un projet existant peut déjà avoir, et
de la conséquence quand `init` les garde sans rien y ajouter :

| Fichier déjà présent | Ce qui manque alors | Conséquence | Signalé aujourd'hui ? |
|---|---|---|---|
| `.gitignore` | .drwil/state.json, .drwil/reminder.json, `.drwil/evidence/*` (sauf `attestations/`), .claude/settings.local.json, `.env` | l'état de gouvernance local et les preuves se retrouvent commités ; un `.env` reste versionnable | non (« differs ») |
| `AGENTS.md` | toutes les consignes drwil (état de gouvernance d'abord, contrats, commandes) | les agents ignorent la gouvernance ; `doctor` ne vérifie que la présence du fichier | non |
| `CLAUDE.md`, `GEMINI.md` (à la racine et par couche) | la ligne `@AGENTS.md` | l'outil ne lit jamais `AGENTS.md` | non |
| .github/copilot-instructions.md, .cursor/rules/ia-first.mdc | le renvoi vers `AGENTS.md` et les règles du kit | Copilot et Cursor sans consignes drwil | non |
| `.claude/settings.json` | les hooks (`SessionStart` et `UserPromptSubmit` sur `.githooks/state.mjs`, `bash-guard`, `scope-reminder`, `prompt-hook`) et les `deny` (`--no-verify`, écriture de l'état local…) | ni rappel d'état, ni garde-fou Bash, ni rappel de cadrage, ni sondage `/drwil-start` côté Claude Code | non |
| CI déjà présente (.gitlab-ci.yml, .github/workflows/…) | le job `checks` (`node .githooks/run-checks.mjs`) | contrôles jamais lancés en CI | oui, par `check-control-coverage` **si** `ci` est déclaré ; mais `ci` vaut `none` par défaut même quand un .gitlab-ci.yml existe : QUA-013 (contrôle non exécuté n'est pas passé) part alors en `ERROR` « no CI configured » sans indiquer la CI trouvée |
| `core.hooksPath` déjà réglé (husky, lefthook…) | — | `init` le remplace par `.githooks` sans prévenir : les hooks du projet cessent de tourner (v1:INI-010, configuration existante détectée avant d'installer les hooks) | non |
| `.gitleaks.toml` | la liste blanche de le manifeste .drwil/installed-files.json | faux positifs de SEC-007 (pas de secret dans le dépôt) sur les empreintes sha256 du manifeste | non |
| `docs/contracts.md`, `docs/projects/pending.md` | le format attendu par `verify` et `check-docs` | relevé par les contrôles (déjà couvert) | oui |
| `README.md`, `docs/architecture.md`, `docs/*.md`, `.env.example` | rien d'indispensable | aucune : contenu propre au projet | sans objet |

Lié à la mise à jour : `.claude/hooks/*.mjs` et `.claude/settings.json`
sont des mécaniques du kit pour la migration (`MECHANICS`,
`packages/drwil/src/migration-table.ts`) mais pas pour `init`
(`KIT_MECHANICS = ".githooks/"`) : un projet déjà équipé ne reçoit jamais
la nouvelle version de ces hooks Claude, même inchangés depuis
l'installation.

## 2. Hors périmètre

- Réécrire le contenu propre au projet (README, docs, contrats existants).
- Fusionner automatiquement deux `AGENTS.md` en prose.
- Le format du catalogue de contrats (fiches du catalogue, vague 5).

## 3. Contraintes

- v1:INI-001 (pas d'écrasement silencieux) et v1:INI-005 (modifications du
  client préservées par défaut) restent vrais : on **ajoute** ce qui manque
  ou on **signale avec la correction prête à coller**, on ne remplace pas.
- v1:INI-002 et v1:INI-003 (idempotence) : un second `init` n'ajoute rien de
  plus.
- v1:INI-007 (prévisualisation) : l'aperçu `--dry-run` montre exactement
  les ajouts, issus du même parcours que l'installation réelle.
- Mémoire « livrable léger » : ne ralentir ni casser l'utilisateur.

## 4. Décisions

- 2026-10-13 (demandeur) : priorité `[P0]`, en tête de l'ordre de
  réalisation, à lancer dès que possible ; une release est publiée dès la
  clôture du chantier (`docs/recipes/create-a-release.md`).

## 5. Points à trancher

- [décision] Fichiers à lignes (`.gitignore`, `CLAUDE.md`, `GEMINI.md`) :
  `init` **ajoute** les lignes manquantes dans un bloc délimité (« # drwil »)
  — proposition — ou se contente de les signaler ?
- [décision] Fichiers structurés (`.claude/settings.json`,
  `.gitleaks.toml`) : fusion des hooks et permissions drwil dans le JSON
  existant — proposition, sans toucher aux clés du projet — ou signalement
  avec le bloc à coller ?
- [décision] Fichiers en prose (`AGENTS.md`, copilot-instructions.md,
  règle Cursor) : écrire les consignes drwil dans un fichier à part que le
  fichier du projet importe (une ligne ajoutée), ou signaler seulement et
  laisser `/drwil-adopt` faire la fusion ?
- [décision] CI : `init` détecte une CI existante (.gitlab-ci.yml,
  `.github/workflows/`) et règle `ci` en conséquence — proposition — puis
  signale le job `checks` manquant avec le bloc à coller ?
- [décision] `core.hooksPath` déjà réglé : refuser de le remplacer et
  expliquer, ou le remplacer en le disant clairement ?
- [décision] `.claude/hooks/` et `.claude/settings.json` deviennent-ils des
  mécaniques rafraîchies par `init` comme `.githooks/` (alignement sur
  `MECHANICS` de la migration) ?
- [décision] `doctor` vérifie-t-il le contenu indispensable (lignes
  `.gitignore`, `@AGENTS.md`, hooks Claude, job CI) et pas seulement la
  présence des fichiers ?

## 6. Increments

(à découper une fois les points tranchés ; pressenti :)

- **Lot 1 — dire ce qui manque** [IA] : `init`, `--dry-run` et `doctor`
  listent, pour chaque fichier gardé, les éléments indispensables absents et
  le bloc à coller ; CI existante détectée. Critère de sortie : tests de
  `packages/drwil/test/kit.test.mjs` sur un projet factice avec `.gitignore`, `CLAUDE.md`,
  `.claude/settings.json`, .gitlab-ci.yml et `core.hooksPath` préexistants.
  Documentation dans le même lot (QUA-011, doc jamais fausse) : `README.md`
  (section d'installation, « Good to know ») et `packages/drwil/README.md`
  (README publié, l'explication de `init` sur un projet existant)
  disent ce qui est gardé, ce qui est ajouté ou signalé, et le bloc à
  coller ; `packages/drwil/CHANGELOG.md`.
- **Lot 2 — ajouter sans écraser** [IA] : ajouts délimités et idempotents
  selon les décisions. Critère de sortie : deux `init` successifs donnent un
  diff vide ; `uninstall` retire les blocs ajoutés.
- **Lot 3 — release** [humain] : tag et note de version une fois le
  chantier clos (`docs/recipes/create-a-release.md`). Critère de sortie :
  release publiée, archive `drwil-*.tgz` jointe.

## 7. Reprise

- **Dernier état** (2026-10-13) : inventaire fait (section 1), rien de codé.
- **Travail non commité** : cette fiche et sa ligne d'index.
- **Prochaine étape** : [décision] trancher la section 5.

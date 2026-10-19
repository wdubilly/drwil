# Intention : chaque agent de code tenu par la même gouvernance

**Statut** : proposée et cadrée le 2026-10-18 par le demandeur (version
« compatibilité », 0.6.7, après la stabilisation 0.6.6) ; découpée en un socle et une fiche par
outil.

## Besoin

drwil se veut agnostique de l'agent, mais seul Claude Code est réellement
tenu : avec les autres outils, la gouvernance repose sur des consignes que
l'agent peut ignorer. Constaté par le demandeur le 2026-10-18 : sous
Copilot CLI, en SCOPING, une intention exprimée a suffi pour que l'agent
se mette à coder.

## Existant (essais réels du 2026-10-18, banc temporaire installé par `init`)

- **Copilot CLI 1.0.98** :
  - il lit les skills de `.claude/skills/`, mais refuse `start-a-workstream` : l'en-tête YAML est invalide en mode strict (`chosen:` dans une description sans guillemets) ;
  - en session interactive (journaux du 2026-10-15 sur ce dépôt), il charge `.claude/settings.json` comme « repo settings », mais chaque hook dépasse son délai de 30 s et Copilot laisse alors passer l'outil (« allowing the tool call to proceed ») ;
  - en mode non interactif (`-p`), aucun hook n'est lancé, pas même une sonde déposée dans le dossier de hooks natif de Copilot (.github/hooks) ;
  - outil d'écriture : `create` ; fichier écrit en SCOPING sans refus.
- **Gemini CLI 0.61.0** :
  - `gemini hooks migrate --from-claude` traduit nos hooks (`BeforeTool` sur `replace|write_file`, `BeforeAgent`, `SessionStart`), mais garde `${CLAUDE_PROJECT_DIR}` et `AskUserQuestion` ;
  - même ainsi, aucun hook n'est lancé (sonde muette) ; `gemini skills list` ne trouve aucun skill ;
  - outil d'écriture : `write_file` ; fichier écrit en SCOPING sans refus.
- **Codex** : non installé sur le poste ; seul `AGENTS.md`, lu nativement.
- **Cursor** : seules les consignes `packages/drwil/templates/common/tools/cursor/.cursor/rules/ia-first.mdc` sont livrées.
- Dans tous les essais, l'agent avait lu « ne modifier aucun fichier de code » (sortie de `.githooks/state.mjs`) et a écrit quand même, parce qu'on le lui demandait : une consigne ne suffit pas.
- Le dernier filet tient pour tous : la barrière Git refuse au commit un fichier de code hors BUILD.

## Découpage décidé (2026-10-18)

Un socle commun, puis une fiche par outil, chacune portant les quatre
points au niveau de Claude Code (consignes, rappel d'état, blocage avant
écriture, lancement et file), ou déclarant honnêtement « consignes et
barrière Git seulement » là où l'outil ne le permet pas. Preuve : un banc
local scripté qui lance chaque CLI en mode non interactif dans un projet
temporaire ; hors CI (comptes requis), son résultat est attesté par
l'humain.

- `docs/projects/compat-socle.md`
- `docs/projects/compat-copilot.md`
- `docs/projects/compat-gemini.md`
- `docs/projects/compat-codex.md`
- `docs/projects/compat-cursor.md`

## Questions à trancher

- Aucune ouverte : découpage, outils couverts et mode de preuve tranchés
  par le demandeur le 2026-10-18 ; les questions propres à chaque outil
  vivent dans sa fiche (lot 1 de sonde).

## Ordre proposé

1. Le socle (banc, règle commune, en-têtes YAML stricts, matrice).
2. Copilot CLI, puis Gemini CLI : installés et testables.
3. Codex, une fois installé ; Cursor, par essai manuel.

## Liens

- `docs/intentions/file-pour-copilot.md` (une file de chantiers pour Copilot CLI)
- `docs/intentions/file-sous-agents-autres-outils.md` (une file menée par sous-agents avec les autres outils)
- Rattachées à la 0.6.7 le 2026-10-19 (demandeur), décisions encore
  ouvertes : `docs/intentions/file-pour-copilot.md` (une file pour Copilot
  CLI), `docs/intentions/glossaire-autres-agents.md` (le glossaire chez les
  autres agents), `docs/intentions/consommation-autres-outils.md` (la
  consommation des autres outils).
- L'ex-intention « `${CLAUDE_PROJECT_DIR}` sous Copilot » est fondue dans
  le lot 1 de `docs/projects/compat-copilot.md` (journal du 2026-10-19).

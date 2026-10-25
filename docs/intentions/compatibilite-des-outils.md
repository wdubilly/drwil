# Intention : chaque agent de code tenu par la même gouvernance

**Statut** : proposée et cadrée le 2026-10-18 par le demandeur (version

**Revu le 2026-10-25** : cinq intentions de suite (autres outils au niveau de Claude Code) regroupées ici lors du ménage ; la file pour Copilot CLI, livrée, est retirée.
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

- le socle (fait, journal du 2026-10-19)
- Copilot CLI (fait, journal du 2026-10-19)
- Gemini CLI (fait, journal du 2026-10-19)
- Codex : `docs/intentions/compat-codex.md` (intention, pas encore une fiche)
- Cursor : `docs/intentions/compat-cursor.md` (intention, pas encore une fiche)

## Questions à trancher

- Découpage, outils couverts et mode de preuve tranchés par le demandeur
  le 2026-10-18 ; les questions propres à Codex et Cursor vivent dans leur
  intention. Celles des suites regroupées le 2026-10-25 sont dans la
  section « Suites regroupées » ci-dessous.

## Ordre proposé

1. Le socle (banc, règle commune, en-têtes YAML stricts, matrice).
2. Copilot CLI, puis Gemini CLI : installés et testables.
3. Codex, une fois installé ; Cursor, par essai manuel.

## Liens

- L'ex-intention « `${CLAUDE_PROJECT_DIR}` sous Copilot » est fondue dans
  le chantier Copilot CLI tenu (journal du 2026-10-19).
- La file pour Copilot CLI est livrée par la 0.6.8 (journal du 2026-10-20).

## Suites regroupées (ménage du 2026-10-25)

Chaque partie reprend une ancienne intention, avec son statut, son besoin, son existant (à sa date, non revérifié) et ses questions.

### une file menée par sous-agents avec les autres agents (ex-« file-sous-agents-autres-outils »)

Statut d'origine : proposée le 2026-10-18 — limite du chantier « une file de chantiers menée par sous-agents » (journal du 2026-10-18, 0.6.4) ; décision du 2026-10-17 : Claude Code d'abord, les autres vérifiés un par un.

Avec Copilot CLI, Codex, Cursor ou Gemini, une file de chantiers reste
menée dans une seule session : le contexte relu grossit à chaque chantier,
comme avec Claude Code avant la 0.6.4.

**Existant** :

**Existant (vérifié le 2026-10-18)** :

- Le rappel d'état et la skill de lancement disent « autre outil : tout
  dans la même session » ; seul Claude Code reçoit la consigne des
  sous-agents.
- Copilot CLI lance la skill de lancement (`ask_user`) ; ses sous-agents,
  leurs hooks et leur accès à l'état ne sont pas vérifiés. Codex, Cursor
  et Gemini : non vérifiés.

**Questions** :

- [décision] Quels agents ont des sous-agents qui travaillent dans le
  dossier du dépôt, voient l'état (`.drwil/state.json`, si présent) et
  passent les hooks ? Les vérifier un par un, Copilot CLI d'abord ?
- [décision] Sans sous-agent, proposer à l'humain une nouvelle
  conversation entre deux chantiers (un geste), ou garder la session
  unique ?

### le glossaire des identifiants injecté aussi chez les autres agents (ex-« glossaire-autres-agents »)

Statut d'origine : proposée le 2026-10-16 — limite du chantier « Un identifiant cité à l'humain vient avec ce qu'il désigne » (journal du 2026-10-16).

Le glossaire des identifiants (QUA-039) a trois couches : à la source
(sorties de drwil), une commande pour tout agent, et une injection
automatique là où l'agent a des hooks. Seul Claude Code a aujourd'hui ce
hook (`.claude/hooks/id-glossary.mjs`) ; drwil se veut agnostique de
l'agent, et d'autres outils ont ajouté des hooks.

**Existant** :

**Existant (vérifié le 2026-10-16)** :

- `.githooks/glossary.mjs` est la seule source ; le hook Claude Code ne
  fait que l'appeler et mettre en forme : un adaptateur par outil suffirait.
- Le gabarit ne livre aux autres outils que des fichiers d'instructions
  (`packages/drwil/templates/common/tools/copilot/.github/copilot-instructions.md`,
  `packages/drwil/templates/common/tools/cursor/.cursor/rules/ia-first.mdc`), qui
  donnent la règle et la commande.

**Questions** :

- [décision] Quels outils d'abord (Cursor, Copilot CLI, Gemini CLI,
  Codex), après vérification de leur format de hook ?
- [décision] Un adaptateur par outil livré dans le gabarit, ou seulement
  pour les outils choisis à `init` (`--tools`) ?

### forcer la lecture ciblée avec Gemini CLI, Copilot CLI, Codex et Cursor (ex-« lecture-ciblee-forcee-autres-outils »)

Statut d'origine : proposée le 2026-10-24 — limite du chantier « réduire le contexte relu par chantier » (décision du demandeur : une seule intention pour les quatre outils).

Avec Claude Code, la lecture entière de `docs/contracts.md` et de
`docs/projects/journal.md` est refusée avant qu'elle ait lieu (QUA-132 : hook
read-guard sur l'outil Read et `.claude/hooks/bash-guard.mjs`). Gemini CLI,
Copilot CLI, Codex et Cursor n'ont que la consigne écrite d'`AGENTS.md`.

**Existant** :

**Existant (relevé le 2026-10-24)** :

- Gemini CLI et Copilot CLI ont des hooks avant outil (déjà utilisés par
  drwil pour l'état de gouvernance) ; Codex et Cursor : à examiner
  (`docs/intentions/compat-codex.md`, `docs/intentions/compat-cursor.md`).
- Aucune promesse au-delà de la consigne écrite tant que le banc ne l'a pas
  prouvée (QUA-060, un outil n'est tenu que prouvé par le banc).

**Questions** :

- Pour chaque outil : quel point d'accroche (hook avant lecture, garde
  shell), et la preuve par le banc ?
- Ordre : d'abord les outils déjà tenus (Gemini, Copilot), puis Codex et
  Cursor une fois leur compatibilité décidée ?

### les commandes `/drwil-*` et le sondage de lancement sous Gemini CLI (ex-« skills-et-sondage-sous-gemini »)

Statut d'origine : proposée le 2026-10-19 — limite du chantier « Compatibilité des agents, Gemini CLI tenu » (journal du 2026-10-19).

Gemini CLI ne lit pas `.claude/skills/` : ses skills se trouvent sous
`.gemini/skills/` ou `.agents/skills/`, et il a un outil `ask_user` dont le
format diffère de celui de Claude Code et de Copilot. Sous Gemini, un chantier
se lance donc par `node .githooks/state.mjs start` dans un terminal (dit dans la
matrice de `docs/ia-first.md`).

**Existant** :

**Existant (vérifié le 2026-10-19)** :

- Gemini CLI 0.61.0 : hooks `BeforeTool`/`AfterTool` actifs sur `ask_user`
  possibles ; skills sous `.agents/skills/` ; aucune de ces deux voies n'est livrée.

**Questions** :

- [décision] Livrer les skills sous `.agents/skills/` (copie du même contenu,
  une source) et un sondage `ask_user` lu par `.claude/hooks/prompt-hook.mjs` ?

### un passage complet du banc stable sous Gemini CLI (ex-« banc-gemini-quota »)

Statut d'origine : proposée le 2026-10-19 — limite du chantier « Compatibilité des agents, Gemini CLI tenu » (journal du 2026-10-19).

Le quota gratuit du modèle par défaut de Gemini CLI (20 requêtes par jour)
s'épuise vite (429) et le modèle essayé en repli répond parfois 503 : des
passages du banc échouent sans rien prouver (`codeAgent` non nul, hooks
partiels). Les trois preuves (hooks lancés, écriture refusée, rappel reçu) ont
été obtenues en essais séparés, pas en un seul passage « conforme ».

**Existant** :

**Existant (vérifié le 2026-10-19)** :

- Banc sur `gemini-3-flash-preview` (variable `GEMINI_MODEL`) : trois passages,
  trois résultats différents (rappel seul ; refus sans rappel ; hooks d'état seuls).

**Questions** :

- [décision] Faire relancer le banc par le banc lui-même tant que l'agent
  sort en erreur de quota, ou attester sur un compte payant ?

# DrWil - Kit IA-First pour agents IA

## Résumé exécutif

**DrWil** est un kit de scaffolding ("kit-ia-first") qui permet de démarrer n'importe quel projet avec une **gouvernance IA-first** prête à l'emploi. Il extrait un pattern éprouvé de discipline agentique outillée sous forme générique, configurable et réutilisable avec Claude Code, Codex, Gemini, Cursor, OpenCode, etc.

L'objectif : transformer "faire travailler un agent IA" en "faire travailler des agents IA de manière prévisible, traçable et sécurisée" grâce à des garde-fous **dans le dépôt** (hooks Git + règles écrites + contrôles outillés).

## 1. Problématique

Quand on laisse un agent IA travailler sur un projet :

- **Manque de discipline** : hors-périmètre, changements non justifiés, "corrigé" sans preuve
- **Perte de contexte entre sessions** : l'agent oublie les contraintes, les contrats, l'état des chantiers
- **Non-reproductibilité** : règles orales/implicites, pas vérifiées par machine
- **Risque sur données/secrets** : tentatives d'exposer `.env`, clés SSH
- **Passation difficile** : impossible de reprendre un chantier "à froid" sans l'historique de conversation
- **Contrôles inexistants** : rien n'empêche un commit même si des règles sont violées

Un tel cadre permet de résoudre ces problèmes avec une approche **IA-first outillée** : `AGENTS.md` (point d'entrée unique), `docs/contrats.md` (invariants), `.githooks/` (vérifications automatiques), fiches chantiers (passation à froid). **DrWil rend ce pattern générique et clonable.**

## 2. Solution

DrWil fournit `@drwil/kit-ia-first` : un **scaffolder CLI** qui génère dans un projet vierge (ou existant) une architecture "IA-first" complète.

### 2.1 Principe fondamental

**L'enforcement est dans Git, pas dans l'outil IA.**

Contrairement à un plugin spécifique à un harness (Claude Code uniquement), les `.githooks/` s'exécutent pour **quiconque commite** : humain, Claude Code, Codex, Gemini CLI, OpenCode... Un vrai hook Git est indépendant de l'assistant utilisé.

### 2.2 Ce que DrWil génère

À l'initiation d'un projet :

```
projet/
├── AGENTS.md              # Point d'entrée unique (lu par tous les assistants)
├── CLAUDE.md / GEMINI.md  # Import de AGENTS.md (selon --tools)
├── .claude/ .cursor/ .github/copilot-instructions.md  # Renvois vers AGENTS.md (selon --tools)
├── .drwil/ia-first.json   # Configuration (couches, langue, outils, CI, stack, contrôles du projet)
├── .githooks/             # Contrôles Git, en Node (Linux, macOS, Windows)
│   ├── pre-commit         # Lance run-checks.mjs à chaque commit
│   ├── run-checks.mjs     # Point d'entrée des vérifs (commit et CI)
│   └── check-docs.mjs     # Chemins et contrats cités dans la doc
├── .github/workflows/ia-first.yml ou .gitlab-ci.yml  # Selon --ci
├── docs/
│   ├── ia-first.md        # Philosophie IA-first
│   ├── contrats.md        # Registre unique des invariants
│   ├── architecture.md
│   ├── projets/           # Chantiers (reprise à froid)
│   ├── intentions/        # Cadrage avant implémentation
│   └── recettes/          # Recettes réutilisables
├── backend/AGENTS.md      # Contexte par couche (si configuré)
└── frontend/AGENTS.md     # Contexte par couche (si configuré)
```

## 3. Fonctionnalités clés

### 3.1 Point d'entrée unique & contexte progressif

- `AGENTS.md` = source de vérité pour **tous** les agents IA
- **Contexte budgété** : lire uniquement ce qui est nécessaire (couche + recette + contrats concernés)
- Fonctionne avec n'importe quel outil IA sans configuration spécifique

### 3.2 Contrats comme invariants outillés

- `docs/contrats.md` = **registre unique** (pas de duplication)
- IDs typés (`SEC-xxx`, `QUA-xxx`, configurables)
- Règle + Périmètre + Source de vérité + Preuve + Raison
- Principe : "Un contrat qui compte est vérifié par une machine"

### 3.3 Garde-fous dans Git

- **Preuve avant annonce** : avant "corrigé/passe/terminé", relancer le contrôle concerné et lire sa sortie
- **Cause avant correctif** : reproduire puis établir la cause racine
- **Statut daté** dans chaque fiche chantier (reprise à froid garantie)
- **Marqueurs** `[IA] / [humain] / [décision]` sur chantiers ouverts
- **Section "Reprise"** obligatoire pour passation

### 3.4 Configurable & Générique

| Option | Valeur défaut | Description |
|---|---|---|
| `--name` | nom du dossier | Nom du projet |
| `--layers` | `init` : `backend,frontend` ; `apply` : sous-dossiers où une stack est détectée | Couches du projet (api,web,packages/core...) ; une couche sans modèle dédié reçoit une fiche `AGENTS.md` générique |
| `--description` | — | Ce que fait l'application ; remplit `AGENTS.md` et `docs/architecture.md` |
| `--tools` | `claude,codex,cursor,gemini,copilot` | Outils IA à brancher sur `AGENTS.md` (Codex le lit nativement) |
| `--ci` | `none` | `github` ou `gitlab` : génère le fichier de CI qui lance les mêmes contrôles |
| `--no-git` | — | Ne pas lancer `git init` ni activer les hooks (`core.hooksPath`) |
| `--contract-prefixes` | `SEC,QUA` | Préfixes des contrats |
| `--lang` | `fr` | Langue des modèles, des noms de fichiers de doc et des messages des contrôles (`fr` ou `en`) |
| `--mode` | `full` | `minimal` (léger) ou `full` (complet, outillé) |

Configuration sauvegardée dans `.drwil/ia-first.json` → contrôles **config-driven**. Seul prérequis : Node.js (déjà requis par l'installateur) ; ni bash ni Python.

Par défaut, `init` initialise le dépôt git s'il n'existe pas et active les hooks : le `pre-commit` lance `.githooks/run-checks.mjs`, qui échoue si un contrôle échoue et liste ceux qui n'ont pas tourné (QUA-013). `apply` n'écrase aucun fichier, écrit la configuration si elle manque et active les hooks seulement si le dépôt git existe déjà.

**Stack** : le kit ne l'impose pas. Il la détecte d'après les fichiers de projet (`package.json`, `pyproject.toml`, `pom.xml`, `go.mod`…) et l'inscrit dans `docs/architecture.md` comme « à confirmer » ; sinon elle est « non décidée » et `AGENTS.md` demande à l'IA de la faire valider par l'utilisateur avant tout code. Les commandes de lint et de test de la stack se déclarent ensuite dans `.drwil/ia-first.json` (clé `checks`, conservée lors d'une réinstallation) et tournent au commit et en CI.

## 4. Modes d'utilisation

### CLI

```bash
# Initialiser un projet vierge (mode full par défaut)
npx @drwil/kit-ia-first init --name "MonProjet" --layers backend,frontend --description "Suivi des demandes clients"

# Initialiser avec configuration personnalisée
npx @drwil/kit-ia-first init --name "ApiService" --layers api --contract-prefixes RULE,CHK --lang en

# Appliquer à un projet existant (n'écrase pas les fichiers existants)
npx @drwil/kit-ia-first apply --mode full

# Mode minimal (prototypage rapide)
npx @drwil/kit-ia-first init --mode minimal
```

### Dans le monorepo drwil

Le projet `drwil` lui-même applique ce kit (`layers: core,adapters,plugin-opencode,mcp-server,kit-ia-first`) démontrant l'auto-consommation.

## 5. Avantages concurrentiels

| Avantage | Détail |
|---|---|
| **Agnostique IA** | Fonctionne avec Claude Code, Codex, Gemini, Cursor, OpenCode, Cline... |
| **Indépendant du harness** | L'enforcement Git s'applique même hors de l'outil IA |
| **Générique** | Adaptable à tout type de projet (monorepo, API, frontend, CLI) |
| **Config-driven** | Contrôles Node lisent `.drwil/ia-first.json` → pas de hardcoding |
| **Portable** | Node seul : Linux, macOS, Windows ; modèles fr/en ; CI GitHub ou GitLab |
| **Progressif** | Mode minimal/full + `apply` sur projet existant |
| **Reprise à froid** | Fiches chantiers datées + section Reprise → zéro dépendance à l'historique conversationnel |
| **Traçable** | Preuve avant annonce, cause avant correctif, compte-rendu normé |
| **Léger à adopter** | Un seul `npx` pour industrialiser la discipline agentique |

## 6. Cas d'usage

- **Startups / équipes "vibe-coding"** voulant cadrer l'usage des agents IA sans freiner la vélocité
- **Equipes multi-outils** (Claude + Codex + Gemini) ayant besoin de règles communes
- **Maintenance longue durée** : projets devant être repris par d'autres humains/agents dans 6-12 mois
- **Projets sensibles** : besoin de traçabilité (qui a fait quoi, avec quelle preuve)
- **Monorepos** : contexte progressif par package/couche indispensable
- **Migration vers "AI-first"** sur codebase existant (`apply`)

## 7. Différenciation vs alternatives

| Critère | DrWil (kit-ia-first) | Plugin Claude Code | Règles README seules |
|---|---|---|---|
| **Fonctionne avec TOUS les agents** | ✓ | ✗ (Claude uniquement) | ✓ (théorique) |
| **Enforcement Git (inconditionnel)** | ✓ (.githooks) | ✗ | ✗ |
| **Reprise à froid** | ✓ (fiches datées) | Partiel | Non |
| **Outillé (vérifs automatiques)** | ✓ (check-docs, secrets, contrôles du projet) | Variable | Non |
| **Générique & configurable** | ✓ (layers, préfixes, mode) | Faible | Non |
| **Adoptable sur existant** | ✓ (`apply`) | Oui | Oui |
| **Traçabilité "preuve avant annonce"** | ✓ imposée | Dépendant | Non |

## 8. Roadmap

- **Phase 1** (actuelle) : Kit générique + modes minimal/full + config-driven ✓
- **Phase 2** : Enrichir les contrôles génériques en version agnostique (meilleur équilibre sécurité/généricité)
- **Phase 3** : Support `ciProvider: github|gitlab|none` dans `.drwil/ia-first.json` (checks.json agnostique)
- **Phase 4** : Templates skills déploiement génériques (`run`, `deploy-*`) + recettes clés-en-main
- **Phase 5** : Publication `@drwil/kit-ia-first` sur npm + documentation complète

## 9. Conclusion

**DrWil transforme l'expérience "agent IA sur un projet" en "équipe agent+humain disciplinée".**

L'enjeu n'est pas "empêcher l'agent", c'est **lui donner un cadre qui le fait gagner en efficacité tout en préservant la qualité, la traçabilité et la capacité à reprendre le travail à froid**.

En capitalisant sur ce pattern sous forme de **kit réutilisable**, DrWil permet à n'importe quelle équipe de bénéficier immédiatement d'une gouvernance IA-first éprouvée, sans reconstruire cet outillage à chaque nouveau projet.

**Valeur ajoutée** : Moins de dérives, plus de preuves, meilleure passation, zéro dépendance à un seul outil IA.

## 10. Économie de tokens & efficacité

L'un des effets souvent sous-estimé d'un cadre IA-first bien structuré est **l'économie de tokens**.

| Mécanisme | Impact | Explication |
|---|---|---|
| **Contexte budgété** | ★★★★★ | Au lieu de balayer tout le dépôt, l'agent charge uniquement : `AGENTS.md` racine → `AGENTS.md` de la couche touchée → recette concernée → `docs/contrats.md` si besoin. |
| **Une seule source de vérité** | ★★★★☆ | Moins de documents contradictoires → moins de confusion, moins d'hallucinations, moins de tentatives infructueuses. |
| **Reprise à froid** | ★★★★★ | Les fiches `docs/projets/*.md` contiennent statut daté, contexte, décisions, section "Reprise". L'agent n'a **pas** besoin de relire l'intégralité de l'historique conversationnel pour repartir. |
| **Cadrage avant implémentation** | ★★★★☆ | `docs/intentions/` force à clarifier le besoin avant d'écrire du code → évite les boucles "essaie-corrige" coûteuses en tokens. |
| **Recettes standardisées** | ★★★★☆ | `docs/recettes/` donnent le "chemin sûr" (étapes + vérifs) → moins d'exploration, moins d'aller-retours. |
| **Contrainte claire = moins de bruit** | ★★★★☆ | Des règles explicites ("preuve avant annonce", "hors-périmètre") évitent les digressions et les corrections inutiles. |

**Bénéfice concret** : sur des tâches répétitives ou à moyen/long terme, on observe typiquement **20-40% de réduction de tokens** par rapport à un usage "libre" sans cadre. L'économie est d'autant plus forte sur des projets de taille moyenne/grande ou lors de reprises après plusieurs jours.

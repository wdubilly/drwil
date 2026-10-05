# drwil

**IA-first governance, scaffolded in one command and enforced on every commit.**

> This repository is the source code of the drwil kit, **applied to
> itself** (dogfooding): it follows its own rules. If you're looking for
> the published package's own documentation (installation, CLI usage),
> see [`packages/drwil/README.md`](packages/drwil/README.md) — this file
> covers the same ground plus what's specific to developing the kit
> itself.

**When an AI coding assistant (or a human) writes code without a shared
frame of reference**, nothing stops context from getting lost between
sessions, a security rule from being skipped, a "fixed" being announced
without proof, or a secret leaking into a commit. drwil installs a
**machine-verified governance layer** into a project: the rules that
matter are written exactly once, and a Git check enforces them on every
commit — whether a human or an AI (Claude, Copilot, Cursor, Codex,
Gemini) is writing the code.

Concretely, the kit adds to a project:
- a **single entry point** every AI reads first (`AGENTS.md`);
- a **registry of the rules that matter** (`docs/contrats.md`), each with
  its proof;
- **Git checks** (`.githooks/`) that block a commit violating a rule —
  locally and in CI.

## Table of contents

- [Who it's for](#whos-its-for)
- [Why it reduces AI waste](#why-it-reduces-ai-waste)
- [What drwil solves, and how](#what-drwil-solves-and-how)
- [How it governs the AI](#how-it-governs-the-ai)
- [How this compares to Spec-Driven Development](#how-this-compares-to-spec-driven-development)
- [How it governs the team](#how-it-governs-the-team-humans-and-ai-mixed)
- [Optional modules](#optional-modules-never-installed-by-default)
- [At a glance](#at-a-glance)
- [Getting started (developing the kit itself)](#getting-started)
- [Trying the package without publishing to npm](#trying-the-package-without-publishing-to-npm)
- [Documentation map](#documentation-map)

## Who it's for

The benefit is concrete when:
- **several AI tools coexist on the same project** (Claude, Cursor,
  Copilot…) and their rules drift apart for lack of a shared entry
  point;
- **an AI task is regularly interrupted and resumed** by someone else
  (agent or human) without re-reading everything;
- **an incident already happened** (a leaked secret, a bypassed security
  rule, a "fixed" announced without proof) and you want it not to
  happen silently again.

Even solo, a project spanning several sessions benefits: you forget your
own past decisions and constraints after a few weeks too, not just a
team.

## Why it reduces AI waste

No number is claimed here (nothing is measured to date, see
`docs/recettes/suivre-consommation-par-lot.md`), but the mechanical
reasoning is concrete:

1. **Context loaded on demand**: layer-level `AGENTS.md` (not the whole
   repo) + progressive loading (the "Load context" section of
   `AGENTS.md`) — fewer tokens spent understanding before acting.
2. **Scoping before code**: an ambiguous request becomes a decision sheet
   before writing anything — avoids an agent heading the wrong way and
   having to redo everything (the real token waste).
3. **Mechanical proof instead of re-reading**: a contract verified by a
   check avoids repeated manual validation round-trips ("is this
   right?").

> **Code assistants**: start with `AGENTS.md` (conduct rules, contracts,
> context loading).

## What drwil solves, and how

| Concrete problem | drwil's mechanism | Contract / proof |
|---|---|---|
| Every AI tool (Claude, Cursor, Copilot…) has its own rules, which drift apart for lack of a shared entry point | A single `AGENTS.md` at the root, imported by each tool's own pointer file (`CLAUDE.md` here; Copilot/Cursor/Codex/Gemini equivalents shipped by the template depending on the tools chosen at install time) — one source, never copy-pasted | — |
| A doc cites a path or a contract ID that no longer exists (or doesn't exist yet) | A hook refuses the commit if the docs cite a nonexistent path/ID | QUA-011 |
| An agent claims "it's fixed" without having re-run the check | Explicit convention (`AGENTS.md`): proof before claim — re-run and read the output | — |
| A secret (key, password, `.env`) lands in a commit | Secret detection (gitleaks) at commit time and in CI, covering tracked files and history | SEC-007 |
| A dependency has a known flaw, nobody notices | Dependency audit wired into the project's standard checks | SEC-006 |
| A CI check was silently removed or no longer covers the right paths | A hook verifies every expected check actually runs in CI — an unexecuted check is never counted as passed | QUA-013 |
| A piece of work resumed cold (by another agent, or later) forces a full re-read to understand its state | Every sheet in `docs/projets/` has a dated Status and a Resume section; every index entry states who must decide (`[IA]`/`[humain]`/`[décision]`) | QUA-015 |
| Code gets added with no link to any documented piece of work | Every tracked code file must be covered by the scoping block of a `docs/projets/` sheet | QUA-016 |
| A direct commit or push to `master`/`main` bypasses review | Blocked after the very first commit: work goes through a branch + pull/merge request | QUA-017 |
| On this repo specifically: confusing "this project" with "the template it ships" | An explicit reminder forces asking which of the two is meant before acting, in case of doubt | QUA-018 |
| A blocking check (test, hook, CI) gets disabled or skipped "just this once" to move forward | Silently bypassing a check is forbidden; a miscalibrated check gets fixed, not switched off | QUA-019 |
| No branch protection possible (private repo, free plan): a direct merge can break `master` unnoticed | A GitHub/GitLab issue is opened automatically if CI breaks on the main branch (no duplicate if one is already open) | — (dedicated recipe) |

## How it governs the AI

- **Context loaded on demand**: layer-level `AGENTS.md` (not the whole
  repo), documented progressive loading — an AI understands the rules
  that apply to what it touches without ingesting everything every time.
- **Scoping before code**: an ambiguous request becomes a decision sheet
  (`docs/projets/`) before any code is written — open questions go to the
  human, never decided on their behalf.
- **Mechanical proof instead of re-reading**: a contract verified by a
  check (hook + CI) avoids manual validation round-trips.
- **Multi-tool, no drift**: Claude Code, GitHub Copilot, Cursor, Codex and
  Gemini all read the same `AGENTS.md` via their own pointer file — a
  rule changed once applies to every tool.
- **Nothing is ever silently overwritten**: `apply()` (installing on an
  existing project) detects a file already present that has drifted from
  the template and flags it instead of rewriting it; a manifest (path +
  fingerprint) tracks exactly what the kit installed.

## How this compares to Spec-Driven Development

drwil shares one idea with Spec-Driven Development (SDD): an ambiguous
request becomes a **written decision sheet before any code is written**,
instead of being decided silently mid-implementation. That's where the
similarity ends — drwil is not an SDD tool. It has no spec language, does
not generate code from a formal spec, and does not execute a spec as a
machine-verifiable contract end to end. Scoping-before-code is one piece
of a broader governance layer: keeping every AI tool aligned on the same
rules, blocking secrets and unproven "fixed" claims, and making sure a
check that stops running in CI is never silently counted as passing.
Think of it as **governance-first, not spec-first**: the contract that
gets enforced is "this rule is checked", not "this spec generates this
code".

## How it governs the team (humans and AI mixed)

- **Branch + review, systematically** (QUA-017): nobody (human or AI)
  pushes directly to the main branch after the very first commit —
  pull/merge request templates shipped depending on the CI chosen
  (GitHub or GitLab).
- **Traceable decision history**: `docs/contrats.md` (the rules that
  matter, with their proof) and `docs/projets/` (work in progress and
  closed, with dated decisions) replace oral decisions lost in a chat.
- **Alert, not a priori blocking**: with no branch protection available
  (free private repo), broken CI on the main branch opens an issue
  automatically instead of relying on someone watching.
- **Consumption and progress tracking**: an optional dashboard aggregates
  work items, contracts and cost (tokens) per batch, to quickly answer
  "where are we" and "what did it cost".

## Optional modules (never installed by default)

| Module | What it does | Activation |
|---|---|---|
| `tableau-de-bord` (dashboard) | HTML page aggregating the repo's work items, contracts and audits | copy the script, see its own README |
| `front-quality` | Contrast/color check (RGAA/WCAG) for a front-end | same as above |
| `creer-une-release` | Git tag + GitHub release note, best-effort semver bump (Conventional Commits) | `docs/recettes/creer-une-release.md` — always manual, on explicit request, never automatic |

## At a glance

- `packages/drwil/`: the package (`init`/`apply` CLI, FR/EN templates).
- `init` scaffolds a brand-new project; `apply` installs the kit on an
  existing project without ever overwriting anything.
- Stacks detected or explicitly chosen (`backend`, `frontend`,
  `generic`); AI tools (`claude`, `codex`, `cursor`, `gemini`,
  `copilot`) and CI (`github`, `gitlab`, or none) chosen at install time.
- Shipped in French and English, equivalent content in both languages
  (verified by test).
- Checks (doc consistency, secret detection, check-coverage-by-CI…) run
  at commit time (`.githooks/pre-commit`) and in CI.
- Tested green in CI on Linux, macOS and Windows (`kit-tests` matrix of
  `.github/workflows/`).
- Not yet published to npm: use today from a clone of this repository, or
  via an `npm pack` tarball (see below).

## Getting started

(Developing the kit itself — for using the published CLI on your own
project, see [`packages/drwil/README.md`](packages/drwil/README.md).)

```bash
cd packages/drwil
npm install
npm run build
npm test                 # drwil package's test suite

# try the CLI on an empty folder
node bin/drwil.js init --name "MyProject" --layers backend,frontend
```

Enable the verification hooks, once per clone:
```bash
git config core.hooksPath .githooks
```

## Trying the package without publishing to npm

```bash
cd packages/drwil
npm pack                 # auto-rebuilds (the "prepack" script), produces drwil-0.0.1.tgz
```

The `.tgz` file installs like any npm package, locally or for someone
else:
```bash
npm install /path/to/drwil-0.0.1.tgz
npx drwil init --name "MyProject"
```
Also works without a prior install: `npx /path/to/drwil-0.0.1.tgz init ...`.

## Documentation map

| Topic | Document |
|---|---|
| Lifecycle of a work item, scoping, cold resume | `docs/ia-first.md` |
| Repository structure | `docs/architecture.md` |
| Enforced rules (baseline contracts) | `docs/contrats.md` |
| Optional contracts a project can adopt | `docs/catalogue-contrats.md` |
| Reusable procedures (adopting the kit, auditing, etc.) | `docs/recettes/` |
| Pending work items | `docs/projets/en-attente.md` |
| Checking project progress | `docs/recettes/visualiser-avancement.md` |
| Auditing risk and technical debt | `docs/recettes/auditer-risques-et-dette.md` |
| Tracking the cost of a piece of work | `docs/recettes/suivre-consommation-par-lot.md` |
| Exploring product value | `docs/recettes/decouvrir-valeur-produit.md` |
| Working with branches and merge/pull requests | `docs/recettes/travailler-en-branche.md` |

---

# drwil (Français)

**Quand une IA (ou un humain) code sans cadre**, rien n'empêche un oubli
de contexte entre deux sessions, une règle de sécurité non respectée, un
« c'est corrigé » annoncé sans preuve, ou un secret qui fuite dans un
commit. drwil installe dans un projet un **cadre vérifié
automatiquement** : les règles importantes sont écrites une seule fois,
et un contrôle Git les fait respecter à chaque commit — que ce soit vous
ou une IA (Claude, Copilot, Cursor, Codex, Gemini) qui écrive le code.

Concrètement, le kit ajoute à un projet :
- un **point d'entrée unique** que toute IA lit en premier (`AGENTS.md`) ;
- un **registre des règles qui comptent** (`docs/contrats.md`), chacune
  avec sa preuve ;
- des **contrôles Git** (`.githooks/`) qui bloquent un commit qui viole
  une règle — en local et en CI.

Ce dépôt est le code source du kit, **appliqué à lui-même** (dogfooding) :
il suit ses propres règles.

## Pour qui

Le bénéfice est concret si :
- plusieurs outils IA cohabitent sur le même projet (Claude, Cursor,
  Copilot…) et leurs règles divergent faute d'un point d'entrée commun ;
- une tâche IA est régulièrement interrompue et reprise par quelqu'un
  d'autre (agent ou humain) sans tout relire ;
- un incident a déjà eu lieu (secret qui fuite, règle de sécurité
  contournée, « corrigé » annoncé sans preuve) et vous voulez que ça ne
  se reproduise pas en silence.

Même en solo, un projet qui s'étale sur plusieurs sessions en profite :
on oublie aussi ses propres décisions et contraintes au bout de quelques
semaines, pas seulement en équipe.

## Pourquoi ça réduit le gaspillage IA

Pas de chiffre annoncé ici (rien n'est mesuré à ce jour, voir
`docs/recettes/suivre-consommation-par-lot.md`), mais un raisonnement
mécanique concret :

1. **Contexte chargé à la demande** : `AGENTS.md` de couche (pas tout le
   dépôt) + chargement progressif (section « Charger le contexte »
   d'`AGENTS.md`) — moins de tokens consommés pour comprendre avant
   d'agir.
2. **Cadrage avant code** : une demande ambiguë devient une fiche de
   décision avant d'écrire — évite qu'un agent parte dans une mauvaise
   direction et qu'il faille tout refaire (le vrai gaspillage de
   tokens).
3. **Preuve mécanique plutôt que relecture** : un contrat vérifié par un
   contrôle évite les allers-retours de validation manuelle (« est-ce
   bon ? » répété).

> **Assistants de code** : commencer par `AGENTS.md` (conduite, contrats,
> chargement du contexte).

## Ce que drwil résout, et comment

| Problème concret | Mécanisme drwil | Contrat / preuve |
|---|---|---|
| Chaque outil IA (Claude, Cursor, Copilot…) a ses propres règles, qui divergent faute d'un point d'entrée commun | `AGENTS.md` unique à la racine, importé par un fichier d'import propre à chaque outil (`CLAUDE.md` ici ; équivalents Copilot/Cursor/Codex/Gemini livrés par le gabarit selon l'outil choisi à l'installation) — une seule source, jamais recopiée | — |
| Une doc cite un chemin ou un ID de contrat qui n'existe plus (ou plus) | Un hook refuse le commit si la doc cite un chemin/ID inexistant | QUA-011 |
| Un agent affirme « c'est corrigé » sans avoir relancé le contrôle | Convention explicite (`AGENTS.md`) : preuve avant annonce — relancer et lire la sortie | — |
| Un secret (clé, mot de passe, `.env`) atterrit dans un commit | Détection de secrets (gitleaks) au commit et en CI, sur les fichiers indexés et l'historique | SEC-007 |
| Une dépendance a une faille connue, personne ne s'en aperçoit | Audit de dépendances déclaré dans les contrôles du projet | SEC-006 |
| Un contrôle CI a été silencieusement retiré ou ne couvre plus les bons chemins | Un hook vérifie que chaque contrôle attendu tourne réellement en CI — un contrôle non exécuté n'est pas considéré passé | QUA-013 |
| Un chantier repris à froid (par un autre agent, ou plus tard) oblige à tout relire pour comprendre où ça en est | Chaque fiche de `docs/projets/` a un Statut daté et une section Reprise ; chaque case de l'index porte qui doit trancher (`[IA]`/`[humain]`/`[décision]`) | QUA-015 |
| Du code est ajouté sans lien avec aucun chantier documenté | Tout fichier de code indexé doit être couvert par le bloc de cadrage d'une fiche de `docs/projets/` | QUA-016 |
| Un commit ou push direct sur `master`/`main` contourne la revue | Bloqué après le tout premier commit (bootstrap toléré) : le travail passe par une branche + pull/merge request | QUA-017 |
| Sur ce dépôt précisément : confondre « ce projet » et « le gabarit qu'il distribue » | Un rappel explicite force à demander lequel des deux est visé avant d'agir en cas de doute | QUA-018 |
| Un contrôle bloquant (test, hook, CI) est désactivé ou sauté « juste cette fois » pour avancer | Contourner un contrôle en silence est interdit ; un contrôle mal calibré se corrige, ne se désactive pas | QUA-019 |
| Pas de protection de branche possible (dépôt privé, plan gratuit) : un merge direct peut casser `master` sans que personne ne s'en rende compte | Une issue GitHub/GitLab est ouverte automatiquement si la CI casse sur la branche principale (pas de doublon si déjà ouverte) | — (recette dédiée) |

## Comment ça cadre l'IA

- **Contexte chargé à la demande** : `AGENTS.md` de couche (pas tout le
  dépôt), chargement progressif documenté — une IA comprend les règles
  qui s'appliquent à ce qu'elle touche sans tout ingérer à chaque fois.
- **Cadrage avant code** : une demande ambiguë devient une fiche de
  décision (`docs/projets/`) avant d'écrire du code — les points à
  trancher sont posés à l'humain, pas décidés à sa place.
- **Preuve mécanique plutôt que relecture** : un contrat vérifié par un
  contrôle (hook + CI) évite les allers-retours de validation manuelle.
- **Multi-outils sans dérive** : Claude Code, GitHub Copilot, Cursor,
  Codex et Gemini lisent tous le même `AGENTS.md` via leur fichier
  d'import respectif — une règle changée une fois vaut pour tous les
  outils.
- **Rien n'est jamais écrasé** : `apply()` (installation sur un projet
  existant) détecte un fichier déjà présent qui a dérivé du gabarit et le
  signale au lieu de le réécrire ; un manifeste (chemin + empreinte)
  trace ce que le kit a installé.

## Comment ça cadre l'équipe (humains et IA mélangés)

- **Branche + revue systématiques** (QUA-017) : personne (humain ou IA)
  ne pousse directement sur la branche principale après le tout premier
  commit — gabarits de pull/merge request fournis selon la CI choisie
  (GitHub ou GitLab).
- **Historique des décisions traçable** : `docs/contrats.md` (les règles
  qui comptent, avec leur preuve) et `docs/projets/` (chantiers en cours
  et clos, avec leurs décisions datées) remplacent les décisions orales
  perdues dans un chat.
- **Alerte, pas de blocage a priori** : sans protection de branche
  possible (dépôt privé gratuit), la CI cassée sur la branche principale
  ouvre une issue automatiquement plutôt que de compter sur quelqu'un qui
  surveille.
- **Suivi de consommation et d'avancement** : un tableau de bord
  optionnel agrège les chantiers, contrats et coûts (tokens) par lot,
  pour répondre vite à « où en est-on » et « qu'est-ce que ça a coûté ».

## Modules optionnels (jamais installés par défaut)

| Module | Ce qu'il fait | Activation |
|---|---|---|
| `tableau-de-bord` | Page HTML qui agrège chantiers, contrats et audits du dépôt | copier le script, voir son README |
| `front-quality` | Contrôle de contraste et de couleurs (RGAA/WCAG) pour un front | idem |
| `creer-une-release` | Tag Git + note de release GitHub, calcul de version best-effort (Conventional Commits) | `docs/recettes/creer-une-release.md` — toujours manuel, sur demande explicite, jamais automatique |

## En bref

- `packages/drwil/` : le paquet (CLI `init`/`apply`, templates FR/EN).
- `init` scaffolde un projet neuf ; `apply` installe le kit sur un projet
  existant sans jamais rien écraser.
- Stacks détectées ou choisies explicitement (`backend`, `frontend`,
  `generic`) ; outils IA (`claude`, `codex`, `cursor`, `gemini`,
  `copilot`) et CI (`github`, `gitlab`, ou aucune) au choix à
  l'installation.
- Livré en français et en anglais, contenu équivalent dans les deux
  langues (vérifié par test).
- Les contrôles (cohérence de la doc, détection de secrets, couverture des
  contrôles par la CI…) s'exécutent au commit (`.githooks/pre-commit`) et
  en CI.
- Testé vert en CI sur Linux, macOS et Windows (matrice `kit-tests` de
  `.github/workflows/`).
- Pas encore publié sur npm : s'utilise aujourd'hui depuis un clone de ce
  dépôt, ou via un tarball `npm pack` (voir ci-dessous).

## Démarrer

```bash
cd packages/drwil
npm install
npm run build
npm test                 # suite de tests du paquet drwil

# tester le CLI sur un dossier vide
node bin/drwil.js init --name "MonProjet" --layers backend,frontend
```

Activer les hooks de vérification, une fois par clone :
```bash
git config core.hooksPath .githooks
```

## Donner le paquet à tester sans publier sur npm

```bash
cd packages/drwil
npm pack                 # rebuild automatique (script "prepack"), produit drwil-0.0.1.tgz
```

Le fichier `.tgz` s'installe comme n'importe quel paquet npm, en local ou
chez quelqu'un d'autre :
```bash
npm install /chemin/vers/drwil-0.0.1.tgz
npx drwil init --name "MonProjet"
```
Fonctionne aussi sans installation préalable : `npx /chemin/vers/drwil-0.0.1.tgz init ...`.

## Documentation

| Sujet | Document |
|---|---|
| Cycle de vie d'un chantier, cadrage, reprise à froid | `docs/ia-first.md` |
| Structure du dépôt | `docs/architecture.md` |
| Règles vérifiées (contrats du socle) | `docs/contrats.md` |
| Contrats optionnels à adopter sur un projet | `docs/catalogue-contrats.md` |
| Procédures réutilisables (adopter le kit, auditer, etc.) | `docs/recettes/` |
| Chantiers en attente | `docs/projets/en-attente.md` |
| Voir où en est le projet | `docs/recettes/visualiser-avancement.md` |
| Auditer risques et dette technique | `docs/recettes/auditer-risques-et-dette.md` |
| Suivre le coût d'un chantier | `docs/recettes/suivre-consommation-par-lot.md` |
| Explorer la valeur produit | `docs/recettes/decouvrir-valeur-produit.md` |
| Travailler avec des branches et des merge/pull requests | `docs/recettes/travailler-en-branche.md` |

# drwil

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

Moins utile pour un développeur solo sur un seul outil et un projet
court : le bénéfice existe mais reste marginal face au coût
d'installation.

> **Assistants de code** : commencer par `AGENTS.md` (conduite, contrats,
> chargement du contexte).

## En bref

- `packages/drwil/` : le paquet (CLI `init`/`apply`, templates FR/EN).
- `init` scaffolde un projet neuf ; `apply` installe le kit sur un projet
  existant sans jamais rien écraser.
- Les contrôles (cohérence de la doc, détection de secrets, couverture des
  contrôles par la CI…) s'exécutent au commit (`.githooks/pre-commit`) et
  en CI.
- Pas encore publié sur npm : s'utilise aujourd'hui depuis un clone de ce
  dépôt (voir ci-dessous).

## Démarrer

```bash
cd packages/drwil
npm install
npm run build
npm test                 # 36 tests

# tester le CLI sur un dossier vide
node bin/drwil.js init --name "MonProjet" --layers backend,frontend
```

Activer les hooks de vérification, une fois par clone :
```bash
git config core.hooksPath .githooks
```

## Documentation

| Sujet | Document |
|---|---|
| Cycle de vie d'un chantier, cadrage, reprise à froid | `docs/ia-first.md` |
| Structure du dépôt | `docs/architecture.md` |
| Règles vérifiées (contrats du socle) | `docs/contrats.md` |
| Contrats optionnels à adopter sur un projet | `docs/catalogue-contrats.md` |
| Procédures réutilisables (adopter le kit, auditer, etc.) | `docs/recettes/` |
| Chantiers en attente | `docs/projets/en-attente.md` |

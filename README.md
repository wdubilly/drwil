# drwil

Kit de gouvernance IA-first pour projets logiciels : point d'entrée unique
(`AGENTS.md`), un registre de contrats vérifiés par machine
(`docs/contrats.md`), des contrôles Git (`.githooks/`) qui bloquent tout
commit qui les viole — humain ou agent IA, quel que soit l'outil (Claude,
Codex, Cursor, Gemini, Copilot).

Ce dépôt est le code source du kit, **appliqué à lui-même** (dogfooding) :
son propre `AGENTS.md`, ses propres contrôles et ses propres chantiers
suivent les mêmes règles qu'un projet qui l'adopterait.

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

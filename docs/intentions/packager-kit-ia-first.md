# Intention : Packager @drwil/kit-ia-first sur npm

## Besoin
Rendre le kit IA-first (`@drwil/kit-ia-first`) facilement distribuable pour un usage en équipe et/ou hors environnement local, afin de pouvoir l'initialiser avec `npx @drwil/kit-ia-first init` sans dépendre d'un chemin absolu.

## Existant
- Monorepo `drwil/` avec `packages/kit-ia-first/` fonctionnel (CLI, templates, bin)
- Build TypeScript fonctionne (`tsc --build`)
- Templates complets (AGENTS.md, .githooks, docs IA-first)
- Modes `minimal/full`, config `.drwil/ia-first.json`, CLI `init/apply`

## Questions à trancher
1. Scope de publication : privé (npm private org) ou public ?
2. Nom du package : `@drwil/kit-ia-first` (déjà défini) OK ?
3. Version initiale : 0.1.0 ou 1.0.0 ?
4. Inclure `dist/` et `templates/` dans le paquet (files field) ?
5. Automatiser build avant publish (prepublishOnly) ?
6. Registry : npmjs.com ou registre interne (GitLab, Verdaccio...) ?

## Périmètre
- Configurer `package.json` (files, main/types, bin, engines, license, repository)
- Ajouter scripts (prepublishOnly/build/clean)
- Vérifier que `templates/` et `bin/` sont inclus dans le tarball
- Générer premier build propre
- Publier en dry-run (`npm publish --dry-run`)
- Documenter usage (`npx @drwil/kit-ia-first init`)
- Mettre à jour README/DOC_TECHNICO_COMMERCIAL si nécessaire

## Hors périmètre
- CI/CD de publication automatique (GitHub Actions/GitLab) pour l'instant
- Changement de logique du kit (fonctionnel tel quel)

## Contraintes / risques
- `templates/` doivent être présents dans `dist` ou copiés ? Actuellement lus depuis `../templates` relatif à `dist`/`bin` → vérifier chemin dans build
- Bin ESM (`type: module`) OK
- Taille paquet raisonnable

## Décisions à prendre
- Publier en 0.1.0 (beta)
- Inclure `dist/`, `templates/`, `bin/` via `files: ["dist", "templates", "bin", "README.md"]`
- `prepublishOnly`: `pnpm build`

## Critères de sortie
- `npm publish --dry-run` OK (contenu attendu)
- Peut être initialisé depuis dossier vierge avec `npx @drwil/kit-ia-first init --mode full`
- Documentation usage mise à jour

# Intention : Packager @drwil/kit-ia-first sur npm

**Statut** (2026-10-04) : en attente — questions à trancher non encore tranchées par le demandeur (voir `docs/projets/suites-kit-portable.md`, point 7). Audit du paquet fait le 2026-10-04 (voir « Constat vérifié » ci-dessous) : le paquet ne fonctionne pas en l'état, bloquant confirmé en conditions réelles.

## Besoin
Rendre le kit IA-first (`@drwil/kit-ia-first`) facilement distribuable pour un usage en équipe et/ou hors environnement local, afin de pouvoir l'initialiser avec `npx @drwil/kit-ia-first init` sans dépendre d'un chemin absolu.

## Existant
- Monorepo `drwil/` avec `packages/kit-ia-first/` fonctionnel (CLI, templates, bin)
- Build TypeScript fonctionne (`tsc --build`)
- Templates complets (AGENTS.md, .githooks, docs IA-first)
- Modes `minimal/full`, config `.drwil/ia-first.json`, CLI `init/apply`

## Questions à trancher
1. Scope de publication : privé (npm private org) ou public ?
2. ~~Nom du package~~ : tranché — `drwil`, voir
   `docs/projets/renommer-kit-en-drwil.md`.
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

## Constat vérifié (2026-10-04)
Simulation réelle : `npm pack` puis extraction dans un dossier propre, `npm
install`, exécution de `node bin/drwil-ia-first.js`.

- **🔴 Bloquant — le paquet ne fonctionne pas** : sans champ `files`, `npm
  pack` respecte `.gitignore`, qui exclut `dist/`. Preuve : après
  installation du tarball, `node bin/drwil-ia-first.js` échoue avec
  `Cannot find module '.../dist/index.js'`. Le paquet inclut en revanche
  `packages/kit-ia-first/src/` et `packages/kit-ia-first/test/kit.test.mjs`
  (28 Ko), inutiles une fois publié.
- **🟡 Nécessaire avant publication** : `README.md` à la racine du paquet
  (absent — c'est la page affichée sur npm), `LICENSE` (absent de tout le
  dépôt), champs `package.json` manquants (`license`, `repository`,
  `description`, `engines`).
- **🔵 Geste humain** : authentification npm — vérifié, ce poste n'est pas
  connecté (`npm whoami` → `ENEEDAUTH`). La publication elle-même reste un
  geste humain, jamais fait par un agent sans accord explicite.

## Décisions à prendre
- Publier en 0.1.0 (beta)
- Inclure `dist/`, `templates/`, `bin/` via `files: ["dist", "templates", "bin", "README.md"]`
- `prepublishOnly`: `pnpm build`

## Critères de sortie
- `npm publish --dry-run` OK (contenu attendu)
- Peut être initialisé depuis dossier vierge avec `npx @drwil/kit-ia-first init --mode full`
- Documentation usage mise à jour

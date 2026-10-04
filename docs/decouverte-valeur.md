# Découverte de valeur et opportunités produit

> Dernier scan : 2026-10-04
> État du projet : monorepo TypeScript déjà structuré autour de
> `@drwil/kit-ia-first`. Le kit dispose d'un CLI `init/apply`, de templates
> multilingues, de hooks et de skills Claude. Il est appliqué à drwil
> lui-même ; plusieurs fonctionnalités sont cadrées mais encore non
> implémentées.

## Opportunités prioritaires (matrice valeur / effort)

| ID | Fonctionnalité proposée | Pourquoi (valeur métier) | État du code existant | Effort | Action recommandée |
|---|---|---|---|---|---|
| OPT-1 | Publier `@drwil/kit-ia-first` sur npm | Rend le kit installable par une équipe ou depuis n'importe quel dépôt avec `npx`, au lieu de dépendre d'un checkout local. | Le package, son CLI, son build et ses templates existent déjà (`packages/kit-ia-first/package.json`, `packages/kit-ia-first/src/index.ts`, `packages/kit-ia-first/templates/`). L'intention de publication est déjà cadrée (`docs/intentions/packager-kit-ia-first.md`). | 🟡 Moyen | Trancher les questions ouvertes de la fiche, vérifier le tarball (`npm publish --dry-run`), publier une première version beta. |
| OPT-2 | Ajouter le suivi générique des tokens au tableau de bord | Donne une visibilité sur le coût IA par chantier et par lot, directement dans l'outil de pilotage existant. | Le tableau de bord statique lit déjà les fiches projets, statuts et lots (`.githooks/tableau-de-bord.mjs`, module livré dans `packages/kit-ia-first/templates/common/optional/tableau-de-bord/tableau-de-bord.mjs`), mais aucune donnée de tokens n'est encore lue. Format et module déjà cadrés (`docs/intentions/surveiller-consommation-tokens.md`). | 🟡 Moyen | Implémenter la lecture/agrégation de .drwil/usage.jsonl, puis le module d'export Copilot CLI. |
| OPT-3 | Déclarer les contrôles projet réels (lint/tests/build) dans `.drwil/ia-first.json` | Un commit peut aujourd'hui passer sans qu'aucun contrôle réel (typecheck, tests) ne tourne — gain de fiabilité immédiat, sans nouveau code. | `.drwil/ia-first.json` → `checks` est vide ; `.githooks/run-checks.mjs` le signale déjà lui-même (« non exécuté »). Le constat est déjà posé dans `docs/audit-risques.md` (RSK-1). | 🟢 Faible | Ajouter les entrées `checks` (ex. `tsc --build`, `node --test` du kit) et vérifier `node .githooks/run-checks.mjs`. |
| OPT-4 | Sécuriser la mise à jour d'une ancienne installation du kit | Évite les fichiers obsolètes et les migrations manuelles lors des mises à jour, ce qui réduit le coût d'adoption en équipe. | `apply()`/`init()` (`packages/kit-ia-first/src/index.ts`) n'écrasent ni ne suppriment jamais un fichier existant — un stub obsolète (`.githooks/cadrage.py`, `.githooks/check-docs.py`, déjà repérés comme code hors fiche) reste indéfiniment après upgrade. Besoin documenté (`docs/projets/suites-kit-portable.md`, point 3 ; `docs/audit-risques.md`, RSK-4). | 🟡 Moyen | Concevoir une liste versionnée de fichiers supprimables, ne supprimer que les fichiers identiques à un ancien modèle, tester sur un projet généré ancien. |

## Analyse détaillée des meilleures pistes

### OPT-1 — Publier `@drwil/kit-ia-first` sur npm
- **Problème résolu** : rendre le kit accessible hors du dépôt source,
  notamment via `npx @drwil/kit-ia-first init`.
- **Briques existantes réutilisables** : `packages/kit-ia-first/package.json`
  (nom, bin déjà déclarés) ; `packages/kit-ia-first/src/index.ts`
  (`init()`/`apply()` déjà fonctionnels) ; `packages/kit-ia-first/templates/`
  (contenu complet, FR/EN).
- **Ce qu'il reste à faire** : configurer `files`/`main`/`types`/`bin` et
  les scripts de publication, vérifier que `dist/`, `templates/`, `bin/`
  figurent dans le tarball, exécuter `npm publish --dry-run`.
- **Impact si implémenté** : adoption plus simple du kit, reproductibilité
  des installations, possibilité de l'utiliser comme produit distribué.

### OPT-2 — Suivre les tokens dans le tableau de bord
- **Problème résolu** : le tableau de bord affiche l'avancement mais pas
  le coût IA engagé par lot ou chantier.
- **Briques existantes réutilisables** : `.githooks/tableau-de-bord.mjs`
  (lecture des fiches, lots, statuts déjà en place) ; module optionnel
  déjà livré dans `packages/kit-ia-first/templates/common/optional/tableau-de-bord/`.
- **Ce qu'il reste à faire** : documenter .drwil/usage.jsonl, agréger
  les tokens par chantier/lot, afficher l'indicateur sans régression si le
  fichier est absent, fournir le module optionnel d'export Copilot CLI.
- **Impact si implémenté** : meilleure maîtrise de la consommation IA,
  comparaison de l'effort réel entre chantiers, sans dépendance à un seul
  outil IA.

### OPT-3 — Déclarer les contrôles projet réels dans la config
- **Problème résolu** : aucun contrôle réel (lint, typecheck, tests) du
  dépôt n'est aujourd'hui câblé au hook de pre-commit — seule la
  documentation est vérifiée.
- **Briques existantes réutilisables** : `.githooks/run-checks.mjs` sait
  déjà exécuter et rapporter des `checks` déclarés (testé dans
  `packages/kit-ia-first/test/kit.test.mjs`) ; il ne manque qu'une
  déclaration dans `.drwil/ia-first.json`.
- **Ce qu'il reste à faire** : choisir les commandes réelles du monorepo
  (`tsc --build`, `node --test` du kit...) et les ajouter à `checks`.
- **Impact si implémenté** : fiabilité immédiate du filet de commit, sans
  écrire une seule ligne de code nouveau — le plus petit effort de toute
  cette liste.

### OPT-4 — Sécuriser la mise à jour d'une ancienne installation
- **Problème résolu** : une mise à jour du kit laisse aujourd'hui des
  fichiers obsolètes dans le dépôt cible, source de confusion et de
  contrôles en double.
- **Briques existantes réutilisables** : `scaffold()`/`apply()`
  (`packages/kit-ia-first/src/index.ts`) centralisent déjà toute la copie
  et la politique de non-écrasement ; `docs/projets/suites-kit-portable.md`
  décrit précisément le problème.
- **Ce qu'il reste à faire** : introduire une manifest de fichiers retirés
  par version, comparer le contenu avant suppression, couvrir par un test
  de migration.
- **Impact si implémenté** : mises à jour plus fiables, moins de nettoyage
  manuel, meilleure adoption du kit en équipe.

## Prochaine étape

Choisir un ID et répondre : « Valide OPT-X pour la convertir en
intention ».

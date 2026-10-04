# Audit de risques et dette technique

> Dernier scan : 2026-10-04
> Niveau de santé global : 🟠 Fragile

## Synthèse

| ID | Risque | Catégorie | Gravité | Fichiers concernés | Action proposée |
|---|---|---|---|---|---|
| RSK-1 | Aucun contrôle projet déclaré (lint/tests/typecheck) | Sécurité/Qualité | 🔴 | `.drwil/ia-first.json`, `.githooks/run-checks.mjs` | Déclarer les contrôles réels du dépôt dans `.drwil/ia-first.json` → `checks` |
| RSK-2 | Pas de CI configurée pour couvrir les contrôles (QUA-013 non exécuté) | Tests | 🔴 | `.drwil/ia-first.json` (`ciFiles: []`), `.githooks/run-checks.mjs` | Activer `.github/workflows/ia-first.yml` (livré mais non raccordé) ou le fichier GitLab CI générique (non utilisé ici) |
| RSK-3 | Compatibilité Windows/macOS jamais testée | Stabilité | 🟠 | `docs/projets/suites-kit-portable.md` (point 1), `packages/kit-ia-first/src/index.ts` | Tester `init`/`apply` sur les trois OS, idéalement en matrice CI |
| RSK-4 | `apply`/`init` ne nettoient jamais les fichiers obsolètes d'une version antérieure du kit | Code mort | 🟠 | `docs/projets/suites-kit-portable.md` (point 3), `packages/kit-ia-first/src/index.ts` | Définir une liste de fichiers retirés par version, ne supprimer que les fichiers identiques à un ancien modèle |
| RSK-5 | Les contrôles `.githooks/check-docs.mjs` et `.githooks/run-checks.mjs` installés sur drwil n'ont pas de test propre côté dépôt (seul `.githooks/cadrage.test.mjs` existe) | Tests | 🟡 | `.githooks/cadrage.test.mjs`, `.githooks/check-docs.mjs`, `.githooks/run-checks.mjs` | Ajouter des cas de non-régression ciblés (secrets absents, `checks` vide, CI absente) |

## Détail des risques majeurs

### RSK-1 — Contrôles projet non déclarés
- **Attendu** : `.drwil/ia-first.json` prévoit une clé `checks` pour les
  contrôles réels de la pile (lint, typecheck, tests, build — voir
  `docs/recettes/adopter-le-kit.md`, étape 3).
- **Codé réellement** : `.drwil/ia-first.json` ne contient aucune clé
  `checks`. `.githooks/run-checks.mjs` le signale lui-même à chaque
  exécution (« non exécuté : contrôles du projet... aucun déclaré »).
- **Risque encouru** : un commit peut passer sans qu'aucun test/lint réel
  du dépôt (au-delà de la doc) n'ait tourné.
- **Correctif recommandé** : déclarer les contrôles effectifs de drwil
  (TypeScript `tsc --build`, `node --test` du kit, etc.) dans `checks`.

### RSK-2 — Pas de CI pour couvrir les contrôles
- **Attendu** : `docs/contrats.md` (QUA-013) exige qu'au moins une CI
  exécute les mêmes contrôles qu'en local.
- **Codé réellement** : `.drwil/ia-first.json` → `ciFiles: []`. Le dépôt
  possède pourtant `.github/workflows/ia-first.yml` (livré par `apply()`),
  non déclaré donc non vérifié par `.githooks/run-checks.mjs`.
- **Risque encouru** : une régression locale non détectée peut être
  poussée sans filet CI.
- **Correctif recommandé** : ajouter `.github/workflows/ia-first.yml` à
  `ciFiles` une fois son déclenchement vérifié.

### RSK-3 — Compatibilité multi-plateforme non démontrée
- **Attendu** : `docs/projets/suites-kit-portable.md`, point 1, liste
  explicitement Windows/macOS comme non vérifiés.
- **Codé réellement** : `packages/kit-ia-first/src/index.ts` écrit des
  hooks Git (`.githooks/`) et des permissions d'exécution sans test hors
  Linux.
- **Risque encouru** : `init`/`apply` peuvent échouer silencieusement ou
  produire des hooks inopérants sur Windows/macOS.
- **Correctif recommandé** : exécuter `npm test` du kit sur une VM/CI
  Windows et macOS avant la prochaine publication.

### RSK-4 — Pas de nettoyage des fichiers obsolètes
- **Attendu** : `docs/projets/suites-kit-portable.md`, point 3, pose la
  question de la migration d'une ancienne version du kit comme non
  traitée.
- **Codé réellement** : `packages/kit-ia-first/src/index.ts` (`scaffold`)
  n'écrit que les fichiers manquants, ne supprime jamais un fichier retiré
  d'un modèle plus récent.
- **Risque encouru** : après une mise à jour du kit, d'anciens fichiers
  (ex. stubs Python déjà présents côté drwil : `.githooks/cadrage.py`,
  `.githooks/check-docs.py`) restent indéfiniment, créant une confusion
  entre l'ancien et le nouveau contrôle actif.
- **Correctif recommandé** : définir une liste de fichiers retirés par
  version et ne supprimer que ceux dont le contenu correspond encore à
  l'ancien modèle (jamais un fichier modifié par l'utilisateur).

### RSK-5 — Contrôles du socle sans test dédié côté drwil
- **Attendu** : chaque contrôle livré devrait pouvoir être vérifié
  indépendamment (cohérent avec l'esprit de `docs/recettes/refactorer-sans-casser.md`).
- **Codé réellement** : seul `.githooks/cadrage.test.mjs` existe à la
  racine de drwil. `.githooks/check-docs.mjs` et `.githooks/run-checks.mjs`
  sont bien testés côté kit (`packages/kit-ia-first/test/kit.test.mjs`,
  31 tests verts), mais pas sur leur copie réellement installée à la
  racine du dépôt.
- **Risque encouru** : une modification manuelle future du fichier
  installé (hors du kit) ne serait détectée par aucun test local.
- **Correctif recommandé** : accepter ce risque comme mineur (le fichier
  installé est une copie directe du template testé) ou ajouter un test de
  non-régression qui compare le fichier installé au template du kit.

## Prochaine étape

Choisir un ID et répondre : « Corrige RSK-X ».

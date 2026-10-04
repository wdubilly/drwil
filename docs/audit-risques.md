# Audit de risques et dette technique

> Dernier scan : 2026-10-04
> Niveau de santé global : 🟠 Fragile

## Synthèse

| ID | Risque | Catégorie | Gravité | Fichiers concernés | Action proposée |
|---|---|---|---|---|---|
| RSK-1 | ~~Aucun contrôle projet déclaré (lint/tests/typecheck)~~ **corrigé le 2026-10-04** | Sécurité/Qualité | ✅ | `.drwil/ia-first.json`, `.githooks/run-checks.mjs` | `checks` déclare `npm test` (build + 36 tests) de `packages/kit-ia-first` |
| RSK-2 | ~~Pas de CI configurée pour couvrir les contrôles (QUA-013 non exécuté)~~ **corrigé le 2026-10-04** | Tests | ✅ | `.drwil/ia-first.json` (`ciFiles`), `.githooks/run-checks.mjs` | `ciFiles` pointait sur un fichier GitLab CI inexistant alors que `.github/workflows/ia-first.yml` tourne déjà — corrigé pour pointer dessus |
| RSK-3 | Compatibilité Windows/macOS jamais testée | Stabilité | 🟠 | `docs/projets/suites-kit-portable.md` (point 1), `packages/kit-ia-first/src/index.ts` | Tester `init`/`apply` sur les trois OS, idéalement en matrice CI |
| RSK-4 | `apply`/`init` ne nettoient jamais les fichiers obsolètes d'une version antérieure du kit | Code mort | 🟠 | `docs/projets/suites-kit-portable.md` (point 3), `packages/kit-ia-first/src/index.ts` | Définir une liste de fichiers retirés par version, ne supprimer que les fichiers identiques à un ancien modèle |
| RSK-5 | Les contrôles `.githooks/check-docs.mjs` et `.githooks/run-checks.mjs` installés sur drwil n'ont pas de test propre côté dépôt (seul `.githooks/cadrage.test.mjs` existe) | Tests | 🟡 | `.githooks/cadrage.test.mjs`, `.githooks/check-docs.mjs`, `.githooks/run-checks.mjs` | Ajouter des cas de non-régression ciblés (secrets absents, `checks` vide, CI absente) |

## Détail des risques majeurs

### RSK-1 — Contrôles projet non déclarés (corrigé le 2026-10-04)
- **Attendu** : `.drwil/ia-first.json` prévoit une clé `checks` pour les
  contrôles réels de la pile (lint, typecheck, tests, build — voir
  `docs/recettes/adopter-le-kit.md`, étape 3).
- **Constaté** : `.drwil/ia-first.json` ne contenait aucune clé
  `checks`. `.githooks/run-checks.mjs` le signalait lui-même à chaque
  exécution (« non exécuté : contrôles du projet... aucun déclaré »).
- **Risque encouru** : un commit pouvait passer sans qu'aucun test/lint
  réel du dépôt (au-delà de la doc) n'ait tourné.
- **Correctif appliqué** : `checks` déclare désormais `npm test` dans
  `packages/kit-ia-first` (`tsc --build && node --test`, couvre
  compilation + 36 tests), rattaché au job CI `checks` existant (déjà
  déclenché sur tout push, aucune CI à modifier). Preuve :
  `.githooks/run-checks.mjs` exécute réellement le contrôle (0 non
  exécuté), `.githooks/check-control-coverage.mjs` toujours vert.

### RSK-2 — Pas de CI pour couvrir les contrôles (corrigé le 2026-10-04)
- **Attendu** : `docs/contrats.md` (QUA-013) exige qu'au moins une CI
  exécute les mêmes contrôles qu'en local.
- **Constaté** : `.drwil/ia-first.json` → `ciFiles: [".gitlab-ci.yml"]`,
  un fichier inexistant (reliquat du portage depuis run-box-v2, qui
  était sur GitLab) — le dépôt possède pourtant déjà
  `.github/workflows/ia-first.yml`, livré par `apply()` et actif, mais
  jamais déclaré donc jamais vérifié par `.githooks/run-checks.mjs`
  (`.githooks/check-control-coverage.mjs` passait silencieusement, sans rien
  vérifier, faute de trouver le fichier déclaré).
- **Risque encouru** : une régression locale non détectée pouvait être
  poussée sans filet CI réel (fausse confiance : le contrôle « passait »
  sans rien tester).
- **Correctif appliqué** : `ciFiles` pointe maintenant sur
  `.github/workflows/ia-first.yml`. Preuve : `.githooks/check-control-coverage.mjs`
  vérifie désormais réellement les jobs du workflow GitHub (0 erreur).

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

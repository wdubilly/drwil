# Projet : suites du kit portable (points restés ouverts)

**Statut** (2026-10-04) : en cours — points 5, 6, 8 et 9 traités (via le projet
d'extraction IA-first, voir `docs/projets/extraction-ia-first-run-box.md`) ;
point 1 livré (matrice CI), à confirmer vert sur le run déclenché par ce
commit ; restent 2, 3, 7.

## 1. Contexte

Le 2026-10-03, le kit (`packages/drwil/`) est passé en Node seul, avec
`--tools`, `--ci`, `--lang fr|en` et la détection de stack ; ses tests
(`npm test` dans le paquet) passent sous Linux. Les points ci-dessous sont
restés ouverts à la fin de ce travail.

## 2. Points ouverts

1. **Windows et macOS** — [IA] Le code n'utilise rien de propre à Linux
   (Node, `sh` de Git pour le hook), mais rien n'a été testé ailleurs.
   Sortie : `npm test` vert sur Windows (Git for Windows) et macOS, idéalement
   via une matrice CI. **Lot livré le 2026-10-04** : job `kit-tests` ajouté à
   `.github/workflows/ia-first.yml` (matrice `ubuntu-latest`,
   `windows-latest`, `macos-latest`, `npm test --workspace packages/drwil`) ;
   job `checks` (suite complète, dépend de gitleaks) laissé ubuntu seul.
   Deux bugs de portabilité trouvés et corrigés en route : (a) le script
   `test` de `packages/drwil/package.json` passait un glob shell
   (`test/*.test.mjs`) jamais expansé par `cmd.exe` sous Windows — remplacé
   par `node --test` (découverte automatique, cross-plateforme) ; (b) le
   job `checks` n'a jamais installé les dépendances (`npm ci` manquant),
   si bien que tous les runs CI de ce dépôt échouaient depuis leur mise en
   place (constaté sur les 11 derniers runs, tous en échec) — corrigé en
   ajoutant `npm ci` avant `node .githooks/run-checks.mjs`.
   Résultat du run CI déclenché par ce commit à vérifier après le push (voir
   section Reprise).
2. **Cursor et Copilot** — [humain] Vérifier dans ces outils qu'ils lisent bien
   les fichiers de renvoi générés (.cursor/rules/ia-first.mdc et
   .github/copilot-instructions.md dans les projets générés).
3. **Mise à jour depuis une ancienne version** — [IA] `init` ne supprime pas
   les fichiers obsolètes d'une version précédente du kit (anciens .py et
   .sh de .githooks/) ; le nettoyage a été fait à la main sur
   drwil_test_app. Piste : une liste des fichiers retirés par version, que
   `init` supprime s'ils sont identiques au modèle d'origine.
4. **Nom du projet par défaut** — validé le 2026-10-03 : sans `--name`, le
   nom est celui du dossier.
5. **Contrôles du dépôt drwil lui-même** — [IA] fait le 2026-10-04 : kit
   appliqué réellement à drwil (voir `docs/projets/extraction-ia-first-run-box.md`,
   section Reprise). Testé d'abord sur copie jetable (`/tmp`), bug du kit
   trouvé et corrigé en chemin (regex Statut/Reprise trop strictes),
   ~65 citations nettoyées dans la fiche d'extraction, 5 contrats socle
   ajoutés à `docs/contrats.md` (SEC-006, SEC-007, QUA-011, QUA-015,
   QUA-016). `.githooks/pre-commit` réellement actif depuis ce commit
   (`check-docs` : 0 erreur, 5 avertissements QUA-016 non bloquants sur du
   code legacy hors fiche — `scripts/garde-fou-bash.py`, anciens `.githooks/*.py`).
6. **`node_modules/` indexé dans git** — fait le 2026-10-04. `.gitignore`
   créé à la racine (dépendances, produits de build, journaux, `.env`) et
   `node_modules/`, `packages/drwil/dist/` et `*.tsbuildinfo` retirés
   de l'index. `dist/` est ignoré car régénéré par `tsc --build` ; s'il doit
   figurer dans le paquet publié, le construire à la publication (point 7).
7. **Publication npm** — [décision] Voir `docs/intentions/packager-kit-ia-first.md`.
   À vérifier en plus : les dossiers `.githooks`, `.github`, `.cursor` et
   `.claude` des modèles doivent bien finir dans le paquet publié.

8. **Faux positifs et écarts relevés par check-docs.mjs** — [IA] corrigé le
   2026-10-04 (lot 2 du projet d'extraction, voir
   `docs/projets/extraction-ia-first-run-box.md`) : `.githooks/check-docs.mjs` ne
   prend plus pour un chemin une citation sans extension hors des préfixes
   connus (ex. « minimal/complet », « init/apply »), test de non-régression
   ajouté. Vérifié une fois le point 5 fait : les deux manques
   (`docs/architecture.md`, `.claude/skills/`) sont désormais livrés par
   `apply()` ; les chemins relatifs au paquet dans
   `docs/projets/extraction-ia-first-run-box.md` ont été corrigés (préfixés
   vers leur vrai emplacement dans `packages/drwil/`).

9. **Aucun `.gitignore` dans les modèles du kit** — [IA] corrigé le
   2026-10-04 (lot 1 du projet d'extraction) : `templates/common/base/`
   fournit maintenant `.gitignore` et `.env.example`, générés par `init`.
   Vérifié : `init` sur un dépôt neuf, `git status` ne montre ni
   `node_modules/` ni produit de build.

## 3. Reprise

- **Dernier état** (2026-10-04) : points 5, 6, 8 et 9 traités. Point 5 : kit
  appliqué réellement à drwil, `.githooks/pre-commit` actif, premier vrai
  commit passé (0 erreur `check-docs`). Point 1 : job `kit-tests` (matrice
  Windows/macOS/Linux) ajouté à `.github/workflows/ia-first.yml`, à vérifier
  vert sur le run déclenché par ce commit (lien à ajouter une fois constaté).
  Points 2, 3, 7 restent ouverts.
- **Prochaine étape** : [humain] constater le résultat du run CI
  déclenché par ce commit (3 OS verts pour clore le point 1) ; sinon, au
  choix du demandeur parmi les points 2 (Cursor/Copilot), 3 (migration
  d'ancienne version) ou 7 (publication npm).

# Projet : suites du kit portable (points restés ouverts)

**Statut** (2026-10-04) : en cours — points 6, 8 et 9 traités (via le projet
d'extraction IA-first, voir `docs/projets/extraction-ia-first-run-box.md`) ;
le point 5 (appliquer le kit à drwil) couvre aussi le reliquat du point 8.

## 1. Contexte

Le 2026-10-03, le kit (`packages/kit-ia-first/`) est passé en Node seul, avec
`--tools`, `--ci`, `--lang fr|en` et la détection de stack ; ses tests
(`npm test` dans le paquet) passent sous Linux. Les points ci-dessous sont
restés ouverts à la fin de ce travail.

## 2. Points ouverts

1. **Windows et macOS** — [IA] Le code n'utilise rien de propre à Linux
   (Node, `sh` de Git pour le hook), mais rien n'a été testé ailleurs.
   Sortie : `npm test` vert sur Windows (Git for Windows) et macOS, idéalement
   via une matrice CI.
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
5. **Contrôles du dépôt drwil lui-même** — [IA] Son propre `.githooks/` contient
   encore les anciens scripts qui ne vérifient rien : ses contrôles « passent »
   sans rien prouver (QUA-013). Piste : appliquer le kit à drwil.
6. **`node_modules/` indexé dans git** — fait le 2026-10-04. `.gitignore`
   créé à la racine (dépendances, produits de build, journaux, `.env`) et
   `node_modules/`, `packages/kit-ia-first/dist/` et `*.tsbuildinfo` retirés
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
   ajouté. Restent à vérifier une fois le point 5 fait (kit appliqué à
   drwil) : les deux vrais manques relevés (docs/architecture.md,
   .claude/skills/) et les chemins relatifs au paquet dans
   `docs/intentions/packager-kit-ia-first.md`.

9. **Aucun `.gitignore` dans les modèles du kit** — [IA] corrigé le
   2026-10-04 (lot 1 du projet d'extraction) : `templates/common/base/`
   fournit maintenant `.gitignore` et `.env.example`, générés par `init`.
   Vérifié : `init` sur un dépôt neuf, `git status` ne montre ni
   `node_modules/` ni produit de build.

## 3. Reprise

- **Dernier état** (2026-10-04) : points 6, 8 et 9 traités, dans le cadre du
  projet d'extraction IA-first (`docs/projets/extraction-ia-first-run-box.md`,
  lots 1 et 2 terminés). Points 1, 2, 3, 5, 7 restent ouverts.
- **Prochaine étape** : le point 5 (contrôles du dépôt drwil, QUA-013) —
  reste le plus proche du projet d'extraction en cours (son lot 8, « preuve
  rien perdu », l'exigera de toute façon).

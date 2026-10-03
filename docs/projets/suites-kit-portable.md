# Projet : suites du kit portable (points restés ouverts)

**Statut** : en cours — point 6 fait le 2026-10-04, point 9 ouvert le même jour ; 8 points restants.

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

8. **Faux positifs et écarts relevés par check-docs.mjs** — [IA] Lancé sur
   drwil le 2026-10-03, il signale 14 erreurs :
   - des faux positifs : une alternative écrite avec une barre oblique entre
     backticks (« minimal/full », « init/apply ») est prise pour un chemin ;
   - des chemins relatifs au paquet plutôt qu'à la racine dans
     `docs/intentions/packager-kit-ia-first.md` (dist/, templates/, bin/) ;
   - deux vrais manques dans le `AGENTS.md` de drwil : docs/architecture.md
     et .claude/skills/ n'existent pas.
   Pistes : n'exiger que les citations qui ressemblent à un fichier ou à un
   dossier connu, et corriger les citations de drwil.

9. **Aucun `.gitignore` dans les modèles du kit** — [IA] Relevé le 2026-10-04
   en traitant le point 6 : `packages/kit-ia-first/templates/` ne fournit pas
   de `.gitignore`, donc chaque dépôt créé par `init` reproduit le défaut
   corrigé ici (dépendances et produits de build indexés). Piste : un modèle
   commun (`node_modules/`, journaux, `.env` sauf exemple) complété par la
   détection de stack pour les produits de build propres à chaque pile.
   Critère de sortie : après un `init` sur un dépôt neuf, un `git status`
   ne montre ni dépendance ni produit de build.

## 3. Reprise

- **Dernier état** (2026-10-04) : point 6 traité (`.gitignore` créé,
  `node_modules/` et `dist/` désindexés). Les autres points restent entiers.
- **Prochaine étape** : le point 5 (contrôles du dépôt drwil, QUA-013).

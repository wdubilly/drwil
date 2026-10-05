# Projet : suites du kit portable (points restés ouverts)

**Statut** (2026-10-05) : en cours — points 5, 6, 8 et 9 traités (via le projet
d'extraction IA-first, voir `docs/projets/extraction-ia-first-run-box.md`) ;
point 1 livré et confirmé vert sur les 3 OS (run CI `37238852012`) ; point 3
livré ; restent 2, 7.

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
   Run suivant (`37236350487`) : `checks` passe les 45 tests Node mais échoue
   sur `check-docs` (citation en backtick d'un fichier doc volontairement
   gitignored, `docs/projets/renommer-kit-en-drwil.md` — corrigé, backticks
   retirés) ; `kit-tests` échoue encore sur Windows et macOS, deux nouveaux
   bugs trouvés et corrigés : (c) `writeOut()`/`copyTree()` comparaient un
   chemin relatif à un préfixe POSIX (`.githooks/`) sans normaliser les
   séparateurs — `path.relative()` rend des `\` sous Windows, si bien
   qu'aucun fichier de `.githooks/` n'était jamais réécrit par un second
   `init()` (`packages/drwil/src/index.ts`, nouvelle fonction `relPosix()`) ;
   (d) deux assertions de test comparaient le bit d'exécution Unix
   (`mode & 0o100`) de `pre-commit`/`pre-push`, qui n'existe pas sur NTFS
   (`chmod` y est un no-op) — le test les saute désormais sous Windows
   (`packages/drwil/test/kit.test.mjs`, fonction `executable()`) ; (e) le
   hook `.claude/hooks/rappel-cadrage.mjs` calculait sa racine à partir du chemin du
   script (`import.meta.url`), que macOS réécrit via le lien symbolique
   `/var` → `/private/var` (tmp CI) — la comparaison avec le chemin reçu du
   tool Claude Code (non résolu) ratait alors systématiquement et rendait le
   hook silencieux ; une première correction (racine = `process.cwd()`)
   s'est révélée insuffisante — `process.cwd()` résout aussi les liens
   symboliques (confirmé en reproduisant le symlink en local sur Linux). Le
   vrai correctif résout en `realpath` le premier ancêtre existant des deux
   chemins avant de les comparer (le fichier visé par un `Write` n'existe pas
   encore). Reproduit et vérifié corrigé localement (dossier project
   symlinké, `init()` réel, hook appelé en sous-processus).
   Run suivant (`37237345116`) : `checks`, `kit-tests (ubuntu-latest)` et
   `kit-tests (macos-latest)` verts ; Windows seul encore rouge, nouveaux
   bugs trouvés : (f) le test du tableau de bord construisait un chemin avec
   `new URL(...).pathname`, qui sur Windows garde le `/` devant la lettre de
   lecteur (`/D:/...`) — remplacé par `fileURLToPath()` (fait pour ça,
   portable) ; (g) `realpathAncetre()` du hook (bug (e) ci-dessus) découpait
   le chemin à la main avec `lastIndexOf("/")`, qui ne trouve rien sur un
   chemin à `\` — remplacé par `path.basename()`/`dirname()` ; (h)
   `.githooks/check-file-size.mjs` affichait les chemins avec `\` (non comparables aux
   plafonds hérités, écrits en `/`) — normalisé. Un échec sur ce run reste
   inexpliqué (QUA-016 bloquant : le tout premier commit, qui ne devrait
   déclencher aucun rappel de cadrage, est pourtant refusé) ; à investiguer
   sur le prochain run une fois (f)(g)(h) poussés.
   Run suivant (`37237787471`) : `checks`, `kit-tests (ubuntu-latest)` et
   `kit-tests (macos-latest)` toujours verts ; Windows encore rouge mais
   seulement 2 échecs restants (QUA-016 bloquant et le hook
   garde-fou-bash/rappel-cadrage), cause trouvée dans les deux : (i)
   `.claude/hooks/rappel-cadrage.mjs` faisait `import(\`file://${chemin}\`)`
   à la main pour charger `.githooks/cadrage.mjs` — un chemin Windows (`D:\a\...`)
   collé après `file://` n'est pas une URL de fichier valide, l'import lève
   et le hook, dont les erreurs sont toutes avalées (« jamais casser »),
   rend silencieusement une sortie vide ; (j) le point d'entrée CLI des deux
   hooks (`.claude/hooks/rappel-cadrage.mjs` et `.claude/hooks/garde-fou-bash.mjs`) comparait
   `import.meta.url` à `` `file://${process.argv[1]}` `` à la main — même
   défaut, le hook ne s'exécutait jamais quand Claude Code l'invoque en
   sous-processus sous Windows. Les deux corrigés avec `pathToFileURL()`
   (node:url), seule façon portable de construire une URL de fichier.
   Au passage, ajout de la sortie réelle de la commande (stdout+stderr) dans
   le message d'assertion du test QUA-016 pour ne plus dépendre d'un message
   statique si un échec Windows revient.
   Run suivant (`37238176466`) : les deux hooks Claude Code corrigés — ne
   reste qu'un seul échec Windows (QUA-016, premier commit refusé), et la
   sortie réelle capturée cette fois montre la cause : les 11 fichiers
   listés dans le bloc `cadrage` de `mecanique-ia-first.md` sont TOUS
   signalés « hors de toute fiche », comme si ce bloc n'existait pas.
   Cause : (k) les runners Windows de GitHub Actions font le `git checkout`
   avec `core.autocrlf=true` par défaut (aucun `.gitattributes` dans ce
   dépôt pour l'en empêcher), donc tous les fichiers .md sont récupérés en
   CRLF ; `.githooks/cadrage.mjs` -> `BLOC_RE` attendait un `\n` strict juste après
   `cadrage`, qui ne matche jamais un `<!-- cadrage\r\n` — le bloc entier
   ne se lit plus, zéro motif, zéro fichier couvert. Corrigé en acceptant
   un `\r` optionnel avant le `\n` de cette regex (`\r?\n`) ; vérifié avec
   un texte CRLF construit à la main (`lireBloc()` retrouve bien son motif).
   Run suivant (`37238482363`) : le premier commit passe enfin, mais le même
   test échoue plus loin (`assert.equal` de la 3ᵉ étape, « 1 !== 0 ») :
   (l) le test attache scripts/tache.mjs à la fiche
   `entretien-courant.md` via `.replace("fichiers:\n-->", ...)`, un `\n`
   littéral — sur un checkout Windows (CRLF), le contenu lu est
   `"fichiers:\r\n-->"`, le replace ne trouve rien, la fiche n'est jamais
   modifiée et le commit reste refusé. Root cause commune aux bugs (k) et
   (l) : ce dépôt n'a jamais eu de `.gitattributes`, donc les runners
   Windows de GitHub Actions font leur `git checkout` avec
   `core.autocrlf=true` (réglage par défaut de l'image), qui convertit tout
   fichier texte en CRLF — tout code qui compare un contenu lu sur un `\n`
   littéral (regex ou `.replace()`) est silencieusement cassé.
   Corrigé à la racine : ajout d'un `.gitattributes` (`* text=auto
   eol=lf`), qui force le LF au checkout quel que soit l'OS ou la
   configuration locale de `core.autocrlf` — plus robuste qu'un correctif
   au cas par cas dans chaque script.
   Tests locaux 40/40 verts après ces 5 corrections ; **confirmé** par le
   run CI `37238852012` : `checks`, `kit-tests (ubuntu-latest)`,
   `kit-tests (macos-latest)` et `kit-tests (windows-latest)` tous verts.
   Point livré.
2. **Cursor et Copilot** — [humain] Vérifier dans ces outils qu'ils lisent bien
   les fichiers de renvoi générés (.cursor/rules/ia-first.mdc et
   .github/copilot-instructions.md dans les projets générés).
3. **Mise à jour depuis une ancienne version** — [IA] **livré le
   2026-10-05** : `init`/`apply` lisent désormais l'ancien manifeste
   (.drwil/fichiers-installes.json) avant d'écrire, et suppriment après
   coup les fichiers de `.githooks/` qui n'existent plus dans le template
   actuel — seulement s'ils n'ont jamais été modifiés depuis l'installation
   (empreinte sha256 inchangée) ; un fichier modifié est conservé et
   simplement ignoré. Mécanisme partagé avec la commande `uninstall`
   (condensée dans `docs/projets/journal.md`, entrée du même jour) :
   nouveau paramètre `attendus` threadé dans `writeOut()`/`copyTree()`/`scaffold()` pour
   enregistrer tous les chemins cibles du template actuel (indépendamment de
   la politique d'écrasement, qui ne réécrit jamais `.githooks/` déjà
   présent — piège trouvé en chemin : comparer l'ancien manifeste au
   `manifest` local de `scaffold()` aurait supprimé à tort tous les fichiers
   `.githooks/` déjà installés, puisqu'ils n'apparaissent dans ce `manifest`
   que s'ils ont été réellement (ré)écrits lors de cette exécution).
   `docs/projets/`, `docs/intentions/`, `docs/recettes/` (et équivalents
   anglais) jamais touchés. Tests ajoutés dans
   `packages/drwil/test/kit.test.mjs` ; `npm test` : 46/46 verts.
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

- **Dernier état** (2026-10-05) : points 5, 6, 8 et 9 traités. Point 5 : kit
  appliqué réellement à drwil, `.githooks/pre-commit` actif, premier vrai
  commit passé (0 erreur `check-docs`). Point 1 : job `kit-tests` (matrice
  Windows/macOS/Linux) ajouté à `.github/workflows/ia-first.yml`, confirmé
  vert sur les 3 OS (run `37238852012`). Point 3 : livré (voir détail
  ci-dessus). Points 2, 7 restent ouverts.
- **Prochaine étape** : [humain] au choix du demandeur parmi les points 2
  (Cursor/Copilot) ou 7 (publication npm).

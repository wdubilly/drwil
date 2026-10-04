# Recette : adopter le kit sur un projet existant

Objectif : après `apply` (stack et couches détectées, mécanique installée,
rien d'écrasé), faire vivre le kit sur un projet qui a déjà du code. Chaque
choix ci-dessous est une **`[décision]`** : proposer, jamais trancher à la
place du demandeur (`AGENTS.md`, section Conduite).

1. **Relire la stack détectée** (`.drwil/ia-first.json`) : couches, outils,
   CI. Corriger si `apply` s'est trompé.
2. **Remplir les `AGENTS.md` de couche** (un par entrée de `layers`) :
   Contexte, Pièges des tests, Contrats de la couche, Charte et recettes,
   Vérifier — à partir du code existant, pas de généralités.
3. **Déclarer les contrôles de la pile** dans `.drwil/ia-first.json` →
   `checks` (lint, typecheck, tests, build…) : chacun un `name` et un `run`,
   lancés par `node .githooks/run-checks.mjs` et au commit.
4. **Proposer les contrats du catalogue** (`docs/catalogue-contrats.md`) un
   par un, avec leur contrôle type : le demandeur garde `[décision]` d'en
   adopter ou non chacun. Un contrat adopté : sa ligne migre du catalogue au
   registre du projet (`docs/contrats.md`), avec son contrôle réellement
   câblé (pas une promesse) :
   - `catalogue:QUA-001` (taille de fichier) : `.githooks/check-file-size.mjs`
     est déjà livré par le kit (opt-in) — ne reste qu'à le déclarer dans
     `checks` avec la racine et le plafond choisis par le demandeur.
   - `catalogue:QUA-014` (contraste) : copier
     `templates/common/optional/front-quality/` (voir son README) si un
     front est détecté, puis déclarer ses deux contrôles.
   - Les autres lignes du catalogue n'ont pas de script tout fait : proposer
     l'outil usuel de la pile détectée (lint, typecheck, couverture…).
5. **Vérifier** : `node .githooks/run-checks.mjs` vert, puis un commit par
   sujet (couche remplie, contrôle déclaré, contrat adopté) — jamais un
   commit fourre-tout.

Hors périmètre : réécrire le code existant pour le mettre aux normes — c'est
`docs/recettes/refactorer-sans-casser.md`, lancé ensuite, contrat par
contrat.

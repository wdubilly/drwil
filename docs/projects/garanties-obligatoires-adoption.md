# Projet : garanties obligatoires à l'adoption — couverture à 100 % et e2e

**Statut** : cadré le 2026-10-22 — rien de commencé.
**Risque** : HIGH
**Maturité** : à affiner

(cadrage : le livrable — le gabarit de `packages/drwil/templates/` —, pas
drwil-le-dépôt, QUA-018. Un seuil de couverture ne redescend jamais.)

<!-- scope
files:
  - packages/drwil/src/index.ts
  - packages/drwil/src/stack.ts
  - packages/drwil/src/guarantees.ts
  - packages/drwil/src/verify.ts
  - packages/drwil/src/i18n.ts
  - packages/drwil/test/guarantees.test.mjs
  - packages/drwil/templates/common/base/.githooks/briefs.mjs
  - packages/drwil/templates/common/base/docs/contracts-catalog.md
  - packages/drwil/templates/common/base/docs/recipes/adopt-the-kit.md
  - packages/drwil/templates/common/tools/claude/.claude/skills/adopt-the-kit/SKILL.md
  - docs/contracts.md
  - .drwil/ia-first.json
  - docs/architecture.md
  - packages/drwil/CHANGELOG.md
-->

(périmètre : la commande des garanties et son code, la détection de pile
réutilisée, la prise en compte dans `verify` et dans l'ordre des fiches, ses
tests, le catalogue, la recette et le skill d'adoption, le registre et la
carte ; à compléter au lancement si le découpage du code l'exige — élargir
coûte un commit séparé.)

## 1. Besoin

Le demandeur veut que drwil **garantisse** la qualité de tout ce qu'un agent
génère, pour toute pile et tout projet, sans exception (2026-10-22) : une
couverture de test à 100 % dès le départ d'une pile neuve, et un test de bout
en bout (e2e) des chemins critiques. Sans cela, la promesse de qualité de
drwil est creuse.

Obstacles aujourd'hui :
- `init` sur un dossier vide ne détecte **aucune pile** : elle n'existe qu'une
  fois choisie à l'étape 0 de `/drwil-adopt` ;
- le câblage du contrôle de couverture se fait à la main, pile par pile ;
- l'e2e (`catalog:QUA-020`) n'est qu'un objectif du catalogue, jamais exigé ;
- rien n'empêche de continuer à travailler quand l'outil d'une pile manque.

Principe retenu : le **contrat** est universel, seule la **preuve** change
selon la techno. Une garantie est soit câblée et prouvée, soit une **fiche
bloquante** `[P0]` est créée automatiquement.

## Critères d'acceptation

(les contrats sont à créer au lancement, avec leur champ **Origine** ; IDs à
attribuer à ce moment-là dans le registre.)

- Une commande drwil, lancée par `/drwil-adopt` une fois la pile connue, câble
  dans `.drwil/ia-first.json` → `checks` le contrôle de couverture de chaque
  couche dont la pile est dans la table des outils, à 100 % lignes, branches,
  fonctions et instructions — contrat à créer
- Pour une couche dont l'outil de couverture est absent ou inconnu, la
  commande crée une fiche bloquante `[P0]` (`docs/projects/couverture-<couche>.md`)
  qui demande au demandeur de choisir l'outil ; tant qu'elle existe, `verify`
  est en `FAIL` sur cette couche et `/drwil-start` ne propose qu'elle —
  contrat à créer
- Le même mécanisme exige un e2e des chemins critiques (`catalog:QUA-020`) :
  une fiche bloquante `[P0]` demande au demandeur de nommer ces chemins, et
  ne se clôt que lorsqu'un test e2e rejoué par un contrôle les couvre —
  contrat à créer
- Aucune exception : pas de profil léger, pas de dérogation à ces garanties ;
  une exclusion de fichier (configuration, point d'entrée…) reste permise si
  elle est déclarée et justifiée dans le contrat de couverture du projet —
  contrat à créer
- Un outil de couverture non installable ou non lançable ne donne jamais un
  « passé » : la commande le dit, le contrôle reste « non exécuté » et la
  fiche bloquante est créée (QUA-013) — contrat à créer
- La recette d'adoption et le catalogue disent : projet neuf = 100 % et e2e
  d'emblée ; projet existant en dette = seuil bas, couverture du diff,
  cliquet — la recette ne se contredit plus — `QUA-011`
- [humain] Sur un dossier vide, une pile connue (Node/TypeScript d'abord) puis
  un premier test : le contrôle à 100 % passe, retirer le test le fait échouer ;
  sur une pile hors table, la fiche bloquante apparaît et bloque —
  contrat Manuel à créer, attesté par l'humain

## Contrats modifiés

- Entrée `catalog:QUA-004` du **gabarit livré** — ancien critère : « Test
  coverage does not drop below a declared threshold; on a project already in
  test debt […] diff coverage » — raison : y ajouter le cas du projet neuf
  (100 % d'emblée, obligatoire). Rien n'est retiré. (à valider par le
  demandeur au lancement)
- Entrée `catalog:QUA-020` du **gabarit livré** — ancien critère : « The
  project's critical paths are covered by an automated end-to-end test,
  replayed in CI » (présenté comme un objectif) — raison : elle devient une
  garantie obligatoire à l'adoption. (à valider par le demandeur au
  lancement)
- `QUA-004` du **dépôt drwil** : inchangé.

## 2. Hors périmètre

- Le 100 % du paquet `packages/drwil` lui-même : intention
  `docs/intentions/couverture-paquet-100.md`.
- Un projet **existant** adopté en dette de tests : seuil bas, couverture du
  diff et cliquet (recette `adopt-the-kit`, étape 4).
- La qualité des tests (un test qui ne vérifie rien) : une couverture à
  100 % garantit que chaque ligne est **exécutée** par un test, pas qu'elle
  est **correcte** — limite à écrire dans la recette.
- La publication sur npm.

## 3. Contraintes

- Une table de données (pile → outil, commande, métriques que l'outil sait
  mesurer), pas une implémentation par pile : ajouter une pile = une ligne.
- Un outil qui ne mesure qu'une partie des métriques (Go : instructions
  seulement) est dit tel quel, jamais présenté comme les quatre.
- Plusieurs couches dans un projet : une garantie par couche.
- Ce qui ne tourne pas dans un test (HTML, CSS, scripts) n'entre pas dans une
  couverture de lignes : le dire, le couvrir par l'e2e ou le déclarer exclu
  avec sa justification.
- Pas de contradiction avec l'objectif du 2026-10-11 (exigences adaptées au
  risque du produit) : ce chantier **tranche** que ces deux garanties sont
  hors de cette adaptation ; à reporter dans la décision P1 « profils par
  risque ».
- Code et messages de la commande en français et en anglais
  (`packages/drwil/src/i18n.ts`) ; aucun fichier de code au-dessus de 400
  lignes (QUA-001).
- Rien n'est écrasé : un `checks` déjà déclaré est signalé, pas remplacé.

## 4. Décisions

- 2026-10-22 (demandeur) : 100 % de couverture à tout démarrage de pile de
  zéro, sur lignes, branches, fonctions et instructions ; exclusions permises
  si déclarées et justifiées dans le contrat ; portée : recette, catalogue
  **et** câblage automatique ; moment : une commande drwil lancée par
  `/drwil-adopt` quand la pile est connue ; piles : toutes celles que `init`
  détecte.
- 2026-10-22 (demandeur) : outil d'une pile absent ou inconnu → fiche
  bloquante `[P0]` tant que la garantie n'est pas résolue ; l'e2e est exigé de
  la même manière ; **pour tout projet, sans exception** — c'est la garantie
  de drwil.

## 5. Lots

Un seul chantier : l'e2e est obligatoire au même titre que la couverture, donc
aucune release ne part avec l'une sans l'autre.

- **Lot 1 — couverture** : table des outils (Node/TypeScript, Python, Go, JVM
  d'abord ; toute autre pile passe par la fiche bloquante tant que sa ligne
  n'existe pas), commande de câblage à 100 %, fiche bloquante `[P0]`, prise en
  compte dans `verify`, l'ordre de `/drwil-start` et les commits de code de
  la couche.
- **Lot 2 — e2e obligatoire** : la fiche bloquante demande les chemins
  critiques ; le test est écrit avec l'outil de la pile (choix du demandeur) ;
  un seul contrôle le rejoue ; la fiche ne se clôt qu'une fois ce contrôle
  vert.
- **Lot 3 — documents** : recette, catalogue et skill d'adoption.

## 6. Reprise

- **Dernier état** (2026-10-22) : cadré ; recommandations de l'agent : blocage
  du verdict **et** des commits de code de la couche concernée (les commits de
  documents et de la fiche restent libres) ; table de départ Node/TypeScript,
  Python, Go, JVM ; e2e non automatisé par pile. À valider par le demandeur.
- **Avant « prêt »** : valider les recommandations ci-dessus ; valider la
  modification des entrées `catalog:QUA-004` et `catalog:QUA-020` ; reporter
  dans la décision P1 « profils par risque » que ces garanties sont hors de
  l'adaptation au risque.
- **Prochaine étape** : après ces validations, passer la maturité à « prêt ».

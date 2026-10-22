# Projet : 100 % de couverture dès le départ d'une pile neuve

**Statut** : cadré le 2026-10-22 — rien de commencé.
**Risque** : HIGH
**Maturité** : à affiner

(cadrage : le livrable — le gabarit de `packages/drwil/templates/` —, pas
drwil-le-dépôt, QUA-018 ; un seuil ne redescend jamais, cliquet.)

<!-- scope
files:
  - packages/drwil/src/index.ts
  - packages/drwil/src/stack.ts
  - packages/drwil/src/stack-coverage.ts
  - packages/drwil/src/i18n.ts
  - packages/drwil/test/stack-coverage.test.mjs
  - packages/drwil/templates/common/base/docs/contracts-catalog.md
  - packages/drwil/templates/common/base/docs/recipes/adopt-the-kit.md
  - packages/drwil/templates/common/tools/claude/.claude/skills/adopt-the-kit/SKILL.md
  - docs/contracts.md
  - .drwil/ia-first.json
  - docs/architecture.md
  - packages/drwil/CHANGELOG.md
-->

(périmètre : la commande de câblage et son code, la détection de pile
qu'elle réutilise, ses tests, le catalogue et la recette d'adoption, le
skill `/drwil-adopt`, le registre et la carte ; à compléter au lancement
si le découpage du code l'exige — élargir coûte un commit séparé.)

## 1. Besoin

Quand l'humain démarre une pile **de zéro**, il n'y a aucune dette de test
et l'agent écrit chaque test avec son code : le seuil de couverture peut être
à 100 % dès le premier commit, au lieu de la montée progressive que
conseillent aujourd'hui le catalogue (`catalog:QUA-004`) et la recette
d'adoption. Le demandeur le veut ainsi (2026-10-22).

Deux obstacles aujourd'hui :
- `init` sur un dossier vide ne détecte **aucune pile** : elle n'existe qu'une
  fois choisie à l'étape 0 de `/drwil-adopt` ;
- le câblage du contrôle de couverture est écrit à la main, pile par pile,
  par l'agent.

## Critères d'acceptation

(les contrats sont à créer au lancement, avec leur champ **Origine** ;
IDs à attribuer à ce moment-là dans le registre.)

- Une commande drwil, lancée par `/drwil-adopt` une fois la pile connue,
  câble dans `.drwil/ia-first.json` → `checks` le contrôle de couverture de
  **chaque pile que `init` sait détecter**, à 100 % lignes, branches,
  fonctions et instructions — contrat à créer
- Le 100 % d'un projet neuf ne redescend jamais ; une exclusion
  (configuration, point d'entrée…) n'est acceptée que si elle est déclarée et
  justifiée dans le contrat de couverture du projet — contrat à créer
- Une pile dont l'outil de couverture n'est pas installable ou lançable
  n'est pas câblée en silence : la commande le dit, le contrôle reste
  « non exécuté », jamais « passé » (QUA-013) — contrat à créer
- La recette d'adoption et le catalogue disent : projet neuf = 100 % d'emblée ;
  projet existant en dette = seuil bas, couverture du diff, cliquet — la
  recette ne se contredit plus — `QUA-011`
- [humain] Sur un dossier vide, une pile choisie (Node/TypeScript d'abord)
  puis un premier test : le contrôle à 100 % passe, et retirer le test le
  fait échouer — contrat Manuel à créer, attesté par l'humain

## Contrats modifiés

- `QUA-004` (seuil de couverture de test) du **dépôt drwil** : inchangé. Ce
  chantier ne touche que l'entrée `catalog:QUA-004` du gabarit livré : ancien
  critère : « Test coverage does not drop below a declared threshold; on a
  project already in test debt […] diff coverage » — raison : y ajouter le cas
  du projet neuf (100 % d'emblée). Rien n'est retiré. (à valider par le
  demandeur au lancement)

## 2. Hors périmètre

- Le 100 % du paquet `packages/drwil` lui-même : intention
  `docs/intentions/couverture-paquet-100.md`.
- Un projet **existant** : le seuil y reste choisi par le demandeur, bas
  d'abord (recette `adopt-the-kit`, étape 4).
- La qualité des tests (un test qui ne vérifie rien) : `catalog:QUA-020`
  (tests de bout en bout) et les contrats métier `APP`.
- La publication sur npm.

## 3. Contraintes

- Une implémentation de câblage **par pile** (outil de couverture, commande,
  fichier de configuration) : Node (c8 ou outil du test runner), Python
  (pytest-cov), JVM (JaCoCo), Go (`go test -cover`), Rust, PHP, Ruby,
  .NET, Dart… à lister précisément au lancement.
- Métriques à 100 % : lignes, branches, fonctions, instructions (outil de la
  pile qui n'en mesure qu'une partie : le dire, ne jamais prétendre le
  reste).
- Code et messages de la commande en français et en anglais (`packages/drwil/src/i18n.ts`) ;
  aucun fichier de code au-dessus de 400 lignes (QUA-001) : un module par
  groupe de piles si besoin.
- Rien n'est écrasé : un `checks` déjà déclaré est signalé, pas remplacé.

## 4. Décisions

- 2026-10-22 (demandeur) : 100 % de couverture à tout démarrage de pile de
  zéro ; lignes, branches, fonctions et instructions ; exclusions permises si
  déclarées et justifiées dans le contrat ; portée : recette, catalogue **et**
  câblage automatique par pile ; moment : une commande drwil lancée par
  `/drwil-adopt` quand la pile est connue ; piles : toutes celles que `init`
  détecte.

## 5. Lots

(à affiner au lancement : l'ordre proposé est la commande et le cadre commun
avec Node/TypeScript, puis les autres piles par groupes, puis recette,
catalogue et skill.)

## 6. Reprise

- **Dernier état** (2026-10-22) : cadré ; maturité « à affiner » — le détail
  par pile (outil, commande, limites) reste à écrire avant le lancement.
- **Prochaine étape** : lister, pile par pile, l'outil de couverture et ses
  limites, puis passer la maturité à « prêt ».

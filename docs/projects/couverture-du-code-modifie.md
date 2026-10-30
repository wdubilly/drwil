# Projet : le code modifié arrive couvert à 100 %

**Statut** : cadré le 2026-10-30 — rien de commencé.
**Risque** : HIGH
**Maturité** : prêt
**Intention** : `docs/intentions/couverture-paquet-100.md` (section « tout code modifié arrive couvert à 100 % »)

<!-- scope
files:
  - packages/drwil/templates/common/base/.githooks/check-diff-coverage.mjs
  - .githooks/check-diff-coverage.mjs
  - .githooks/check-diff-coverage.test.mjs
  - .drwil/ia-first.json
  - .github/workflows/ia-first.yml
  - packages/drwil/templates/common/ci/github/*.yml
  - docs/contracts.md
  - docs/contracts-catalog.md
  - docs/architecture.md
  - docs/projects/kit-mechanics.md
  - packages/drwil/test/kit.test.mjs
-->

(cadrage : le contrôle livré et sa copie du dépôt, son test, sa
déclaration et son câblage CI, le registre et le catalogue, la carte et
la mécanique du kit. Ce chantier passe après `adopter-seuil-couverture`
(qui crée la mesure complète) : les deux touchent `docs/contracts.md` et
`.drwil/ia-first.json`, l'un après l'autre.)

## 1. Besoin

Un projet existant qui adopte drwil a souvent une couverture basse. Un seuil
global élevé le bloquerait dès le premier jour ; un seuil bas
(`catalogue:QUA-004`, seuil de couverture de test) laisse entrer du code neuf
non testé tant que la moyenne tient. Le demandeur veut exiger 100 % sur ce
qui change : le code ancien garde son niveau, tout ce qui est écrit ou
modifié arrive couvert, et la couverture globale monte d'elle-même.

## Critères d'acceptation

(le contrat est à créer au lancement, avec son champ **Origine** ; ID à attribuer à ce moment-là dans le registre, après vérification qu'il est libre au catalogue.)

- Les lignes ajoutées ou modifiées d'une branche, et les branches qu'elles
  ouvrent, sont couvertes à 100 % d'après le rapport lcov du projet ; une
  ligne ou une branche non couverte fait échouer le contrôle — contrat à créer
- Une exclusion (code généré, configuration, ligne non testable) n'est
  admise que déclarée avec sa justification dans `.drwil/ia-first.json` ;
  sans justification, elle est refusée — contrat à créer
- Sans rapport lcov, le contrôle est signalé non exécuté, jamais passé —
  contrat à créer
- Ce dépôt applique le contrôle à ses propres branches, en plus du cliquet
  de seuils — contrat à créer

## Contrats modifiés

(aucun : `QUA-004` n'est pas touché, le contrôle du diff le complète.)

## 2. Hors périmètre

- La mesure complète et le cliquet des seuils :
  `docs/projects/adopter-seuil-couverture.md`.
- Le 100 % du paquet entier : `docs/intentions/couverture-paquet-100.md`.
- Les profils par risque du catalogue (`docs/intentions/catalogue-cycle-de-vie.md`) :
  le contrat entre au catalogue actuel et migrera avec les autres.
- Une pile sans outil de couverture : le contrôle n'invente pas de rapport.

## 3. Contraintes

- Indépendant de la pile : le contrôle lit un rapport lcov, que produit
  l'outil de couverture de chaque pile ; le projet déclare la commande
  qui le produit, comme ses autres contrôles (`.drwil/ia-first.json`).
- Au push et en CI, pas au commit : la PR entière est jugée avant fusion,
  sans ralentir chaque commit.
- La base du diff est celle de la branche (`git diff <base>...HEAD`).
- Un fichier de code à 200 lignes au plus (plafond du kit) : lecture du
  lcov, lecture du diff et verdict en fonctions séparées.
- Proposé à l'adoption comme les autres contrats du catalogue, refusable.

## 4. Décisions

- 2026-10-30 (demandeur) : « modifié » = lignes ajoutées ou modifiées et
  les branches qu'elles ouvrent (plus strict que les lignes seules).
- 2026-10-30 (demandeur, recommandation de l'agent acceptée) : exclusions
  déclarées avec justification.
- 2026-10-30 (demandeur, recommandation de l'agent acceptée) : sans rapport
  lcov, contrôle non exécuté signalé (QUA-013, contrôle non exécuté n'est
  pas passé).
- 2026-10-30 (demandeur, recommandation de l'agent acceptée) : ce dépôt
  adopte le contrôle dès ce chantier, en plus de son cliquet.

## 5. Lots

- **Lot 1 — le contrôle** : lecture de l'lcov et du diff, verdict sur lignes
  et branches, exclusions justifiées, test du contrôle, livré au gabarit et
  copie du dépôt.
- **Lot 2 — câblage et adoption** : déclaration dans `.drwil/ia-first.json`,
  étape de CI et de push, contrat au registre et au catalogue,
  carte et mécanique du kit à jour.

## 6. Reprise

- **Dernier état** (2026-10-30) : cadré ; rien de commencé.
- **Prochaine étape** : lancer le lot 1 une fois `adopter-seuil-couverture`
  clos et fusionné.

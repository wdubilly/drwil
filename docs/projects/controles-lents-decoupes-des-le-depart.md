# Projet : un contrôle lent est découpé en tranches dès sa déclaration, chez tout adoptant

**Statut** : cadré le 2026-11-09 ; décisions D1 à D6 tranchées le 2026-11-09 ; relu et rangé en 0.11.2 le 2026-11-11 (chantier 4 sur 8) ; D1 et D6 revues le 2026-11-20 : N calculé à chaque CI (`shards: "auto"`), plus jamais figé.
**Risque** : HIGH
**Maturité** : prêt
**Intention** : `docs/intentions/notes.md` (note du 2026-11-09 « Rendre le découpage en tranches systématique pour l'adoptant ») ; suite de `docs/intentions/essais-reels-en-attente.md` (partie « ex-ci-rapide-epreuves-reelles »)

<!-- scope
files:
  - packages/drwil/src/guarantees-e2e-tools.ts
  - packages/drwil/src/guarantees-briefs.ts
  - packages/drwil/src/guarantees.ts
  - packages/drwil/src/guarantees-layers.ts
  - packages/drwil/src/guarantees-texts.ts
  - packages/drwil/src/doctor.ts
  - packages/drwil/src/doctor-shards.ts
  - packages/drwil/src/doctor-texts.ts
  - packages/drwil/test/guarantees.test.mjs
  - packages/drwil/test/shards-proposal.test.mjs
  - packages/drwil/templates/common/base/docs/contracts-catalog.md
  - packages/drwil/CHANGELOG.md
  - docs/contracts.md
  - docs/architecture.md
  - .drwil/ia-first.json
  - packages/drwil/templates/common/base/.githooks/engine-shards.mjs
  - packages/drwil/templates/common/base/.githooks/run-checks-shards.mjs
  - packages/drwil/templates/common/base/.githooks/engine-texts.mjs
  - .githooks/engine-shards.mjs
  - .githooks/engine-shards.test.mjs
  - .githooks/run-checks-shards.mjs
  - .githooks/run-checks-shards.test.mjs
  - .githooks/engine-texts.mjs
  - packages/drwil/test/ci-shards.test.mjs
-->

(Le bloc `scope` couvre le code du paquet, ses tests, le catalogue du gabarit, le registre et `.drwil/ia-first.json` où
chaque contrat créé déclare son contrôle. `packages/drwil/src/guarantees.ts` (183 lignes) et `packages/drwil/src/doctor.ts` (200 lignes) sont au plafond ou
proches : la table des outils e2e vit dans un nouveau module guarantees-e2e-tools et la proposition de `doctor` dans
un nouveau module doctor-shards, sans rien ajouter aux fichiers existants au-delà du branchement. Deux modules de plus : la carte
d'architecture les cite. Si l'implémentation montre qu'un autre fichier doit changer, l'élargissement sera un commit
séparé.)

## 1. Besoin

Le chantier `ci-lents-controles` (PR #393) a livré le réglage `shards: N` : un contrôle lent déclaré ainsi est joué par
N jobs parallèles en CI GitHub et GitLab. Mais le réglage est **facultatif et manuel** : l'adoptant doit penser à
l'écrire et trouver la commande de tranche de son outil. Un projet comme `drwil_walk` (e2e Playwright d'environ
10 minutes, CI de 800 à 1250 s) ne profite de rien tant qu'il ne l'a pas fait.

Or c'est drwil qui met en place le contrôle e2e chez l'adoptant : la garantie `catalog:QUA-020` est obligatoire à
l'adoption, et `npx drwil guarantees` écrit la fiche e2e-chemins-critiques, écrite dans le projet de l'adoptant, qui demande de nommer les
chemins critiques et l'outil e2e de la pile. Constat du cadrage (relevé le 2026-11-09) : cette fiche **ne déclare pas**
le contrôle `e2e` elle-même ; c'est le demandeur ou l'agent qui l'écrit ensuite, sans `shards`.

Le projet : que le contrôle e2e soit découpé dès sa déclaration pour un outil connu, que le nombre de tranches suive la
taille de la suite e2e à chaque CI (la suite grossit avec les chemins critiques), et que les projets déjà adoptés soient
corrigés, pas seulement avertis (demandeur, 2026-11-20).

## Critères d'acceptation

- Pour un outil e2e de la table du kit (Playwright, Vitest, Jest), `drwil guarantees` déclare lui-même le contrôle `e2e`
  dans `.drwil/ia-first.json`, avec `shards: "auto"` et la commande de tranche de l'outil lisant `DRWIL_SHARD_INDEX` et
  `DRWIL_SHARD_TOTAL`, et le setup de l'outil dans la commande — contrat à créer
- Avec `shards: "auto"`, le plan des tranches (`run-checks --shard-plan`, déjà joué à chaque CI GitHub et GitLab) compte
  les tests e2e par l'outil et fixe N (règle D6) à chaque CI ; la tranche et l'agrégation lisent ce N du plan ; sous 2,
  une seule passe ; un comptage impossible fait échouer le plan, jamais un succès (QUA-013) ; les YAML de CI livrés ne
  changent pas — contrat à créer
- Un contrôle `e2e` déjà déclaré par le projet à la main n'est jamais réécrit ; un outil e2e hors de la table n'est
  jamais découpé de force : le contrôle reste en une seule passe et la fiche de garantie le dit — contrat à créer
- `drwil doctor` signale un contrôle e2e d'un outil de la table déclaré sans `shards` ou avec un N figé, et donne la
  déclaration `"auto"` ; `drwil doctor --fix` et la mise à jour du kit la posent sur un contrôle que le kit a déclaré
  (forme exacte de sa déclaration), jamais sur un contrôle écrit ou modifié à la main — contrat à créer
- Un projet neuf et un projet adopté reçoivent la même déclaration (une seule table, une seule source) — contrat à créer

## Contrats modifiés

- `catalog:QUA-020` — ancien critère : le contrôle e2e est déclaré par le demandeur ou l'agent, sans découpage imposé —
  raison : le kit le déclare lui-même avec `shards: "auto"`, N suit la suite à chaque CI (validé par le demandeur le
  2026-11-20)
- `.githooks/engine-shards.mjs` et `.githooks/run-checks-shards.mjs` — `shards` accepte `"auto"` : N vient du plan de
  la CI, la tranche et l'agrégation le lisent du plan au lieu de la configuration (validé par le demandeur le
  2026-11-20)

## 2. Hors périmètre

- Écrire ou générer le test e2e lui-même : le demandeur nomme les chemins critiques, l'agent écrit le test.
- Modifier les YAML de CI livrés : le job de plan et les 16 tranches GitLab existent déjà ; seul le moteur apprend `"auto"`.
- Découper un outil hors de la table : le kit ne devine pas la commande de tranche d'un outil qu'il ne connaît pas.
- Les autres pistes d'accélération, notées à part : mesure des durées par contrôle, équilibrage des tranches par durées
  historiques, annulation rapide du contrôle lent, `paths` calculés automatiquement, tests impactés.
- Réécrire un contrôle `e2e` écrit ou modifié à la main : `guarantees` le garde, `doctor` le signale avec la ligne à poser.

## 3. Contraintes

- QUA-018 (dépôt ou livrable) : livrable. Tout vit dans le paquet (`packages/drwil/`), jamais dans une copie installée.
- QUA-013 : un contrôle non exécuté n'est pas passé ; une déclaration découpée refusée par le moteur (commande qui ne
  cite pas `DRWIL_SHARD_INDEX`, N hors de 2 à 16) ne doit jamais être proposée.
- QUA-019 : rien ne contourne le moteur ; la proposition respecte ses règles de validation.
- Un fichier de code à 180 lignes ou plus est découpé (plafond 200) : `packages/drwil/src/guarantees.ts`, `packages/drwil/src/doctor.ts` (200 lignes, aucune place pour un import et un appel) et `packages/drwil/src/guarantees-briefs.ts` (197 lignes). Relu le 2026-11-11 : le lot 0 ci-dessous libère d'abord de la place dans `packages/drwil/src/doctor.ts` (modèle : `packages/drwil/src/doctor-upgrade.ts`), en commit séparé et sans changement de comportement.
- Fichiers partagés avec le chantier « un seul run de couverture » (`docs/projects/journal.md`) : `packages/drwil/src/guarantees-layers.ts`, `packages/drwil/src/doctor.ts`, `packages/drwil/test/guarantees.test.mjs`, `docs/contracts.md`, `.drwil/ia-first.json`. Les deux chantiers se jouent l'un après l'autre (une fusion avant le lancement du suivant) ; le premier fait le lot 0, le second le trouve fait.
- Textes en français et en anglais, comme les autres textes de `guarantees` et de `doctor`.

## 4. Décisions

Tranchées par le demandeur le 2026-11-09 (l'agent n'en a tranché aucune) :

- **D1 — qui écrit `shards`** : `guarantees` déclare lui-même le contrôle `e2e` après le choix de l'outil (option b).
  *Alternatives écartées* : le kit propose seulement (a) ; `doctor` pose après un oui en terminal (c). Conséquence : le
  kit écrit dans `.drwil/ia-first.json` ; il ne réécrit jamais un contrôle `e2e` écrit ou modifié à la main (même
  règle que les contrôles de couverture, « conservé »). **Revue le 2026-11-20** (demandeur) : `"auto"` au lieu d'un N, et
  le kit passe en `"auto"` un contrôle qu'il a lui-même déclaré (`doctor --fix`, mise à jour du kit).
- **D2 — nombre de tranches** : croissant avec le nombre de tests e2e (pas de N fixe).
- **D3 — table des outils e2e** : Playwright, Vitest et Jest ; Cypress hors table (pas de tranche native).
- **D4 — seuil de lenteur de `doctor`** : aucun ; tout contrôle e2e d'un outil connu, non découpé, est signalé. La
  mesure des durées reste une autre piste.
- **D5 — setup du job de tranche** : la déclaration inclut le setup (par exemple l'installation des navigateurs
  Playwright) dans la commande du contrôle ; aucune zone projet n'est ouverte dans le job `shards`.
- **D6 — règle de N (D2)** : N = nombre de tests e2e divisé par 5, arrondi au-dessus, borné de 2 à 16 (plafond du
  moteur) ; sous 2, le contrôle est déclaré sans `shards`. Le nombre de tests se lit par la liste des tests de chaque
  outil de la table. **Revue le 2026-11-20** (demandeur, option « calcul à chaque CI » contre « recalcul par le kit ») :
  N est calculé à chaque CI par le plan des tranches, jamais stocké ; il ne peut donc pas devenir trop petit quand la
  suite grossit.

## 5. Points à trancher

(aucun : D1 à D6 sont tranchées.)

## 6. Increments

- **Lot 0 — de la place dans `packages/drwil/src/doctor.ts`** [IA] : extraire un bloc de points existant vers un module voisin, sans changer
  le comportement (tests de `doctor` inchangés et verts avant et après) ; sauté si le chantier « un seul run de
  couverture » l'a déjà fait. Critère de sortie : `packages/drwil/src/doctor.ts` sous 190 lignes.

- **Lot 1 — `"auto"` dans le moteur** [IA] : `engine-shards` accepte `"auto"`, `--shard-plan` compte les tests et fixe N,
  tranche et agrégation lisent N du plan, comptage impossible en échec. Critère de sortie : tests `engine-shards`,
  `run-checks-shards` et `ci-shards` verts.
- **Lot 2 — la table des outils e2e et la déclaration** [IA] : le module guarantees-e2e-tools (outil, sonde, comptage des
  tests, commande de tranche et setup), `guarantees` déclare le contrôle `e2e` sans réécrire un contrôle existant, la
  fiche de garantie e2e le dit (français et anglais), cas d'un outil hors table. Critère de
  sortie : tests de `packages/drwil/test/guarantees.test.mjs` verts, contrats créés.
- **Lot 3 — l'avertissement de `doctor`** [IA] : le module doctor-shards, un point « Contrôle lent non découpé » qui lit la
  configuration, même table que le lot 2 ; `--fix` et la mise à jour du kit posent `"auto"` sur un contrôle déclaré par le
  kit. Critère de sortie : le test shards-proposal vert (N figé, sans `shards`, déjà `"auto"`, écrit à la main, outil
  hors table, contrôle absent).
- **Lot 4 — documentation** [IA] : CHANGELOG « Unreleased » (anglais), `docs/architecture.md`, catalogue du gabarit
  (`catalog:QUA-020`), contrats et leurs contrôles dans `.drwil/ia-first.json`.

## 7. Reprise

- **Dernier état** (2026-11-20) : D1 et D6 revues (N à chaque CI, correction des projets adoptés) ; rien d'implémenté.
- **Travail non commité** : cette fiche et sa ligne d'index.
- **Prochaine étape** : [IA] lot 1, au lancement de la fiche par le demandeur.

# Projet : la durée de la CI et le contexte relu, suivis comme des indicateurs

**Statut** : cadré le 2026-10-30 — rien de commencé.
**Risque** : HIGH
**Maturité** : prêt
**Intention** : `docs/intentions/suivi-ci-et-contexte.md`

<!-- scope
files:
  - packages/drwil/templates/common/optional/dashboard/dashboard.mjs
  - packages/drwil/templates/common/optional/dashboard/dashboard-read.mjs
  - .githooks/dashboard.mjs
  - .githooks/dashboard-read.mjs
  - .githooks/dashboard.test.mjs
  - .drwil/ia-first.json
  - docs/contracts.md
  - docs/mesures-ci-reference.md
  - docs/projects/journal.md
  - docs/projects/kit-mechanics.md
-->

(cadrage : le tableau de bord livré et sa copie du dépôt, son test, le
registre, la référence de mesure de CI et le journal. Le tableau de bord est
`.githooks/dashboard.mjs`, local au dépôt ; le tableau « Durée de la CI
drwil » publié ailleurs est hors périmètre. Ce chantier ne crée aucun
contrat attesté.)

## 1. Besoin

Le chantier « accélérer la CI » et le chantier « réduire le contexte relu »
(journal du 2026-10-24) ont laissé deux mesures à relever et une tendance à
montrer. Savoir si la CI et le contexte relu tiennent leurs objectifs,
sans bloquer personne, avant de retoucher la CI ou de découper le registre.

## Critères d'acceptation

(le contrat est à créer au lancement, avec son champ **Origine** ; ID à
attribuer à ce moment-là dans le registre, après vérification qu'il est libre
au catalogue.)

- La durée du job `checks` sur une PR à hooks inchangés et le cache lu moyen
  par requête (≈ 170 k de référence, `node .githooks/consumption.mjs
  --recorded`, sur deux chantiers comparables) sont relevés au journal —
  contrat à créer
- Le tableau de bord montre la tendance de la durée de la CI et du cache lu
  par requête, avec un seuil d'alerte non bloquant (sévérité indicative) :
  une dérive est affichée, jamais refusée — contrat à créer

## Contrats modifiés

(aucun : QUA-122 reste une preuve historique du seul
`docs/mesures-ci-reference.md`.)

## 2. Hors périmètre

- Retoucher la CI (suite unique, jobs découpés, cache de compilation), la
  doublon de `checks-self-test` et `couverture-hooks`, Node 24 pour les hooks,
  les budgets de temps Windows : restent dans
  `docs/intentions/suivi-ci-et-contexte.md`.
- Découper le registre et le journal.
- Le journal des passes locales (« les chantiers vont-ils plus vite ? »).
- Tout nouveau contrat attesté sur la durée.

## 3. Contraintes

- Indicateur, jamais contrat attesté ni verdict bloquant (décision du
  2026-10-25) ; le seuil d'alerte se fixe au lancement d'après les relevés
  faits, et se réévalue au fil du projet.
- Le tableau de bord lit déjà `.drwil/usage.jsonl` : ne rien lui faire
  écrire de plus que ses sorties.
- Un fichier de code à 200 lignes au plus : lire les relevés et calculer la
  tendance dans des fonctions séparées de la mise en page.
- Cache lu : « comparables » (taille, risque, nombre de requêtes du même
  ordre) se tranche avec le demandeur au moment du relevé.

## 4. Décisions

- 2026-10-25 (demandeur) : durée de la CI en indicateur, pas en contrat
  attesté ; relevé manuel par chantier au journal.
- 2026-10-24 (demandeur) : cache lu, indicateur sorti des critères
  d'acceptation et devenu un relevé sans seuil, référence ≈ 170 k par requête.
- 2026-10-30 (demandeur, recommandation de l'agent acceptée) : relevés et
  tendance au tableau de bord, avec seuil d'alerte non bloquant.

## 5. Lots

- **Lot 1 — les relevés** : durée du job `checks` à hooks inchangés et cache
  lu par requête consignés au journal (fiches sources supprimées).
- **Lot 2 — la tendance** : le tableau de bord montre la tendance et le
  seuil d'alerte non bloquant, le test du tableau et la mécanique du kit.

## 6. Reprise

- **Dernier état** (2026-10-30) : cadré ; rien de commencé.
- **Prochaine étape** : lancer le lot 1 ; le relevé du lot 1 attend un
  chantier ordinaire clos (hooks inchangés), ce qui peut venir en file.

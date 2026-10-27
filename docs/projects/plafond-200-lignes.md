# Projet : un fichier de code plafonné à 200 lignes, dans le dépôt et proposé au livrable

**Statut** : cadré le 2026-10-27.
**Risque** : HIGH
**Maturité** : prêt

<!-- scope
files:
  - .drwil/ia-first.json
  - .githooks/check-file-size.legacy.json
  - .githooks/check-file-size.test.mjs
  - packages/drwil/templates/common/base/.githooks/check-file-size.mjs
  - packages/drwil/templates/common/base/.githooks/state.mjs
  - packages/drwil/templates/common/base/docs/recipes/adopt-the-kit.md
  - packages/drwil/templates/common/base/docs/recipes/refactor-without-breaking.md
  - packages/drwil/templates/common/base/docs/contracts-catalog.md
  - packages/drwil/templates/common/base/docs/contracts.md
  - packages/drwil/src/closure.ts
  - packages/drwil/src/criteria.ts
  - packages/drwil/CHANGELOG.md
  - outils/miroirs.json
  - docs/contracts.md
  - docs/projects/pending.md
  - docs/projects/journal.md
-->

## 1. Besoin

Le demandeur veut des fichiers de code plus courts : 200 lignes au plus au
lieu de 400 (QUA-001, fichier de code plafonné), dans ce dépôt, et 200
lignes proposées aux projets qui adoptent le kit. Un fichier court se lit,
se relit et se charge dans le contexte d'un agent à moindre coût.

Relevé du 2026-10-27, tests exclus : 39 des 75 fichiers du périmètre de
QUA-001 dépassent 200 lignes (17 dépassent 300), soit 3 534 lignes
au-dessus du nouveau plafond. Ils ne sont pas découpés par ce chantier :
chacun est plafonné à sa taille et ne peut plus que maigrir.

Côté livrable, aucun seuil n'est imposé aujourd'hui : le contrôle de taille
est proposé à l'adoption (`catalog:QUA-001`), et le script livré applique
400 lignes quand on ne lui donne pas de plafond.

## Critères d'acceptation

- Un fichier de code du périmètre de QUA-001 ne dépasse pas 200 lignes,
  tests exclus ; chaque fichier au-dessus au lancement du chantier est
  plafonné à sa taille mesurée dans `.githooks/check-file-size.legacy.json`
  et ne peut plus grossir — `QUA-001`
- Le livrable propose 200 lignes à l'adoption : la recette d'adoption et le
  catalogue le disent, l'exemple du script livré écrit son plafond en
  entier ; le défaut du script reste 400, si bien qu'aucun projet déjà
  adopté ne casse à la mise à jour — `QUA-001`

## Contrats modifiés

- `QUA-001` — ancien critère : « Un fichier de code ne dépasse pas 400
  lignes, tests exclus ; un fichier déjà au-dessus à l'adoption serait
  plafonné à sa taille actuelle et ne pourrait que maigrir
  (`.githooks/check-file-size.legacy.json`, vide à l'adoption le
  2026-10-12, après découpage) », prouvé par le seul contrôle
  `taille-fichiers` — raison : des fichiers plus courts, moins chers à lire
  et à relire pour un agent ; le plafond passe à 200 lignes, les fichiers
  au-dessus sont plafonnés à leur taille, le livrable propose 200 lignes à
  l'adoption, et un contrôle `tests-qua-001` prouve cette proposition
  (validé par le demandeur le 2026-10-27).

## 2. Hors périmètre

- Découper les 39 fichiers au-dessus de 200 lignes : ils maigriront au fil
  des chantiers, ou par des fiches de découpe à cadrer.
- Changer le défaut du script livré (400 sans plafond donné) : il ferait
  échouer à la mise à jour un projet qui l'appelle sans plafond.
- Imposer un seuil aux projets adoptés : le contrôle reste un choix de
  l'adoption.
- Plafonner les fichiers de test.

## 3. Contraintes

- Les plafonds hérités se mesurent au lancement du chantier, pas au
  cadrage : les tailles du 2026-10-27 auront changé.
- Ce chantier passe en premier, avant les sept autres fiches cadrées (décision du
  2026-10-27). Elles font grossir `.githooks/state.mjs`,
  `.githooks/close.mjs` et `verify` : une fois le plafond posé, chacune
  extrait du code dans un nouveau fichier de moins de 200 lignes au lieu
  d'en ajouter à un fichier plafonné.
- Le gabarit livre un
  `packages/drwil/templates/common/base/.githooks/check-file-size.legacy.json` vide (celui d'un projet
  qui adopte) : la copie du dépôt, remplie, devient un écart déclaré dans
  `outils/miroirs.json`.

## 4. Décisions

- 2026-10-27 — Plafond à 200 lignes, dans le dépôt et proposé au livrable
  (demandeur).
- 2026-10-27 — Les fichiers au-dessus sont plafonnés à leur taille et ne
  peuvent que maigrir, sans découpe dans ce chantier (demandeur).
- 2026-10-27 — Livrable : 200 lignes proposées à l'adoption, défaut du
  script inchangé à 400, pour ne casser aucun projet adopté (demandeur).
- 2026-10-27 — Ce chantier passe avant les sept autres fiches cadrées (demandeur).

## 5. Points à trancher

Aucun.

## 6. Increments

- **Lot 1 — le contrat et sa preuve** [IA] : QUA-001 réécrit (200 lignes,
  plafonds hérités, proposition au livrable, contrôle `tests-qua-001`) ;
  tests « QUA-001 » dans `.githooks/check-file-size.test.mjs` : un fichier
  de 201 lignes refusé à 200, un fichier plafonné qui grossit refusé,
  l'exemple du script livré qui écrit son plafond, la recette et le
  catalogue livrés qui proposent 200 lignes, le défaut du script à 400.
  Critère de sortie : `tests-qua-001` vert.
- **Lot 2 — le plafond du dépôt** [IA] : `taille-fichiers` passe à 200
  dans `.drwil/ia-first.json` ; les fichiers au-dessus, mesurés ce jour-là,
  entrent dans `.githooks/check-file-size.legacy.json` ; l'écart déclaré
  dans `outils/miroirs.json` ; les commentaires « files under 400 lines »
  de `packages/drwil/src/closure.ts`, `packages/drwil/src/criteria.ts` et
  `.githooks/state.mjs` corrigés. Critère de
  sortie : `taille-fichiers` et `miroirs-gabarit` verts.
- **Lot 3 — la proposition au livrable** [IA] : recette d'adoption,
  recette de refactor, catalogue et registre livrés proposent 200 lignes ;
  l'exemple du script écrit son plafond ; entrée du changelog. Critère de
  sortie : `node .githooks/run-checks.mjs` vert, `drwil verify --agent` en
  PASS.

## 7. Reprise

- **Dernier état** (2026-10-27) : cadré, rien de construit.
- **Travail non commité** : aucun.
- **Prochaine étape** : [humain] lancer le chantier (`/drwil-start`).

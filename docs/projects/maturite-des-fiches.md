# Projet : maturité des fiches (prêt / à affiner)

**Statut** : ouvert le 2026-10-15 — idée posée, modalités à trancher.
**Risque** : HIGH

<!-- scope
files:
  - packages/drwil/templates/common/base/.githooks/briefs.mjs
  - packages/drwil/templates/common/base/.githooks/state.mjs
  - packages/drwil/templates/common/base/.githooks/check-docs.mjs
  - packages/drwil/templates/common/base/docs/projects/model-brief.md
  - .githooks/state.test.mjs
-->

(cadrage provisoire : à confirmer au démarrage de chaque lot ; les copies
du dépôt se régénèrent par `npm run installer-depot`, QUA-018.)

## 1. Besoin

Constat du 2026-10-15 : une fiche n'a aucun signal structuré dit « prête à
lancer » ou « à affiner ». La ligne `**Statut**` est du texte libre
(« cadré… à lancer », « ouvert… modalités à définir », « posé… en attente »)
et `briefStatus` (`packages/drwil/templates/common/base/.githooks/briefs.mjs`) ne distingue que « terminé », « référence »
et « ouvert ». Le seul vrai signal d'affinage est implicite : la section 5
« Points à trancher » est vide (« (aucun.) ») ou non.

Conséquence : le sondage de lancement (`/drwil-start`) et le tableau de
bord ne peuvent pas proposer ou trier les seules fiches prêtes.

## 2. Hors périmètre

- Les critères d'acceptation (fiche
  `docs/projects/criteres-acceptation-preuves.md`).
- Changer la priorité `[P0]` à `[P3]` de l'index (autre axe : l'urgence, pas
  la maturité).
- Rendre le champ rétroactif en bloquant les fiches existantes.

## 3. Contraintes

- Une information a une seule source : l'index `pending.md` ne recopie
  aucun état (QUA-015, chantiers exploitables à froid). La maturité vit dans
  la fiche.
- Lancer un chantier reste une décision humaine : la maturité informe le
  choix, elle ne lance rien.
- Gabarit d'abord, puis copie du dépôt (QUA-018) ; une fiche sans le champ
  ne doit pas casser un projet déjà installé.
- Contrats à citer : QUA-015 (chantiers exploitables à froid), QUA-016
  (rappel de cadrage).

## 4. Décisions

(aucune tranchée.)

## 5. Points à trancher

- [décision] Champ explicite (`**Maturité** : à affiner | prêt | en cours`)
  ou maturité déduite (section 5 vide et lots [IA] non commencés) ? Le
  champ est plus lisible, la déduction évite une seconde source de vérité
  qui peut diverger.
- [décision] Que fait le sondage `/drwil-start` des fiches « à affiner » :
  masquées, ou proposées avec un avertissement ?
- [décision] Le tableau de bord (`drwil-progress`) trie-t-il ou filtre-t-il
  par maturité ?
- [décision] Une fiche « prête » dont la section 5 contient un point
  `[décision]` est-elle refusée par `check-docs` ?

## 6. Increments

- **Lot 1 — modèle et lecture** [IA] : selon la décision, champ ou règle de
  déduction dans `packages/drwil/templates/common/base/docs/projects/model-brief.md` et
  lecture par `packages/drwil/templates/common/base/.githooks/briefs.mjs`. Critère de
  sortie : un test rend la maturité de fiches de chaque cas.
- **Lot 2 — cohérence** [IA] : `packages/drwil/templates/common/base/.githooks/check-docs.mjs` signale une fiche « prête »
  incohérente (point à trancher restant, aucun lot). Critère de sortie :
  test sur chaque incohérence.
- **Lot 3 — usage** [IA] : le sondage de lancement et le tableau de bord
  utilisent la maturité. Critère de sortie : un test sur le sondage.

## 7. Reprise

- **Dernier état** (2026-10-15) : idée posée, aucun code écrit.
- **Travail non commité** : cette fiche et sa ligne d'index.
- **Prochaine étape** : [décision] trancher le point 5, puis cadrer.

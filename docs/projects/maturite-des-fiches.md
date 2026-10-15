# Projet : maturité des fiches (prêt / à affiner)

**Statut** : cadré le 2026-10-15 — décisions tranchées le 2026-10-15, à lancer,
aucun lot commencé.
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

Tranchées par le demandeur le 2026-10-15 :

- Forme : champ explicite `**Maturité** : à affiner | prêt | en cours`,
  sous la ligne `**Statut**`.
- Sondage `/drwil-start` : les fiches « à affiner » sont proposées avec un
  avertissement, non masquées.
- Tableau de bord (`drwil-progress`) : trié par maturité.
- Fiche « prête » dont la section 5 n'est pas entièrement tranchée (point
  `[décision]` restant) ou sans lot : `check-docs` bloque (révisé le
  2026-10-15, remplace l'avertissement non bloquant). Sans risque pour les
  fiches existantes : la règle ne vise que les fiches qui se déclarent
  « prêt ».
- Fiche sans champ `**Maturité**` (fiches existantes, projets déjà
  installés) : « non renseignée », proposée sans avertissement de maturité
  et classée après les fiches « prêt ».

## 5. Points à trancher

(aucun.)

## 6. Increments

- **Lot 1 — modèle et lecture** [IA] : champ `**Maturité**` dans
  `packages/drwil/templates/common/base/docs/projects/model-brief.md` et
  lecture par `packages/drwil/templates/common/base/.githooks/briefs.mjs`. Critère de
  sortie : un test rend la maturité de fiches de chaque cas.
- **Lot 2 — cohérence** [IA] : `packages/drwil/templates/common/base/.githooks/check-docs.mjs` refuse (bloquant) une
  fiche « prête » incohérente (point `[décision]` restant, aucun lot).
  Critère de sortie : test sur chaque incohérence, refus constaté.
- **Lot 3 — usage** [IA] : le sondage de lancement propose les fiches « à
  affiner » avec un avertissement, et le tableau de bord trie par maturité.
  Critère de sortie : un test sur le sondage et un sur le tri.

## 7. Reprise

- **Dernier état** (2026-10-15) : fiche cadrée, aucun code écrit.
- **Travail non commité** : décisions et lots de cette fiche.
- **Prochaine étape** : [IA] lot 1, au lancement du chantier.

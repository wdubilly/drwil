# Intention : les données du projet hors des fichiers que le kit réécrit

**Statut** : proposée le 2026-10-26.

**Revu le 2026-11-08** : absorbée par `docs/intentions/montee-de-version-sure.md` (décision du demandeur : la montée
conserve les fichiers du projet) ; le relevé de drwil_dbox reste ici, l'index généré (2026-11-05) reste vivant.

**Revu le 2026-11-05** : décision du demandeur, pour éviter les conflits entre branches menées en
parallèle (worktrees, clones) : l'index des chantiers (`docs/projects/pending.md`) devient une vue
générée depuis les fiches et les intentions (piste « index généré »), et le journal
(`docs/projects/journal.md`) se fusionne par union Git (`merge=union`). Cible : la 0.12.0.

## Besoin

Sur drwil_dbox, la montée en 0.9.0 a remplacé `docs/intentions/README.md` par
la version du gabarit : le tableau des fiches du projet (`drum-box`,
`ux-followups`) a été remplacé par « empty at install ». Le demandeur veut
qu'une mise à jour ne perde aucune donnée du projet.

## Existant

Relevé dans `packages/drwil/src/config.ts` le 2026-10-26 :
`docs/intentions/README.md` figure dans la prose du kit (rafraîchie par
`init` et `resolve-drift`), alors que ce fichier contient aussi le tableau
des fiches du projet, qui est une donnée du projet. Le fichier est réécrit
dans son entier.

## Questions à trancher

- [décision] Déplacer le tableau des fiches dans un fichier propre au projet,
  ou faire préserver les lignes du tableau par `init` ?
- [décision] Y a-t-il d'autres fichiers de prose du kit qui mêlent texte du
  kit et données du projet (à relever avant de trancher) ?

### Index généré (décision du 2026-11-05)

- [décision] Index généré commité (fusion « on régénère » et contrôle CI de fraîcheur) ou non commité
  (plus lisible sur GitHub) ?
- [décision] L'ordre de réalisation (sondage `/drwil-start`, QUA-160) : un champ d'ordre dans chaque
  fiche ; règle de départage de deux rangs égaux (date de cadrage ?).
- [décision] La prose écrite à la main de l'index (plan d'action, historique, notes d'ordre) : vers un
  fichier non généré, ou dans les fiches ?
- [décision] Les outils qui lisent ou écrivent l'index (sondage, `.githooks/close.mjs`, `check-docs`, cohérence
  de la doc) : lecture des en-têtes de fiches à la place.
- [décision] Livrable : migration à `init` de l'index écrit à la main des projets adoptants, sans
  perte.
- Contrainte : la génération ne lit jamais l'état local (`.drwil/state.json` (si présent), lot en cours),
  pour qu'un chantier repris sur un autre clone voie le même index.

# Projet : vérifier la cohérence entre case de l'index et statut de la fiche

**Statut** (2026-10-04) : cadré — lot 1 prêt à démarrer.

<!-- cadrage
fichiers:
  - packages/drwil/templates/common/base/.githooks/check-docs.mjs
-->

## 1. Besoin

Constaté le 2026-10-04 : rien ne vérifie qu'une case `[x]` (ou `[ ]`) de
`docs/projets/en-attente.md` correspond réellement au statut de la fiche
qu'elle cite. Preuve concrète : `docs/projets/signaler-couches-par-defaut.md`
a un statut « fait » (lot 1 terminé, commit `52bb22b`) mais sa ligne d'index
est restée `[ ]` — personne ni aucun contrôle ne l'a signalé.

Sujet adjacent discuté le même jour : l'audit d'opportunité
(`docs/recettes/decouvrir-valeur-produit.md`, matrice valeur/effort) et la
priorité `[P0]`-`[P3]` de l'index mesurent deux choses différentes
(valeur/coût d'une opportunité vs urgence d'un chantier déjà décidé) — pas
de fusion des deux échelles (piste retenue par le demandeur), mais un
constat similaire de désynchronisation possible (ex. OPT-3, effort le plus
faible de l'audit, n'a jamais été converti en ligne d'index). Ce deuxième
point reste une **règle de prose** (recommandation documentée dans la
recette d'audit), pas un contrôle mécanique — non traité dans ce projet,
voir section 2.

## 2. Hors périmètre

- Vérifier mécaniquement qu'une priorité `[P0]`-`[P3]` reflète bien la
  valeur/effort d'un audit d'opportunité : reste une convention de prose
  (texte à ajouter dans `docs/recettes/decouvrir-valeur-produit.md`), pas
  vérifiable simplement (la correspondance valeur/effort → priorité est un
  jugement, pas un fait extractible).
- Vérifier que le *contenu* d'un statut est vrai (ex. une fiche qui ment en
  disant « fait » sans l'être) : relève du jugement humain, déjà assumé par
  QUA-015 (« justesse du contenu : humaine »).

## 3. Contraintes

- Le texte de « Statut » est libre (markdown prose), pas un champ structuré
  — toute détection de mots-clés aura des angles morts (négations,
  formulations inhabituelles).
- Doit fonctionner pour `docs/projets/` et `docs/intentions/` (les deux ont
  des fiches citées depuis `en-attente.md`).

## 4. Décisions

- (2026-10-04) Mots-clés comptant pour « statut terminé » : `fait`,
  `terminé`, `clos` (insensible à la casse).
- (2026-10-04) Sévérité : avertissement, comme QUA-016 aujourd'hui — pas
  bloquant.
- (2026-10-04) Rattaché à **QUA-015** (même thème : chantiers exploitables
  à froid), sa règle est complétée plutôt qu'un nouvel ID créé.
- (2026-10-04) Cas inverse (case `[x]` mais fiche qui ne dit pas « fait ») :
  même sévérité que le cas repéré (avertissement).

## 5. Points à trancher

(aucun — les 4 points sont tranchés, voir section 4)

## 6. Lots

- **Lot 1 — détecter l'incohérence** [IA] : dans `.githooks/check-docs.mjs`, pour
  chaque ligne de `docs/projets/en-attente.md` qui cite une fiche de
  `docs/projets/` ou `docs/intentions/`, lire la ligne « Statut » de la
  fiche citée et comparer à l'état de la case (`[ ]`/`[x]`). Avertissement
  (non bloquant) dans les deux sens : case ouverte alors que le statut
  contient `fait`/`terminé`/`clos`, ou case cochée alors qu'il ne les
  contient pas. Mettre à jour la règle **QUA-015** dans `docs/contrats.md`
  (et son équivalent dans le template du kit) pour documenter cette
  extension. Critère de sortie : test cas passant (case et statut
  cohérents → rien signalé) et cas non passant (reproduisant
  `signaler-couches-par-defaut.md` avant correction de son index → signalé),
  tests existants toujours verts.

## 7. Reprise

- **Dernier état** (2026-10-04) : les 4 points tranchés avec le demandeur.
  Aucun code touché.
- **Travail non commité** : aucun.
- **Prochaine étape** : [IA] coder le lot 1 avec preuve rouge/verte.

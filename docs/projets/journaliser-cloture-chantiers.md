# Projet : journaliser la clôture des chantiers (éviter l'accumulation de fiches)

**Statut** (2026-10-05) : fait — lot 1 livré.

<!-- cadrage
fichiers:
  - .githooks/check-docs.mjs
-->

## 1. Besoin

Constat du demandeur : une fiche de `docs/projets/` reste en place
indéfiniment une fois son chantier clos — seule sa case dans
`docs/projets/en-attente.md` est cochée. Aucun mécanisme n'archive ni ne
condense ces fiches, qui s'accumulent sans limite.

## 2. Hors périmètre

- Archiver (déplacer vers un dossier dédié, type « archive ») : rejeté,
  ne fait que déplacer l'encombrement.
- Contrat imposant qu'une fiche soit toujours citée dans l'index : rejeté
  (demandé en cours de chantier, tranché par le demandeur) — l'index liste
  le travail *en attente*, pas un catalogue exhaustif ; un correctif
  réactif ouvert et clos dans la même session n'a jamais été « en
  attente ».

## 3. Contraintes

- Rien n'est réellement perdu quoi qu'on fasse du fichier : git conserve
  l'historique complet (`git log --follow`).
- Ne pas casser `.githooks/check-docs.mjs` (chemins cités, structure de
  fiche) en supprimant une fiche encore citée ailleurs.

## 4. Décisions

- (2026-10-05) Mécanisme retenu : **condenser**. À la clôture d'une fiche
  *entièrement* terminée (pas un simple lot parmi d'autres d'une fiche
  qui reste ouverte), résumer en une entrée courte dans
  `docs/projets/journal.md` (date, titre, décisions clés, commit/PR de
  clôture), supprimer le fichier de la fiche, retirer la ligne
  correspondante de `docs/projets/en-attente.md` (pas la cocher).
- (2026-10-05) `journal.md` exempté des contrôles de structure chantier
  (`EXEMPTS_RE` de `.githooks/check-docs.mjs`), comme `entretien-courant.md`.
- (2026-10-05) Pas de contrat imposant qu'une fiche soit citée dans
  l'index : comportement existant conservé tel quel.

## 5. Points à trancher

(aucun)

## 6. Lots

- **Lot 1 — mécanisme et application rétroactive** [IA] : créer
  `docs/projets/journal.md` (dogfood + gabarits FR/EN) ; exempter
  `journal.md` dans `.githooks/check-docs.mjs` (2 copies) ; mettre à jour
  la recette `docs/recettes/travailler-en-branche.md`
  (et son équivalent anglais) ; mettre à jour l'en-tête de
  `docs/projets/en-attente.md` (et son équivalent anglais, 2 langues) ; condenser les 6 fiches déjà entièrement closes du dépôt
  (vérifier-coherence-case-statut, rappeler-peremption-audits,
  informer-capacites-drwil, commande-slash-drwil,
  travailler-avec-branches-et-mr, reparer-ci-casse) et retirer leurs
  citations orphelines. Critère de sortie : `.githooks/check-docs.mjs` 0
  erreur, `npm test` 44/44 vert dans `packages/drwil/`.

## 7. Reprise

- **Dernier état** (2026-10-05) : lot 1 fait. `.githooks/check-docs.mjs` :
  0 erreur (8 avertissements QUA-015 pré-existants sur des fiches
  multi-lots encore ouvertes, hors périmètre). `npm test` : 44/44 verts
  dans `packages/drwil/`.
- **Travail non commité** : tout le travail ci-dessus, prêt à committer
  sur une branche dédiée (QUA-017).
- **Prochaine étape** : aucune — chantier terminé.

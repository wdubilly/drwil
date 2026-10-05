# Projet : créer une release (tag + notes) à chaque chantier fusionné

**Statut** : cadré le 2026-10-05 — lots 1 à 4 faits, à fusionner.

<!-- cadrage
fichiers:
  - packages/drwil/templates/common/optional/creer-une-release
  - .githooks/creer-release.mjs
  - .github/workflows/ia-first.yml
-->

## 1. Besoin

Ce dépôt (et tout projet généré par le kit) accumule des chantiers
fusionnés sans jamais marquer de version : pas de tag Git, pas de note de
release, pas de CHANGELOG. Après coup, impossible de répondre vite à « que
contient la version qui tourne en prod ? » ou « qu'est-ce qui a changé
depuis la dernière fois que j'ai regardé ? ». Objectif : un tag Git +
une note de release GitHub par chantier fusionné sur la branche
principale, calculés automatiquement, sans publication npm pour l'instant
(objectif purement interne — versionner/tracer).

## 2. Hors périmètre

- Publication réelle sur npm du paquet `drwil` (décision séparée, pas
  prise ici).
- CHANGELOG.md committé (ou toute autre modification de fichier suivi par
  la release) : interdit par QUA-017 (pas de commit direct sur master)
  sans passer par une PR supplémentaire — compromis retenu : **aucun
  fichier suivi n'est modifié**, seuls un tag Git et une note de release
  GitHub (hors dépôt Git) sont créés.
- Équivalent GitLab testé en conditions réelles (best-effort documenté,
  comme pour le job d'alerte CI — pas de projet GitLab disponible pour
  valider).
- Rendre ce mécanisme obligatoire pour tout projet généré par le kit :
  reste **opt-in**, comme `tableau-de-bord` ou `front-quality`.

## 3. Contraintes

- QUA-017 : pas de commit direct sur master → la release ne doit jamais
  committer de fichier.
- Le calcul de version doit rester *best-effort* : pas de nouveau contrat
  bloquant qui obligerait un format de message de commit (certains
  chantiers passés n'ont pas de préfixe `feat:`/`fix:` — ex. `76959af`,
  `f8b87c1`) ; défaut sûr = bump *patch* si aucun type reconnu.
- Dépôt privé, plan gratuit : pas de protection de branche (déjà établi
  lors du chantier précédent) — la release se pose sur le commit de merge
  une fois la CI verte, pas avant.

## 4. Décisions

- 2026-10-05 : objectif interne (tags + notes GitHub), pas de publication
  npm pour l'instant (décision utilisateur).
- 2026-10-05 : déclenchement automatique à chaque chantier fusionné sur
  master (décision utilisateur initiale).
- 2026-10-06 : revu — pas de déclenchement automatique en CI. La release
  est proposée à l'utilisateur et lancée seulement sur sa demande
  explicite, comme pour un commit ou un push (décision utilisateur, annule
  et remplace la décision du 2026-10-05). Le job CI `creer-release` est
  retiré de `.github/workflows/ia-first.yml` ; le script et la recette
  restent disponibles pour une exécution manuelle à la demande.
- 2026-10-05 : version calculée depuis les messages de commit façon
  Conventional Commits, best-effort, sans contrat bloquant qui l'impose
  (décision utilisateur).
- 2026-10-05 : aucun fichier suivi modifié par la release — seulement un
  tag Git annoté + une note de release GitHub générée automatiquement
  (décision utilisateur, tranche le risque QUA-017).
- 2026-10-05 : mécanisme livré comme **module optionnel du kit** (recette
  + script copiable, comme `tableau-de-bord`), **et** activé réellement
  sur ce dépôt (dogfood) — compromis demandé par l'utilisateur pour ne
  bloquer aucun projet généré tout en servant ici dès maintenant.

## 5. Points à trancher

(aucun point ouvert à ce stade — cadrage validé par l'utilisateur)

## 6. Lots

- **Lot 1 — script réutilisable** [IA] : `.githooks/creer-release.mjs`
  (et sa copie gabarit dans
  `packages/drwil/templates/common/optional/creer-une-release/`) : lit le
  dernier tag `vX.Y.Z` (ou démarre à `v0.1.0` si aucun), liste les commits
  non-merge depuis ce tag, détecte le bump (majeur si rupture annoncée,
  mineur si au moins un `feat`, sinon patch par défaut), calcule la
  version suivante, propose un mode `--dry-run` (aperçu sans rien créer).
  Critère de sortie : test unitaire sur la détection de bump (3 cas :
  aucun commit conventionnel, au moins un `feat`, rupture annoncée).
- **Lot 2 — création réelle du tag + de la release** [IA] : sans
  `--dry-run`, le script crée un tag Git annoté sur `HEAD` et (si
  `gh` est disponible) une release GitHub avec notes générées
  automatiquement. Critère de sortie : testé manuellement sur ce dépôt
  après fusion de ce chantier.
- **Lot 3 — recette + skill** [IA] : `docs/recettes/creer-une-release.md`
  (FR) et son équivalent EN, expliquant l'activation manuelle (copier le
  script, lancer à la main) et l'activation automatique (extrait de job
  CI à coller, documenté dans le README du module). Skill Claude
  `creer-une-release` (FR/EN), ajouté au menu du skill générique `drwil`.
  Critère de sortie : `node --test` sur
  `packages/drwil/test/kit.test.mjs` couvre la présence des fichiers
  livrés.
- **Lot 4 — activation dogfood (révisée)** [IA] : pas de job CI
  automatique. Sur ce dépôt, la release reste une action manuelle sur
  demande explicite de l'utilisateur, comme pour un commit/push :
  `node .githooks/creer-release.mjs`. Critère de sortie : aucun job
  `creer-release` dans `.github/workflows/ia-first.yml` ; recette à jour
  sur ce point.

## 7. Reprise

- **Dernier état** (2026-10-06) : lots 1 à 3 faits et activés ; lot 4
  révisé — pas de job CI automatique. Script
  `.githooks/creer-release.mjs` (détection bump + tag + release),
  recette/skill FR/EN. 49/49 tests verts, le contrôle des
  chemins/contrats cités et la couverture CI (QUA-013) restent verts.
  Vérifié en conditions réelles (`--dry-run`) sur ce dépôt : première
  version calculée `v0.1.0`.
- **Travail non commité** : aucun.
- **Prochaine étape** : [humain] fusionner ce chantier. La release reste
  ensuite une action manuelle, proposée par l'IA et lancée seulement sur
  demande explicite de l'utilisateur.

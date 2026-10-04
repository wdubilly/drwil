# Projet : `apply()` rafraîchit la mécanique du kit et signale la dérive de prose

**Statut** (2026-10-04) : lot 1 livré (détection et signalement de la dérive). Lot 2 (résolution) non tranché, voir section 6.

<!-- cadrage
fichiers:
  - packages/drwil/src/index.ts
-->

## 1. Besoin

Constaté le 2026-10-04 sur drwil lui-même : `apply()` (contrairement à
`init()`) ne réécrit jamais aucun fichier existant, pas même `.githooks/`.
Sur un projet qui avait déjà ses propres hooks avant d'adopter le kit (cas de
drwil), ça laisse cohabiter indéfiniment l'ancien et le nouveau :
`.githooks/cadrage.py`, `.githooks/check-docs.py`, `.githooks/run-checks.sh`,
`scripts/garde-fou-bash.py` à côté de leurs équivalents générés par le kit,
jamais nettoyés ni resynchronisés. `AGENTS.md`,
`docs/ia-first.md` et `docs/contrats.md` de drwil sont eux aussi restés sur
une version antérieure au kit (56/9/52 lignes contre 121/219 lignes + section
« Hors registre » dans le template), sans qu'aucun mécanisme ne le signale.

Preuve étendue le 2026-10-04 (diff systématique des 13 recettes racine contre
leur équivalent template) : 2 recettes (`docs/recettes/auditer-risques-et-dette.md`,
`docs/recettes/decouvrir-valeur-produit.md`) sont identiques — pas de dérive. Mais 3 autres
le sont réellement : `docs/recettes/ajouter-une-route-api.md` cite encore
`.githooks/run-checks.sh` (mort, remplacé par `.githooks/run-checks.mjs`
dans le template) ; `docs/recettes/deployer-en-prod.md` et
`docs/recettes/refactorer-sans-casser.md`
sont restées de courts gabarits alors que le template a depuis été
largement enrichi (méthode de refactor détaillée, garde-fou de taille de
fichier...). La dérive de prose dépasse donc les 3 fichiers de gouvernance
initialement constatés : elle touche aussi `docs/recettes/`.

Décidé le 2026-10-04 (voir section 4) : un seul traitement, pas deux — ni
la mécanique ni la prose ne doivent être réécrites à l'aveugle. `apply()`
diffuse (compare) tout fichier déjà présent face au template et, en cas
d'écart, le signale (jamais de réécriture automatique silencieuse). Nuance
du demandeur : `apply()` est censé être un geste ponctuel par projet (une
seule adoption du kit) — ce chantier vise surtout le cas d'une
ré-application après mise à jour du kit (nouvelle version de
`packages/drwil`), drwil lui-même étant un cas particulier
(ré-appliqué souvent, pour le dogfooding).

## 2. Hors périmètre

- Fusion automatique du contenu de la prose (AGENTS.md, docs/ia-first.md,
  docs/contrats.md...) : jamais sans décision humaine, voir section 5.
- Suppression des fichiers obsolètes (`.githooks/cadrage.py`,
  `.githooks/check-docs.py`, `.githooks/run-checks.sh`,
  `scripts/garde-fou-bash.py`) : sujet déjà en attente
  (`docs/projets/en-attente.md`, point 3 de `suites-kit-portable.md`), pas
  traité ici — `copyTree` n'efface jamais un fichier qui n'est pas dans le
  template, un rafraîchissement de `.githooks/` ne les retirera pas.
- Changer le comportement de `init()` (déjà correct).

## 3. Contraintes

- Ne rien casser sur un projet qui a *réellement* personnalisé un fichier de
  `.githooks/` (cas limite non vérifié à ce jour : rien n'interdit
  aujourd'hui d'éditer ces fichiers à la main sur un projet existant).
- `apply()` ne doit toujours jamais toucher à un fichier de prose existant.

## 4. Décisions

- (2026-10-04) Pas de réécriture automatique aveugle, ni pour la mécanique
  (`.githooks/`, `.claude/settings.json`, CI) ni pour la prose : `apply()`
  diffuse systématiquement tout fichier déjà présent contre le template et
  signale l'écart ; en cas de conflit sur la mécanique, il propose une
  résolution (le détail de cette proposition reste à préciser au lot 2, ce
  n'est pas forcément un écrasement).
- (2026-10-04) Signalement affiché en sortie, à la fin de `apply()`/`init()`
  (pas de commande séparée dédiée).
- (2026-10-04) Le signalement compare à la fois le nombre de lignes et les
  sections `##` manquantes.
- (2026-10-04) Portée : toute la base du template (`common/base`,
  `<lang>/base`, pas seulement les 3 fichiers de gouvernance initiaux) —
  tranché par la preuve en section 1.

## 5. Points à trancher

(aucun restant — les 3 points sont tranchés, voir section 4 ; des
sous-questions de détail pourront apparaître en ouvrant le lot 2, voir
section 6)

## 6. Lots

- **Lot 1 — détecter et signaler la dérive** [IA] — **fait le 2026-10-04**.
  Implémenté dans `packages/drwil/src/index.ts` : `detecterDerive()` compare
  nombre de lignes + sections `##` entre un fichier déjà présent et le
  template rendu ; `writeOut()` l'appelle quand un fichier existant n'est
  pas réécrit ; `reportDerives()` affiche la liste en fin de `init()`/
  `apply()`. Aucune réécriture automatique. Test dédié : fichier identique
  → rien signalé, fichier raccourci (reproduisant le cas des recettes
  dérivées constaté en section 1) → signalé, jamais modifié sur disque.
  39/39 tests verts.
- **Lot 2 — proposer une résolution pour la mécanique du kit** [IA/décision] :
  pour les fichiers de `.githooks/`, `.claude/settings.json` et le fichier
  de CI spécifiquement (ceux sans personnalisation légitime attendue), aller
  au-delà du simple signalement du lot 1 et proposer concrètement une
  résolution (ex. diff unifié affiché + confirmation avant d'écraser,
  détail exact à trancher à l'ouverture de ce lot). Critère de sortie :
  reste à définir avec le lot.

## 7. Reprise

- **Dernier état** (2026-10-04) : lot 1 livré. `detecterDerive()`,
  `writeOut()`, `copyTree()`, `scaffold()`, `reportDerives()`, `init()` et
  `apply()` modifiés dans `packages/drwil/src/index.ts` pour signaler (sans
  jamais réécrire) tout fichier de la base déjà présent qui diffère du
  template (nombre de lignes ou sections `##` manquantes). Test dédié
  ajouté dans `packages/drwil/test/kit.test.mjs`. 39/39 tests verts,
  `.githooks/run-checks.mjs` vert.
- **Travail non commité** : aucun.
- **Prochaine étape** : [humain/décision] trancher le détail du lot 2
  (résolution de la mécanique du kit) avant de l'ouvrir — voir section 6.

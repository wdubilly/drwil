# Projet : `apply()` rafraîchit la mécanique du kit et signale la dérive de prose

**Statut** (2026-10-04) : proposé — points à trancher avant tout code (section 5).

<!-- cadrage
fichiers:
  - packages/kit-ia-first/src/index.ts
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

Deux natures de fichiers, deux traitements distincts :
- **Mécanique du kit** (`.githooks/`, `.claude/settings.json`, fichier de CI) :
  entièrement générée, aucune personnalisation légitime attendue. Risque
  faible à rafraîchir automatiquement, comme `init()` le fait déjà
  (`KIT_MECHANICS`).
- **Prose de gouvernance** (`AGENTS.md`, `docs/ia-first.md`,
  `docs/contrats.md`, recettes...) : personnalisation projet légitime et
  attendue. Une fusion automatique de markdown libre risque de réintroduire
  du contenu retiré sciemment, ou de dupliquer une section réécrite sous un
  autre intitulé.

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

(aucune encore — proposé à l'instant, points à trancher ci-dessous)

## 5. Points à trancher

- [décision] Volet 1 : `apply()` doit-il traiter `.githooks/` (et
  `.claude/settings.json`, le fichier de CI) comme `KIT_MECHANICS` et les
  réécrire systématiquement, comme `init()` le fait déjà ? Risque accepté :
  une personnalisation manuelle de ces fichiers sur un projet existant serait
  écrasée sans préavis.
- [décision] Volet 2 : forme du signalement de dérive de prose — une
  nouvelle commande (`apply --check-drift` ?), une sortie systématique à la
  fin de `apply()`/`init()` si les fichiers existent déjà, ou un contrôle à
  part dans `.githooks/run-checks.mjs` ? Doit lister quoi précisément (nombre de
  lignes ? sections `##` absentes du template ? les deux) ?
- [décision] Le signalement de dérive (volet 2) doit-il être retenu
  seulement pour les 3 fichiers constatés (AGENTS.md, docs/ia-first.md,
  docs/contrats.md) ou étendu à toute la base `common/base` et `<lang>/base`
  du template ?

## 6. Lots

(à proposer une fois les points à trancher tranchés)

## 7. Reprise

- **Dernier état** (2026-10-04) : fiche créée après constat de la dérive sur
  drwil (AGENTS.md/docs/ia-first.md/docs/contrats.md restés sur une version
  pré-kit ; les fichiers obsolètes sous `.githooks/` jamais nettoyés par `apply()`
  qui ne réécrit rien, contrairement à `init()`). Aucun code touché.
- **Travail non commité** : aucun.
- **Prochaine étape** : [décision] trancher la section 5 avant d'ouvrir le
  lot 1.

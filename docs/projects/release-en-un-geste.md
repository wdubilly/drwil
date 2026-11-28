# Projet : publier une release en un seul geste, livré dans le kit

**Statut** : cadré le 2026-11-28.
**Risque** : HIGH
**Maturité** : prêt

<!-- scope
files:
  - packages/drwil/templates/common/optional/create-release/*
  - packages/drwil/templates/common/base/.githooks/acceptance-sheet-texts.mjs
  - packages/drwil/templates/common/base/.githooks/acceptance-sheet-works.mjs
  - packages/drwil/templates/common/base/.githooks/acceptance-sheet.mjs
  - packages/drwil/templates/common/base/.githooks/create-release-texts.mjs
  - packages/drwil/templates/common/base/.githooks/create-release-version.mjs
  - packages/drwil/templates/common/base/.githooks/create-release.mjs
  - packages/drwil/templates/common/base/.githooks/promote-release.mjs
  - packages/drwil/templates/common/base/.githooks/recette-note-texts.mjs
  - packages/drwil/templates/common/base/.githooks/recette-note.mjs
  - packages/drwil/templates/common/base/.githooks/release-review.mjs
  - packages/drwil/templates/common/base/.githooks/release-verdict-poll.mjs
  - packages/drwil/templates/common/base/.githooks/release-verdict.mjs
  - packages/drwil/templates/common/base/.githooks/release-gesture.mjs
  - packages/drwil/templates/common/base/.githooks/release-gesture-forge.mjs
  - packages/drwil/templates/common/base/.githooks/release-gesture-texts.mjs
  - .githooks/acceptance-sheet-texts.mjs
  - .githooks/acceptance-sheet-works.mjs
  - .githooks/acceptance-sheet.mjs
  - .githooks/acceptance-sheet.test.mjs
  - .githooks/create-release-texts.mjs
  - .githooks/create-release-version.mjs
  - .githooks/create-release.mjs
  - .githooks/create-release.test.mjs
  - .githooks/promote-release.mjs
  - .githooks/promote-release.test.mjs
  - .githooks/recette-note-texts.mjs
  - .githooks/recette-note.mjs
  - .githooks/recette-note.test.mjs
  - .githooks/release-gesture-forge.mjs
  - .githooks/release-gesture-forge.test.mjs
  - .githooks/release-gesture-texts.mjs
  - .githooks/release-gesture-texts.test.mjs
  - .githooks/release-gesture.mjs
  - .githooks/release-gesture.test.mjs
  - .githooks/release-review.mjs
  - .githooks/release-review.test.mjs
  - .githooks/release-verdict-poll.mjs
  - .githooks/release-verdict.mjs
  - .githooks/release-verdict.test.mjs
  - packages/drwil/templates/common/base/.githooks/state.mjs
  - packages/drwil/templates/common/base/.githooks/state-texts.mjs
  - packages/drwil/templates/common/base/docs/recipes/create-a-release.md
  - packages/drwil/templates/common/tools/claude/.claude/skills/*
  - packages/drwil/templates/common/tools/claude/.claude/hooks/*
  - packages/drwil/templates/common/tools/claude/.claude/settings.json
  - .githooks/state.mjs
  - .githooks/state-texts.mjs
  - .githooks/state.test.mjs
  - docs/recipes/create-a-release.md
  - .claude/skills/*
  - .claude/hooks/*
  - .claude/settings.json
  - packages/drwil/src/*.ts
  - packages/drwil/test/*.mjs
  - outils/miroirs.json
  - AGENTS.md
  - README.md
  - docs/features.md
  - docs/architecture.md
  - docs/contracts.md
  - docs/projects/kit-mechanics.md
  - docs/projects/pending.md
  - docs/projects/journal.md
  - packages/drwil/CHANGELOG.md
  - .drwil/ia-first.json
-->

## 1. Besoin

Demandeur, 2026-11-28 : « je voudrais faire des release en un geste », et « ça doit bénéficier aussi à l'adoptant dans
son kit ». Aujourd'hui, publier demande de préparer à part la version, le changelog, les documents et leur PR, puis
d'attendre la CI, de lancer l'essai à blanc, d'accorder la publication et de publier. La 0.11.2 est passée par une
fiche dédiée. Le module de release du kit n'est pas installé par défaut ; sa documentation décrit une copie manuelle,
et sur GitLab il ne pose que le tag.

Le tag est une commande Git ; la release (page, notes, fichiers joints) est un objet de la forge.

## Critères d'acceptation

(contrats à créer au lancement, avec leur champ **Origine**.)

- Une seule réponse humaine au lancement de `/drwil-release`, donnée en voyant la version proposée et son contenu, mène à la release publiée : version, changelog, documents, PR, fusion, CI, tag et release, sans autre geste — contrat à créer
- Rien n'est publié sans cette réponse ; l'agent ne peut ni la donner ni la remplacer — contrat à créer
- Au moindre échec (contrôle, CI, OS exigé, essai déclaré par le projet, version différente de celle annoncée, correctif de code nécessaire), rien n'est publié, l'accord est annulé et la cause est dite — contrat à créer
- Une publication incomplète (tag posé sans release) n'est jamais annoncée comme réussie : code de sortie en échec et commande de rattrapage — contrat à créer
- L'accord est enregistré par l'outil, lu par une session qui reprend, et effacé après la publication ou l'échec — contrat à créer
- Le parcours est installé par défaut, à l'installation comme à la mise à jour, sans rien publier ni écraser un fichier modifié par le projet — contrat à créer
- Le parcours aboutit sur GitHub et sur GitLab, tag et release compris — contrat à créer
- Un vrai passage sur un projet d'essai de chaque forge publie une release en un geste [humain] — contrat `Manuel` à créer

## Contrats modifiés

- `QUA-098` — ancien critère : « Livré à tout projet avec le module de release (optionnel) » — raison : le module est installé par défaut ; l'examen exigé avant le tag ne change pas (validé le 2026-11-28)
- `QUA-200` — ancien critère : « Livré à tout projet avec le module de release (optionnel) » — raison : le module est installé par défaut ; la publication directe en solo ne change pas (validé le 2026-11-28)
- `QUA-268` — ancien critère : « Livré à tout projet avec le module de release (optionnel) » — raison : le module est installé par défaut ; la barrière des OS exigés ne change pas (validé le 2026-11-28)

## 2. Hors périmètre

- La publication npm.
- Le mode `team` : le verdict de recette reste un geste humain distinct ; le geste unique vaut pour `release.mode` à `solo`.
- La version d'une fiche fusionnée par squash dans la fiche de recette : `docs/projects/release-feu-vert-et-squash.md`.
- Un essai de montée qui joue la CI réelle d'un projet d'essai : ce chantier lance seulement la commande que le projet déclare, s'il en déclare une.

## 3. Contraintes

- Action visible de tous et difficile à reprendre : au moindre doute, ne pas publier (QUA-013) ; aucun contrôle sauté (QUA-019) ; jamais de commit direct sur la branche principale (QUA-017).
- Le sondage suit le socle des sondages préparés (QUA-235). Sans sondage dans l'outil, le geste se donne au terminal.
- Deux lectures de `.claude/hooks/prompt-hook.mjs` par une recherche ont été refusées le 2026-11-28, cause inconnue : l'éclaircir avec le demandeur avant de modifier ce fichier, sans contourner.
- Les essais réels publient sur des projets d'essai : les créer et y publier demande l'accord du demandeur, forge par forge.
- On édite le gabarit puis `npm run installer-depot` (QUA-018) ; textes en français et en anglais.

## 4. Décisions

(tranchées par le demandeur le 2026-11-28)

- La réponse au lancement vaut jusqu'à la publication, si tout est vert et si la version est celle annoncée.
- Le chantier passe avant les deux correctifs de la 0.11.3 et il est livré dans le kit.
- 1B : installé par défaut. 2B : GitHub et GitLab dès la première version.

## 5. Points à trancher

Aucun.

## 6. Increments

- **Lot 1 — module installé par défaut** [IA] : installation et mise à jour. Recette réelle : le tarball de la branche installé en mise à jour sur des copies d'adoptants (`outils/recette-adoptant.mjs`). Critère de sortie : tests verts.
- **Lot 2 — enchaînement et GitHub** [IA] : de la montée de version à la release, arrêts sûrs, publication incomplète signalée. Critère de sortie : tests verts avec une forge simulée.
- **Lot 3 — le geste** [IA] : sondage, accord enregistré, `/drwil-release`, recette. Critère de sortie : tests verts.
- **Lot 4 — GitLab** [IA] : même parcours, release comprise. Critère de sortie : tests verts avec une forge simulée.
- **Lot 5 — vrais passages** [humain] : une release en un geste sur un projet d'essai GitHub et un GitLab, puis attestation.

## 7. Reprise

- **Dernier état** (2026-11-28) : cadrage terminé.
- **Prochaine étape** : [humain] `/drwil-start`.

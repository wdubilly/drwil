# Projet : la doc dit le lancement de chantiers en parallèle (`drwil-parallel`, `launchParallel`, `maxParallel`)

**Statut** : cadré le 2026-10-26.
**Risque** : LOW
**Maturité** : prêt
**Intention** : `docs/intentions/nettoyage-des-worktrees.md`

<!-- scope
files:
  - docs/architecture.md
  - docs/ia-first.md
  - packages/drwil/templates/common/base/docs/ia-first.md
  - packages/drwil/CHANGELOG.md
  - docs/projects/pending.md
  - docs/projects/journal.md
-->

## 1. Besoin

Le chantier « file en parallèle » (QUA-147, QUA-148, QUA-149) est fusionné,
mais deux documents lus d'abord par un visiteur ne le disent pas :
`docs/architecture.md` ne cite ni `launchParallel` ni `maxParallel`, et
`docs/ia-first.md` affirme encore « A single brief per worktree: a queue
stays in the repository folder », devenu faux avec la question
`drwil-parallel`. Une doc fausse est pire que pas de doc.

Périmètre : **drwil-le-livrable** pour `docs/ia-first.md` (on édite le gabarit,
`docs/ia-first.md` n'en est que la copie, contrôle `miroirs-gabarit`) ;
**drwil-le-dépôt** pour `docs/architecture.md` (carte propre au dépôt,
écart déclaré dans `outils/miroirs.json`). Aucun code n'est modifié.

## Critères d'acceptation

- `docs/ia-first.md` (et son gabarit) décrit la question `drwil-parallel`,
  la file en parallèle, le plafond `maxParallel` (3 par défaut) et le refus
  des fiches dont les blocs `scope` se recoupent, et ne dit plus qu'une file
  reste dans le dossier du dépôt sans nuance — `QUA-147`
- `docs/architecture.md` cite `.githooks/worktree.mjs` (`launchParallel`),
  `.githooks/briefs.mjs` (recoupement des `scope`) et le réglage
  `maxParallel` — `QUA-040`
- La ligne « Unreleased » du changelog du paquet le dit — `QUA-040`
- `node .githooks/run-checks.mjs` OK (dont `miroirs-gabarit`) — `QUA-018`

## 2. Hors périmètre

- Le nettoyage des worktrees et le repositionnement après clôture :
  `docs/intentions/nettoyage-des-worktrees.md`.
- Le lancement par vagues au-delà de N chantiers : consigné au journal, sans
  besoin établi.
- Tout changement de code ou de contrat.

## 3. Contraintes

- Les textes décrivent ce que le code fait aujourd'hui (QUA-147) : relire
  `.githooks/worktree.mjs` et le contrat avant d'écrire.
- `docs/architecture.md`, `packages/drwil/CHANGELOG.md` : en anglais
  (réglage `docLang`).

## 4. Décisions

(validées par le demandeur le 2026-10-26)

1. Fiche de documentation seule, séparée des chantiers de code.

## 5. Points à trancher

- Aucun : tout est tranché.

## 6. Increments

- **Lot 1 — documentation** [IA] : `docs/ia-first.md` (gabarit puis copie),
  `docs/architecture.md`, changelog. Critère de sortie :
  `node .githooks/run-checks.mjs` OK, `drwil verify --agent` PASS.

## 7. Reprise

- **Dernier état** (2026-10-26) : cadré.
- **Travail non commité** : aucun.
- **Prochaine étape** : [humain] lancer le chantier (`/drwil-start`).

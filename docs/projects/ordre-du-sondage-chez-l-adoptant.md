# Projet : l'ordre du sondage /drwil-start fonctionne chez l'adoptant, et un ordre non lu se signale

**Statut** : cadré le 2026-11-06.
**Risque** : HIGH
**Maturité** : prêt
**Intention** : `docs/intentions/ordre-du-sondage-chez-l-adoptant.md`

<!-- scope
files:
  - packages/drwil/templates/common/base/docs/projects/pending.md
  - packages/drwil/templates/common/base/.githooks/briefs.mjs
  - packages/drwil/templates/common/base/.githooks/briefs-order.mjs
  - packages/drwil/templates/common/base/.githooks/state-messages-fr.mjs
  - packages/drwil/templates/common/base/.githooks/state-messages-en.mjs
  - packages/drwil/templates/common/tools/claude/.claude/skills/start-a-workstream/SKILL.md
  - .githooks/briefs.mjs
  - .githooks/briefs-order.mjs
  - .githooks/state-messages-fr.mjs
  - .githooks/state-messages-en.mjs
  - .claude/skills/start-a-workstream/SKILL.md
  - .githooks/state.test.mjs
  - packages/drwil/test/kit.test.mjs
  - docs/contracts.md
  - .drwil/ia-first.json
  - packages/drwil/CHANGELOG.md
  - docs/intentions/ordre-du-sondage-chez-l-adoptant.md
  - docs/projects/pending.md
  - docs/projects/journal.md
-->

## 1. Besoin

Le sondage de lancement suit l'ordre des lignes ouvertes de la section « Fiches cadrées » de l'index
(QUA-160). Chez l'adoptant, l'index livré n'a qu'une section `## Projects`, vide :
`.githooks/briefs-order.mjs` (`SECTION_RE`) ne trouve aucune section reconnue, et le sondage retombe
sur l'ancien tri (prête, maturité, priorité, chemin) sans rien dire. L'adoptant croit à un ordre qui
n'est pas lu (QUA-013).

## Critères d'acceptation

- L'index des chantiers livré par le gabarit a une section `## Scoped briefs` qui dit que l'ordre de ses
  lignes ouvertes est l'ordre du sondage, et montre le format exact d'une ligne ; une installation neuve
  qui y ajoute une ligne voit sa fiche proposée en tête — contrat à créer
- `state.mjs briefs` (donc le sondage) avertit, sans bloquer, quand l'index n'a aucune section reconnue :
  ordre par priorité, et où ajouter la section ; rien quand la section existe — même contrat
- L'ordre des sections déjà reconnues est inchangé — `QUA-160`

## 2. Hors périmètre

- `## Projects` ne devient pas une section d'ordre : elle regroupe des sujets par thème, pas un ordre de
  réalisation.
- Aucun avertissement dans `verify` (décision du 2026-11-06).
- Réécrire l'index déjà installé d'un adoptant : seul l'avertissement l'informe.

## 3. Contraintes

- Le gabarit est en anglais : titre `Scoped briefs`, déjà reconnu par `SECTION_RE`.
- Le message d'avertissement existe en français et en anglais.

## 4. Décisions

Tranchées par le demandeur le 2026-11-06 :

- Section dans le gabarit **et** avertissement de `state.mjs briefs` ; pas de contrôle dans `verify`.
- Titre `Scoped briefs`.

## 5. Points à trancher

Aucun.

## 6. Increments

- **Lot 1 — section et avertissement** [IA] : index du gabarit, `.githooks/briefs.mjs` ou `.githooks/briefs-order.mjs`,
  messages, skill de lancement, tests, contrat. Critère de sortie : tests du contrat et de QUA-160 verts,
  `GOVERNANCE: PASS`.

## 7. Reprise

- **Dernier état** (2026-11-06) : cadré, rien de réalisé.
- **Prochaine étape** : [IA] lot 1.

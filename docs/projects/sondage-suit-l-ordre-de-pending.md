# Projet : le sondage `/drwil-start` suit l'ordre de réalisation de `pending.md`

**Statut** : cadré le 2026-10-28.
**Risque** : HIGH
**Maturité** : prêt
**Intention** : `docs/intentions/notes.md` (note du 2026-10-28 « L'ordre du sondage /drwil-start … »)

<!-- scope
files:
  - packages/drwil/templates/common/base/.githooks/briefs.mjs
  - packages/drwil/templates/common/base/.githooks/briefs-order.mjs
  - packages/drwil/templates/common/tools/claude/.claude/skills/start-a-workstream/SKILL.md
  - .githooks/state.test.mjs
  - .githooks/briefs.mjs
  - .githooks/briefs-order.mjs
  - docs/architecture.md
  - docs/projects/kit-mechanics.md
  - docs/contracts.md
  - .drwil/ia-first.json
  - packages/drwil/CHANGELOG.md
  - docs/intentions/notes.md
  - docs/projects/pending.md
  - docs/projects/journal.md
-->

## 1. Besoin

`docs/projects/pending.md` (section « Fiches cadrées, dans l'ordre de
réalisation ») fixe l'ordre dans lequel les fiches d'une version se font, et la
version 0.11.0 le dit : « une par session, dans l'ordre indiqué ». Le sondage
`/drwil-start` (`state.mjs briefs`) ne le lit pas : il trie les fiches prêtes
d'abord, puis par maturité, puis par priorité P1-P3, puis par chemin
(`scopedBriefs`, `.githooks/briefs.mjs`). Une fiche P3 peut donc être proposée
avant une fiche P2 qui doit passer avant elle, et le demandeur lance dans le
désordre sans le savoir.

Le sondage doit proposer les fiches dans l'ordre de `pending.md`, et rien
d'autre : une seule source d'ordre.

## Critères d'acceptation

(le contrat est à créer au lancement, avec son champ **Origine** ; ID à
attribuer à ce moment-là dans le registre.)

- `state.mjs briefs` liste les fiches d'une version dans l'ordre des lignes
  ouvertes de la section « Fiches cadrées » de `pending.md` (celle du HEAD
  commité), quelles que soient leur priorité et leur maturité — contrat à créer
- Une fiche pas prête (décisions ouvertes) garde sa place dans cet ordre, signalée
  « pas prête : N décision(s) à prendre d'abord », jamais reléguée à la fin — contrat à créer
- Une fiche absente de l'index est listée après les fiches indexées, dans l'ordre
  d'avant (prête, maturité, priorité, chemin) ; une fiche de garantie bloquante
  (QUA-088) reste seule listée — contrat à créer
- Le mode d'emploi du sondage (`.claude/skills/start-a-workstream/SKILL.md`) dit cet ordre et plus l'ancien — contrat à créer

## 2. Hors périmètre

- La découpe d'une fiche à plusieurs lots en sous-agents (autre fiche, à cadrer).
- Le contenu de `pending.md` et la mise en file (`queue`) : inchangés ; une file
  n'accepte toujours que des fiches prêtes.
- Un second champ d'ordre dans les fiches : l'ordre reste celui de l'index.

## 3. Contraintes

- `scopedBriefs` lit déjà l'index depuis le HEAD commité (`indexPriorities`) :
  réutiliser cette lecture, pas de seconde.
- `.githooks/briefs.mjs` fait 188 lignes (plafond 200) : le tri s'extrait dans
  briefs-order.mjs (gabarit et copie du dépôt, fichier à créer), sinon le fichier dépasse.
- Ajouter un hook touche la carte d'architecture et `docs/projects/kit-mechanics.md`.
- On n'édite que le gabarit, la copie du dépôt est régénérée (`npm run installer-depot`).
- Hooks modifiés : à déclarer dans « Contrats modifiés » au lancement.

## 4. Décisions

(validées par le demandeur le 2026-10-28)

1. L'ordre du sondage est celui de `pending.md`.
2. « Si elle doit être réalisée avant, alors elle doit être avant » : une fiche
   pas prête garde sa place, elle n'est pas reléguée à la fin ; c'est l'humain
   qui tranche ses décisions pour la débloquer.

## 5. Points à trancher

- Aucun : tout est tranché.

## 6. Increments

- **Lot 1 — tri par l'index** [IA] : briefs-order.mjs (fichier à créer ; position d'une fiche dans
  la section « Fiches cadrées »), `scopedBriefs` l'utilise, repli sur l'ancien tri
  pour les fiches non indexées ; tests de `.githooks/state.test.mjs` (ordre suivi,
  fiche pas prête en place, fiche non indexée après, garantie bloquante seule).
  Critère de sortie : `node .githooks/run-checks.mjs` vert.
- **Lot 2 — mode d'emploi et doc** [IA] : le `.claude/skills/start-a-workstream/SKILL.md` du gabarit, architecture,
  `kit-mechanics.md`, changelog, journal. Critère de sortie : `verify --agent` PASS.

## 7. Reprise

- **Dernier état** (2026-10-28) : cadré, prêt à lancer.
- **Travail non commité** : cette fiche et son entrée d'index.
- **Prochaine étape** : [humain] lancer le chantier (`/drwil-start`).

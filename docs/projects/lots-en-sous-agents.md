# Projet : une fiche à plusieurs lots se réalise lot par lot, un sous-agent neuf par lot

**Statut** : cadré le 2026-10-28.
**Risque** : HIGH
**Maturité** : prêt
**Intention** : `docs/intentions/notes.md` (note du 2026-10-28 « Découper une fiche à plusieurs lots … »)

<!-- scope
files:
  - packages/drwil/templates/common/base/.githooks/state.mjs
  - packages/drwil/templates/common/base/.githooks/state-cli.mjs
  - packages/drwil/templates/common/base/.githooks/state-lots.mjs
  - packages/drwil/templates/common/base/.githooks/state-cli-lots.mjs
  - packages/drwil/templates/common/base/.githooks/briefs.mjs
  - packages/drwil/templates/common/base/.githooks/briefs-lots.mjs
  - packages/drwil/templates/common/base/.githooks/state-texts.mjs
  - packages/drwil/templates/common/base/.githooks/state-messages-fr.mjs
  - packages/drwil/templates/common/base/.githooks/state-messages-en.mjs
  - packages/drwil/templates/common/base/.githooks/state-context-texts.mjs
  - packages/drwil/templates/common/tools/claude/.claude/skills/start-a-workstream/SKILL.md
  - .githooks/state.test.mjs
  - .githooks/state-lots.test.mjs
  - .githooks/state.mjs
  - .githooks/state-cli.mjs
  - .githooks/state-lots.mjs
  - .githooks/state-cli-lots.mjs
  - .githooks/briefs.mjs
  - .githooks/briefs-lots.mjs
  - .githooks/state-texts.mjs
  - .githooks/state-messages-fr.mjs
  - .githooks/state-messages-en.mjs
  - .githooks/state-context-texts.mjs
  - docs/architecture.md
  - docs/projects/kit-mechanics.md
  - packages/drwil/templates/common/base/docs/projects/kit-mechanics.md
  - docs/contracts.md
  - .drwil/ia-first.json
  - packages/drwil/CHANGELOG.md
  - docs/intentions/notes.md
  - docs/projects/pending.md
  - docs/projects/journal.md
  - .gitignore
  - packages/drwil/templates/common/base/gitignore
-->

## 1. Besoin

Une fiche à plusieurs lots se réalise aujourd'hui dans un seul sous-agent : le
contexte relu à chaque tour grossit lot après lot, et c'est lui qui pèse sur la
consommation (les chantiers de plus de 60 min du journal `.drwil/usage.jsonl`
portent plusieurs lots). La file de chantiers (QUA-037) sait déjà donner un
sous-agent neuf à chaque **fiche** ; elle ne sait pas le faire pour chaque
**lot** d'une même fiche.

La mécanique doit, au lancement d'une fiche à lots, enchaîner un sous-agent neuf
par lot sur la même branche et la même PR, avec une seule clôture, sans rien
changer à ce qui est prouvé : scope, critères, `verify` et clôture restent ceux
de la fiche.

## Critères d'acceptation

(les contrats sont à créer au lancement, avec leur champ **Origine** ; ID à
attribuer à ce moment-là dans le registre.)

- Les lots d'une fiche sont lus dans sa section « Increments » (puces
  « **Lot N — titre** [IA|humain] ») et la commande `state.mjs lot` dit le lot
  courant, ceux qui sont faits et ceux qui restent — `QUA-166`
- `state.mjs lot next` passe au lot suivant seulement si le lot courant est
  commité (arbre propre) ; il ne passe jamais à un lot au-delà du dernier — `QUA-167`
- Le rappel d'état d'un chantier à lots nomme le lot courant et dit de ne traiter
  que lui — `QUA-168`
- Un lot confié à l'humain est sauté par l'enchaînement, nommé comme restant à faire, et
  rappelé à la clôture avec ce qui est attendu ; l'enchaînement continue sur les
  lots [IA] suivants — `QUA-169`
- La clôture reste unique : refusée tant qu'un lot [IA] n'est pas fait (un lot
  confié à l'humain n'est que rappelé : son critère est jugé par `verify`) ; une fiche à un
  seul lot (ou sans lot) se comporte comme avant — `QUA-170`
- Le mode d'emploi du lancement (`.claude/skills/start-a-workstream/SKILL.md`) dit
  qu'un sous-agent neuf traite chaque lot, la passation se faisant par les
  commits et la section « Reprise » de la fiche — `QUA-171`

## 2. Hors périmètre

- Le parallélisme entre lots : les lots d'une fiche dépendent souvent les uns des
  autres, ils restent séquentiels.
- La file de fiches et la file parallèle (worktrees) : inchangées.
- Un scope ou des critères par lot : ils restent ceux de la fiche.
- Les outils sans sous-agent (Gemini CLI…) : le chantier y reste en une session.

## 3. Contraintes

- state-cli.mjs et briefs.mjs font 188 lignes (plafond 200) : la lecture des
  lots et les sous-commandes vont dans des fichiers nouveaux (state-lots.mjs,
  state-cli-lots.mjs, briefs-lots.mjs), à créer dans le gabarit puis régénérés
  dans le dépôt (`npm run installer-depot`).
- Ajouter un hook touche la carte d'architecture et `docs/projects/kit-mechanics.md`.
- L'état n'est jamais écrit à la main : `lot next` passe par l'outil, comme les
  autres transitions.
- QUA-013 (un contrôle non exécuté n'est pas passé) : un lot dont l'état est
  inconnu n'est pas compté fait.
- Le lot courant est effacé avec le reste de l'état à la clôture et au retour en SCOPING.
- Hooks modifiés : à déclarer dans « Contrats modifiés » au lancement.

## 4. Décisions

(validées par le demandeur le 2026-10-28)

1. Un lot = un sous-agent neuf, sur la même fiche, la même branche et la même PR,
   une seule clôture.
2. Les lots sont séquentiels (ils dépendent les uns des autres).
3. La fiche passe avant les fiches à lots restantes de la 0.11.0
   (`cycle-de-vie-des-fiches`, `attestations-sur-l-effet-et-couvre`).
4. Un lot [humain] au milieu d'une fiche est sauté et rappelé à la clôture.
5. Le sous-agent du dernier lot clôt la fiche, comme aujourd'hui.
6. Entre deux lots : `verify --failed` seulement après un échec, la passe complète
   restant celle de la clôture.

## 5. Points à trancher

- Aucun : tout est tranché.

## 6. Increments

- **Lot 1 — lire les lots et le lot courant** [IA] : briefs-lots.mjs (lecture des
  puces et de leur étiquette), state-lots.mjs (lot courant, faits), `state.mjs lot`
  et `lot next`, messages fr et en ; tests de .githooks/state-lots.test.mjs (fichier à créer).
  Critère de sortie : `node .githooks/run-checks.mjs` vert.
- **Lot 2 — rappel d'état et clôture** [IA] : le rappel nomme le lot courant,
  la clôture refuse tant qu'un lot [IA] n'est pas fait, lot [humain] sauté et rappelé ;
  tests de `.githooks/state.test.mjs`. Critère de sortie : idem.
- **Lot 3 — mode d'emploi et doc** [IA] : le fichier SKILL.md du gabarit, architecture,
  `kit-mechanics.md`, changelog, journal. Critère de sortie : `verify --agent` PASS.

## Contrats modifiés

(aucun contrat existant n'est modifié ; hooks modifiés, déclarés comme la contrainte « Hooks modifiés » de la fiche le demande, validés par le demandeur le 2026-10-28)

- `.githooks/briefs.mjs` — réexporte `readLots` (lecture des lots) (validé par le demandeur le 2026-10-28).
- `.githooks/state-cli.mjs` — sous-commande `lot` (validé par le demandeur le 2026-10-28).
- `.githooks/state-context-texts.mjs` — rappel du lot courant et des lots [humain] (validé par le demandeur le 2026-10-28).
- `.githooks/state-messages-fr.mjs` — messages des lots (validé par le demandeur le 2026-10-28).
- `.githooks/state-messages-en.mjs` — messages des lots (validé par le demandeur le 2026-10-28).
- `.githooks/state-texts.mjs` — lignes de lot du contexte et du rappel (validé par le demandeur le 2026-10-28).
- `.githooks/state.mjs` — `start` et `move` enveloppés : lots oubliés, clôture refusée tant qu'un lot [IA] n'est pas fait (validé par le demandeur le 2026-10-28).

## 7. Reprise

- **Dernier état** (2026-10-28) : lots 1 à 3 réalisés et commités, contrats QUA-166 à QUA-171 créés ; reste la clôture.
- **Travail non commité** : cette fiche et son entrée d'index.
- **Prochaine étape** : [humain] lancer le chantier (`/drwil-start`).

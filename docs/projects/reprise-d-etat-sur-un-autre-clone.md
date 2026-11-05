# Projet : reprendre un chantier sur un autre clone d'une commande, sans état écrit à la main

**Statut** : cadré le 2026-11-05.
**Risque** : HIGH
**Maturité** : prêt
**Intention** : `docs/intentions/reprise-d-etat-sur-un-autre-clone.md`

<!-- scope
files:
  - packages/drwil/templates/common/base/.githooks/state-resume.mjs
  - packages/drwil/templates/common/base/.githooks/state-cli.mjs
  - packages/drwil/templates/common/base/.githooks/state-cli-commands.mjs
  - packages/drwil/templates/common/base/.githooks/state-messages-fr.mjs
  - packages/drwil/templates/common/base/.githooks/state-messages-en.mjs
  - packages/drwil/templates/common/base/.githooks/state-lots.mjs
  - packages/drwil/templates/common/base/.githooks/scope-gate.mjs
  - packages/drwil/templates/common/base/.githooks/scope-gate-texts.mjs
  - packages/drwil/templates/common/base/.githooks/scope-gate-trailers.mjs
  - packages/drwil/templates/common/base/docs/ia-first/7-governance-state.md
  - packages/drwil/templates/common/base/docs/projects/kit-mechanics.md
  - .githooks/state-resume.mjs
  - .githooks/state-cli.mjs
  - .githooks/state-cli-commands.mjs
  - .githooks/state-messages-fr.mjs
  - .githooks/state-messages-en.mjs
  - .githooks/state-lots.mjs
  - .githooks/scope-gate.mjs
  - .githooks/scope-gate-texts.mjs
  - .githooks/scope-gate-trailers.mjs
  - .githooks/state-resume.test.mjs
  - .githooks/state-lots.test.mjs
  - .githooks/scope-gate.test.mjs
  - docs/ia-first/7-governance-state.md
  - docs/projects/kit-mechanics.md
  - docs/architecture.md
  - docs/contracts.md
  - docs/features.md
  - .drwil/ia-first.json
  - packages/drwil/CHANGELOG.md
  - docs/intentions/reprise-d-etat-sur-un-autre-clone.md
  - docs/projects/pending.md
  - docs/projects/journal.md
-->

(`packages/drwil/templates/common/base/.githooks/state-cli.mjs` est à 200 lignes, le plafond : la
commande s'ajoute par une découpe, state-cli-commands.mjs du même dossier ;
`packages/drwil/templates/common/base/.githooks/scope-gate.mjs` est à 181 lignes : le trailer de lot
peut demander scope-gate-trailers.mjs du même dossier. Chaque fichier neuf est cité par la carte d'architecture et par
`kit-mechanics.md`.)

## 1. Besoin

L'état de gouvernance (`.drwil/state.json` (si présent)) est local, ignoré par Git. Sur une autre
machine ou un clone neuf, la branche `workstream/<fiche>` arrive par GitHub mais pas l'état : il est
absent (SCOPING) ou ancien. Le commit est alors refusé par la barrière de périmètre, le lancement aussi
(branche déjà existante, ou fiche déjà supprimée par la clôture), et aucune commande ne remet l'état
d'accord avec la branche ; écrire l'état à la main est interdit. Demande bloquante du demandeur, placée
en tête de file le 2026-11-05.

## Critères d'acceptation

(contrats à créer au lancement dans le registre, avec leur champ **Origine** ; IDs à attribuer à ce
moment-là, les trois suivants libres du registre et du catalogue.)

- Sur un clone neuf placé sur `workstream/<fiche>`, `node .githooks/state.mjs resume` remet l'état en
  BUILD sur cette fiche quand elle est présente, et en CLOSING quand un commit de clôture l'a supprimée et
  que la PR de la branche n'est pas fusionnée ; le commit suivant passe la barrière de périmètre, prouvé
  par un test qui clone un dépôt de chantier en cours — `QUA-245`
- Pour une fiche à plusieurs lots, chaque commit de lot porte le trailer `Drwil-Lot: N` et `resume`
  reprend le dernier lot lu dans l'historique de la branche — `QUA-246`
- `resume` refuse, sans rien écrire, quand l'historique ne prouve rien (branche qui n'est pas celle d'un
  chantier, fiche absente sans commit de clôture, PR fusionnée, état local déjà actif sur une autre
  fiche) et dit pourquoi ; il ne reconstruit jamais une décision humaine (fusion automatique, file,
  réouverture) : il dit qu'elle est à redemander — `QUA-247`

## Contrats modifiés

- `.githooks/scope-gate.mjs` — le hook `--trailer` ajoute `Drwil-Lot: N` au message quand la fiche active
  a des lots, en plus de `Drwil-Brief` ; aucun refus nouveau (validé par le demandeur le 2026-11-05)
- `.githooks/state-cli.mjs` — la commande `node .githooks/state.mjs resume` est aiguillée vers `.githooks/state-resume.mjs` (nouveau) ; pour rester sous 200 lignes, des commandes existantes passent sans changement dans `.githooks/state-cli-commands.mjs` (nouveau) ; aucune commande ne change de comportement ni de refus (validé par le demandeur le 2026-11-05)
- `.githooks/state-lots.mjs` — l'écriture du relevé des lots (`.drwil/lot.json` (si présent)) est exportée, pour que `resume` y recopie le dernier lot lu dans le trailer `Drwil-Lot` ; `lot`, `lot next` et le refus de clôture restent inchangés (validé par le demandeur le 2026-11-05)
- `.githooks/state-messages-fr.mjs` — messages de `resume` ajoutés (reprise en BUILD ou CLOSING, refus, décisions humaines à redemander) ; aucun message existant modifié (validé par le demandeur le 2026-11-05)
- `.githooks/state-messages-en.mjs` — mêmes messages de `resume`, en anglais ; aucun message existant modifié (validé par le demandeur le 2026-11-05)

## 2. Hors périmètre

- Versionner l'état sur la branche (écarté le 2026-11-05).
- Reconstruire EVIDENCE ou VERIFY : leur preuve est locale ; on reprend en BUILD et on rejoue
  `drwil verify`.
- Le chantier mené dans un worktree et repris depuis le dossier principal du même clone (chaque dossier
  a son état, déjà géré par `.githooks/worktree.mjs`).
- Le changement de branche inexpliqué constaté le 2026-11-05 (cadrage du ménage) : sujet distinct.

## 3. Contraintes

- `resume` ne prend aucune décision : il recopie ce que Git prouve ; c'est pourquoi l'agent peut le
  lancer (contrairement à `start`, geste humain).
- Écriture de l'état par l'outil seul, jamais à la main (règle « État de gouvernance »).
- Livrable : tout s'écrit dans le gabarit, puis `npm run installer-depot` ; les copies du dépôt suivent.
- Plafond de 200 lignes par fichier de code.

## 4. Décisions

- 2026-11-05 (demandeur) : une commande `node .githooks/state.mjs resume`, lançable par l'agent.
- 2026-11-05 (demandeur) : reconstruire BUILD (fiche présente) ou CLOSING (fiche supprimée par la
  clôture, PR ouverte) ; jamais EVIDENCE ni VERIFY.
- 2026-11-05 (demandeur) : le lot courant se lit dans un trailer `Drwil-Lot: N` des commits.
- 2026-11-05 (demandeur) : l'état reste local et se reconstruit ; pas d'état versionné.

Contrats concernés, inchangés : `QUA-166` (les lots d'une fiche et le lot courant), `QUA-179`
(lancer en « This folder » crée la branche du chantier), `QUA-116` (réouverture d'un chantier clos),
`QUA-137` (un hook modifié se déclare dans « Contrats modifiés »).

## 5. Points à trancher

Aucun.

## 6. Increments

- **Lot 1 — reprise et trailer de lot** [IA] : `resume` (BUILD, CLOSING, refus), trailer `Drwil-Lot`,
  messages, tests, les trois contrats créés, doc de l'état, carte, `kit-mechanics.md`, changelog.
  Critère de sortie : `drwil verify --evidence` rend `GOVERNANCE: PASS`.

## 7. Reprise

- **Dernier état** (2026-11-05) : cadré, pas lancé.
- **Travail non commité** : aucun.
- **Prochaine étape** : [humain] lancer par `/drwil-start` une fois la PR de cadrage fusionnée.

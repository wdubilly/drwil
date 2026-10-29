# Projet : la file attend la fusion, l'état revient en SCOPING à la fusion constatée, branche créée au lancement, sondage en choix unique

**Statut** : cadré le 2026-10-29 — fiche issue de la fusion avec `next-attend-la-fusion` (cadrée le 2026-10-26) ; décisions prises par le demandeur.
**Risque** : HIGH
**Maturité** : prêt
**Intention** : `docs/intentions/cloture-et-attestations.md` (partie « l'arrêt d'une file et ses comptes rendus vérifiés par un contrôle ») et `docs/intentions/notes.md` (trois notes du 2026-10-29)

<!-- scope
files:
  - packages/drwil/templates/common/base/.githooks/state.mjs
  - packages/drwil/templates/common/base/.githooks/state-cli.mjs
  - packages/drwil/templates/common/base/.githooks/state-transitions.mjs
  - packages/drwil/templates/common/base/.githooks/state-texts.mjs
  - packages/drwil/templates/common/base/.githooks/state-messages-fr.mjs
  - packages/drwil/templates/common/base/.githooks/state-messages-en.mjs
  - packages/drwil/templates/common/base/.githooks/worktree.mjs
  - packages/drwil/templates/common/tools/claude/.claude/hooks/start-poll.mjs
  - packages/drwil/templates/common/tools/claude/.claude/skills/start-a-workstream/SKILL.md
  - .githooks/state.test.mjs
  - .githooks/worktree.test.mjs
  - packages/drwil/test/kit.test.mjs
  - docs/recipes/working-with-branches.md
  - docs/contracts.md
  - .drwil/ia-first.json
  - packages/drwil/CHANGELOG.md
  - docs/intentions/notes.md
  - docs/projects/pending.md
  - docs/projects/journal.md
  - .githooks/state.mjs
  - .githooks/state-cli.mjs
  - .githooks/state-transitions.mjs
  - .githooks/state-texts.mjs
  - .githooks/worktree.mjs
-->

## 1. Besoin

Trois défauts du cycle de lancement et de clôture, vécus le 2026-10-28 et
consignés en notes le 2026-10-29 :

1. **L'état reste CLOSING après la fusion.** Le retour en SCOPING n'a lieu qu'au
   prochain `start` ou `next` : après la fusion de la PR du chantier, l'état dit
   « CLOSING, fiche supprimée » alors que tout est fini, et le cadrage suivant
   demande un geste de plus. La règle « jamais avant la fusion » reste juste
   (une CI rouge doit pouvoir rouvrir le chantier) : c'est le déclencheur, à la
   fusion constatée, qui manque.
2. **`next` ne vérifie pas la fusion** (fiche `next-attend-la-fusion`, fusionnée
   ici). `start` depuis CLOSING exige déjà que la PR du chantier soit fusionnée
   (`closingMerged`), mais `next` (qui lance la tête de file depuis SCOPING) ne
   le vérifie pas : si l'état est revenu en SCOPING avant la fusion (retour
   manuel, fusion automatique annulée), l'agent peut lancer le suivant sur une
   branche pas à jour. La consigne « la suivante après la fusion de la
   précédente » n'est qu'écrite dans `AGENTS.md`.
3. **Une file ne repart pas seule.** Une file décidée au lancement devrait
   enchaîner le chantier suivant dès que la fusion du précédent est constatée,
   sans geste de plus.
4. **Le lancement en « This folder » ne crée pas de branche.** Il passe en BUILD
   sur la branche courante, souvent la principale : c'est le seul refus de
   commit (QUA-017) qui force ensuite une branche. « New worktree » crée déjà
   `workstream/<fiche>`.
5. **Le sondage multi-choix revient vide.** Sous Copilot CLI, le champ `fiche` en
   tableau (`type: "array"`, `items.enum`), tel que le prescrit le skill, est
   revenu vide trois fois le 2026-10-28 malgré la case cochée ; le même champ en
   choix unique (`enum` seul) est lu. Cause non établie.

## Critères d'acceptation

(les contrats sont à créer au lancement, avec leur champ **Origine** ; IDs à
attribuer à ce moment-là dans le registre.)

- Lire l'état (`.githooks/state.mjs`) en CLOSING dont la PR est fusionnée (vérifié par
  `gh`, via `closingMerged`) ramène l'état en SCOPING et le dit ; PR ouverte,
  introuvable ou `gh` absent : l'état reste CLOSING et le dit, jamais un retour
  — contrat à créer
- `state.mjs next` refuse de lancer la tête de file tant que la PR du chantier
  précédent n'est pas fusionnée, et le dit ; PR introuvable ou `gh` absent :
  refus qui le dit, jamais un lancement — contrat à créer
- Une file décidée au lancement enchaîne le chantier suivant dès que la fusion
  du précédent est constatée, sans nouveau geste ; une file reprise dans une
  nouvelle session attend toujours le oui explicite de l'humain — contrat à
  créer
- Un lancement en « This folder » depuis la branche principale crée et bascule
  sur `workstream/<fiche>` depuis la branche principale à jour ; depuis une
  branche de chantier il la garde ; une branche déjà existante ou un arbre sale
  est refusé avec un message qui dit quoi faire — contrat à créer
- Le skill `/drwil-start` prescrit pour Copilot CLI un champ `fiche` en choix
  unique (`enum` seul), seul lu de façon fiable, et le hook lit cette réponse
  — contrat à créer

## Contrats modifiés

(à établir au lancement : QUA-017 reste inchangé (filet de sécurité) ; QUA-037
(file de chantiers) et le contrat de retour en SCOPING depuis CLOSING, dont
QUA-138, sont probablement modifiés. Le demandeur valide chaque puce.)

## 2. Hors périmètre

- Le compte rendu de clôture d'une file : reste une consigne.
- `drwil attest` et le verdict de recette : gestes humains, inchangés.
- La garde d'écriture sur le fichier d'acceptation (autre note, autre fiche).

## 3. Contraintes

- Réutiliser `closingMerged` et `noGhText` (`.githooks/close-branches.mjs`) : un
  seul code pour « la PR est-elle fusionnée » (comme `next-attend-la-fusion`).
- QUA-013 : un état inconnu (`gh` absent, PR introuvable) est un refus, jamais
  un retour automatique.
- Le retour en SCOPING efface l'autorisation de fusion automatique, comme
  aujourd'hui : jamais avant la fusion effective, jamais à la programmation.
- Lancer un chantier reste une décision humaine : la file enchaîne seulement ce
  que l'humain a décidé au lancement.
- Un fichier livré se modifie dans le gabarit (`packages/drwil/templates/`),
  copies régénérées par `npm run installer-depot`.

## 4. Décisions

(validées par le demandeur le 2026-10-29)

1. Périmètre : les trois notes (retour en SCOPING, branche au lancement,
   sondage), plus `next-attend-la-fusion` fusionnée ici ; lots séparés.
2. Déclencheur du retour : le rappel d'état (la lecture de `.githooks/state.mjs`) vérifie
   la fusion par `gh`.
3. File : le chantier suivant démarre seul à la fusion constatée ; `next`
   refuse tant que la PR précédente n'est pas fusionnée. Le compte rendu de
   clôture d'une file reste une consigne.
4. Fiches : fusion de `next-attend-la-fusion` dans celle-ci, sans enquête
   préalable sur le sondage.
5. Sondage : sans enquête, le skill prescrit le choix unique pour Copilot CLI.
   Conséquence acceptée : une file de plusieurs fiches ne se coche plus d'un
   sondage sous Copilot CLI (une fiche par sondage).
6. Branche : « This folder » crée `workstream/<fiche>` depuis la branche
   principale à jour dans tous les cas ; refus si la branche courante n'est pas
   fusionnée ou si l'arbre est sale.

## 5. Points à trancher

- Aucun : tout est tranché.

## 6. Increments

- **Lot 1 — la file attend la fusion et l'état revient en SCOPING** [IA] : `next` vérifie la fusion (`closingMerged`, `noGhText`) ; la lecture de l'état la vérifie aussi et revient en SCOPING ; la file enchaîne le chantier suivant ; messages fr et en ; tests de `.githooks/state.test.mjs` (fusionnée, ouverte, `gh` absent, file qui s'enchaîne, file reprise en nouvelle session) ; contrats et contrôles `tests-qua-<id>` ; ligne « Unreleased » du changelog. Critère de sortie : `node .githooks/run-checks.mjs` OK.
- **Lot 2 — branche créée au lancement en « This folder »** [IA] : création de `workstream/<fiche>` depuis la branche principale à jour, refus sur arbre sale ou branche existante ; recette `docs/recipes/working-with-branches.md` mise à jour ; tests ; contrat. Critère de sortie : idem.
- **Lot 3 — sondage en choix unique** [IA] : le skill (gabarit et sa copie) prescrit le choix unique pour Copilot CLI, le hook le lit ; test ; contrat. Critère de sortie : idem, `drwil verify --agent` PASS.

## 7. Reprise

- **Dernier état** (2026-10-29) : lots 1 et 2 réalisés sur `workstream/retour-scoping-branche-sondage`. Lot 1 : `settleClosing` et
  `nextHead` (QUA-176 à QUA-178, QUA-037 mis à jour). Lot 2 : `prepareBranch` dans `.githooks/state-transitions.mjs`, appelée par
  `start` avant l'écriture de l'état, et `createBranch` dans `.githooks/worktree.mjs` (fetch puis `git switch --no-track -c`) ;
  messages dans `.githooks/state-messages-fr.mjs` et `.githooks/state-messages-en.mjs` ; contrat QUA-179 et contrôle
  `tests-qua-179`, tests dans `.githooks/worktree.test.mjs`, recette et changelog. Le flux « branche créée à la main puis `start` »
  est conservé (branche gardée si elle porte le nom `workstream/<fiche>`). Plafond de 200 lignes (QUA-001) : la logique de
  décision est dans `.githooks/state-transitions.mjs`, non dans `.githooks/worktree.mjs` (193 lignes avant le lot).
- **Décision humaine** (2026-10-29) : le scope couvre `packages/drwil/test/kit.test.mjs` et `outils/banc.test.mjs` (commit séparé) ;
  le lancement depuis une branche non fusionnée d'un autre nom reste refusé (décision 6). Tests adaptés : QUA-142 et QUA-147 (retour
  sur la branche d'origine et suppression de `workstream/<fiche>` entre deux lancements), QUA-108 du banc (cadrage sur
  `cadrage/boutique`, fusionnée en avance rapide, puis lancement depuis `master`). Correctif au passage : la branche part de la
  principale locale si elle a des commits que `origin` n'a pas (sinon le cadrage non poussé disparaissait de l'arbre).
- **Travail non commité** : aucun.
- **Prochaine étape** : lot 3 — sondage en choix unique (skill gabarit et sa copie, `packages/drwil/templates/common/tools/claude/.claude/hooks/start-poll.mjs`, test, contrat). Section
  « Contrats modifiés » : QUA-037 modifié au lot 1 (phrase sur le retour en SCOPING), à valider par le demandeur ; QUA-138 et
  QUA-017 inchangés.

# Projet : retour en SCOPING à la fusion constatée, branche créée au lancement, sondage multi-choix lu

**Statut** : cadré le 2026-10-29 — décisions du périmètre, du déclencheur et de la file prises par le demandeur.
**Risque** : HIGH
**Maturité** : à affiner
**Intention** : `docs/intentions/notes.md` (trois notes du 2026-10-29)

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
2. **Une file ne repart pas seule.** Une file décidée au lancement devrait
   enchaîner le chantier suivant dès que la fusion du précédent est constatée,
   sans geste de plus.
3. **Le lancement en « This folder » ne crée pas de branche.** Il passe en BUILD
   sur la branche courante, souvent la principale : c'est le seul refus de
   commit (QUA-017) qui force ensuite une branche. « New worktree » crée déjà
   `workstream/<fiche>`.
4. **Le sondage multi-choix revient vide.** Sous Copilot CLI, le champ `fiche` en
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
- Une file décidée au lancement enchaîne le chantier suivant dès que la fusion
  du précédent est constatée, sans nouveau geste ; une file reprise dans une
  nouvelle session attend toujours le oui explicite de l'humain — contrat à
  créer
- Un lancement en « This folder » depuis la branche principale crée et bascule
  sur `workstream/<fiche>` depuis la branche principale à jour ; depuis une
  branche de chantier il la garde ; une branche déjà existante ou un arbre sale
  est refusé avec un message qui dit quoi faire — contrat à créer
- Le sondage `/drwil-start` de Copilot CLI, avec plusieurs fiches cochées, est
  lu complètement (une ou plusieurs fiches, dans l'ordre des options) — contrat
  à créer

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
   sondage multi-choix), en lots séparés.
2. Déclencheur du retour : le rappel d'état (la lecture de `.githooks/state.mjs`) vérifie
   la fusion par `gh`.
3. File : le chantier suivant démarre seul à la fusion constatée.

## 5. Points à trancher

- **Chevauchement avec `next-attend-la-fusion`** : cette fiche fait aussi
  vérifier la fusion à `next`. À la réalisation, laquelle passe en premier, et
  le lot 1 réutilise-t-il sa vérification ?
- **Cause du sondage vide** : reproduire d'abord (skill, hook `.claude/hooks/start-poll.mjs` ou
  schéma de Copilot CLI) ; si la cause est hors du dépôt, le lot 3 se limite à
  prescrire le choix unique dans le skill.
- **Comportement hors file au lancement de « This folder »** : la branche
  `workstream/<fiche>` est-elle créée aussi quand on est déjà sur une autre
  branche de travail non fusionnée ?

## 6. Increments

- **Lot 1 — retour en SCOPING à la fusion constatée, file comprise** [IA] : la lecture de l'état vérifie la fusion (`closingMerged`) et revient en SCOPING ; la file enchaîne le chantier suivant ; messages fr et en ; tests de `.githooks/state.test.mjs` (fusionnée, ouverte, `gh` absent, file qui s'enchaîne, file reprise en nouvelle session) ; contrats et contrôles `tests-qua-<id>` ; ligne « Unreleased » du changelog. Critère de sortie : `node .githooks/run-checks.mjs` OK.
- **Lot 2 — branche créée au lancement en « This folder »** [IA] : création de `workstream/<fiche>` depuis la branche principale à jour, refus sur arbre sale ou branche existante ; recette `docs/recipes/working-with-branches.md` mise à jour ; tests ; contrat. Critère de sortie : idem.
- **Lot 3 — sondage multi-choix lu** [IA] : reproduction et cause d'abord, puis correctif du hook ou du skill ; test ; contrat. Critère de sortie : idem, `drwil verify --agent` PASS.

## 7. Reprise

- **Dernier état** (2026-10-29) : cadré, à affiner (trois points à trancher).
- **Travail non commité** : aucun.
- **Prochaine étape** : [humain] trancher les points de la section 5, puis lancer le chantier (`/drwil-start`).

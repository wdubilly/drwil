# Projet : la fusion automatique s'enchaîne dans l'ordre par un outil, pas par une consigne

**Statut** : cadré le 2026-10-28.
**Risque** : HIGH
**Maturité** : prêt
**Intention** : `docs/intentions/cloture-et-attestations.md` (partie « la file et la fusion »)

<!-- scope
files:
  - packages/drwil/templates/common/base/.githooks/merge-auto.mjs
  - packages/drwil/templates/common/base/.githooks/state-context-texts.mjs
  - packages/drwil/templates/common/base/docs/projects/kit-mechanics.md
  - packages/drwil/templates/common/tools/claude/.claude/skills/start-a-workstream/SKILL.md
  - .githooks/merge-auto.mjs
  - .githooks/merge-auto.test.mjs
  - .githooks/state-context-texts.mjs
  - docs/architecture.md
  - docs/projects/kit-mechanics.md
  - docs/contracts.md
  - .drwil/ia-first.json
  - packages/drwil/CHANGELOG.md
  - docs/projects/pending.md
  - docs/projects/journal.md
-->

## 1. Besoin

La fusion automatique d'une PR (« Automatic merge » au lancement) suit un ordre
sûr : attendre que GitHub ait calculé la PR, la mettre à jour si elle est en retard
(`BEHIND`), programmer `gh pr merge --auto --merge`, vérifier qu'elle est
programmée, puis suivre la PR (`pr-watch`). Cet ordre ne vit que dans un texte
(`.githooks/state-context-texts.mjs`, le skill `start-a-workstream`) : aucun
outil ne l'exécute ni ne le vérifie.

Constaté le 2026-10-28, deux fois de suite : un sous-agent (PR #292) puis l'agent
principal (PR #293) ont programmé l'auto-merge **avant** la mise à jour de la
branche. Cela n'a pas bloqué les PR, mais c'est la même faille que toute consigne
non outillée : elle dépend de la mémoire de l'agent.

## Critères d'acceptation

(les contrats sont à créer au lancement, avec leur champ **Origine** ; ID à
attribuer à ce moment-là dans le registre.)

- `node .githooks/merge-auto.mjs <numéro>` enchaîne, dans cet ordre : attendre que
  GitHub ait calculé la PR, la mettre à jour si elle est `BEHIND`, programmer
  l'auto-merge, vérifier qu'il est programmé — contrat à créer
- L'outil ne programme jamais l'auto-merge sur une PR dont l'état n'est pas calculé
  ou pas à jour ; délai dépassé, `gh` absent ou refus (« Auto merge is not allowed
  for this repository ») : il le dit, avec la sortie à suivre, et ne prétend jamais
  que la fusion est programmée — contrat à créer
- Il ne s'exécute qu'avec l'autorisation « Automatic merge » donnée au lancement
  (lue dans l'état) ; sans elle il refuse — contrat à créer
- La consigne de l'état et le skill appellent cet outil au lieu de lister les
  commandes `gh` ; le suivi (`pr-watch`) et le retour en SCOPING après la fusion
  restent inchangés — contrat à créer

## 2. Hors périmètre

- `.githooks/pr-watch.mjs` et le retour en SCOPING : inchangés.
- La décision de fusion automatique (poll) et la fusion manuelle.

## 3. Contraintes

- Fichiers `.githooks/` sous 200 lignes (plafond) : un module dédié, ses messages
  en français et en anglais comme les autres outils.
- QUA-013 (un contrôle non exécuté n'est pas passé) : un état inconnu est un refus.
- Un hook ajouté touche la carte d'architecture et `docs/projects/kit-mechanics.md`
  (gabarit et copie), sinon les tests d'installation échouent.
- On n'édite que le gabarit ; la copie du dépôt est régénérée (`npm run installer-depot`).
  Le test de l'outil suit celui de `pr-watch` (`.githooks/pr-watch.test.mjs`).

## 4. Décisions

(proposées par l'agent, à valider par le demandeur au lancement)

1. L'outil est un module livré à part, appelé par la consigne, plutôt qu'une option
   de `.githooks/pr-watch.mjs` : un seul rôle par outil.

## 5. Points à trancher

- Aucun.

## 6. Increments

- **Lot 1 — l'outil** [IA] : merge-auto (outil à créer) (gabarit et copie), son test (à créer) (ordre, `BEHIND`, état non calculé, refus d'auto-merge, `gh` absent, sans autorisation) ; contrats et contrôles `tests-qua-<id>` ; carte d'architecture et `docs/projects/kit-mechanics.md` ; « Unreleased » du changelog.
- **Lot 2 — les consignes** [IA] : `.githooks/state-context-texts.mjs` (fr, en) et le skill appellent l'outil.

Critère de sortie : `node .githooks/run-checks.mjs` OK, `drwil verify --agent` PASS.

## 7. Reprise

- **Dernier état** (2026-10-28) : cadré, prêt à lancer.
- **Travail non commité** : aucun.
- **Prochaine étape** : [humain] lancer le chantier (`/drwil-start`).

# Projet : un skill de cadrage qui, en fin de cadrage, demande quoi faire de la PR (fusion automatique, manuelle, ou continuer)

**Statut** : cadré le 2026-10-29 — décisions prises par le demandeur.
**Risque** : HIGH
**Maturité** : prêt
**Intention** : `docs/intentions/cadrage-pris-en-compte-a-la-fusion.md`

<!-- scope
files:
  - packages/drwil/templates/common/tools/claude/.claude/skills/scope-a-workstream/SKILL.md
  - packages/drwil/templates/common/tools/claude/.claude/hooks/start-poll.mjs
  - packages/drwil/templates/common/tools/claude/.claude/hooks/prompt-hook.mjs
  - packages/drwil/templates/common/base/.githooks/merge-auto.mjs
  - packages/drwil/templates/common/base/.githooks/state.mjs
  - packages/drwil/templates/common/base/.githooks/state-texts.mjs
  - .githooks/merge-auto.test.mjs
  - .githooks/state.test.mjs
  - docs/recipes/working-with-branches.md
  - docs/contracts.md
  - .drwil/ia-first.json
  - packages/drwil/CHANGELOG.md
  - docs/intentions/cadrage-pris-en-compte-a-la-fusion.md
  - docs/architecture.md
  - docs/projects/kit-mechanics.md
  - docs/projects/pending.md
  - docs/projects/journal.md
  - .githooks/merge-auto.mjs
  - .githooks/state.mjs
  - .githooks/state-texts.mjs
-->

## 1. Besoin

Un cadrage poussé n'est pris en compte par `/drwil-start` qu'une fois sa PR
fusionnée (l'outil lit les fiches du dossier courant, donc de la branche
principale) ; rien n'avertit de cette étape, et la fusion automatique n'est
aujourd'hui décidée qu'au lancement d'un chantier (`drwil-merge`), jamais à la
fin d'un cadrage. Constaté le 2026-10-29 : quatre PR de cadrage et de notes
sont restées à fusionner à la main.

Le demandeur veut, à la fin d'un cadrage, un sondage qui demande quoi faire de
la PR, sur le modèle de `drwil-merge`, dans un **skill propre au cadrage**.

## Critères d'acceptation

(les contrats sont à créer au lancement, avec leur champ **Origine** ; IDs à
attribuer à ce moment-là dans le registre.)

- Un skill de cadrage pose, à la fin d'un cadrage poussé, un sondage à trois
  réponses : « Automatic merge », « Manual merge », « Continue scoping » ;
  jamais de réponse par défaut ni recommandée — contrat à créer
- La réponse « Automatic merge », lue par le hook, autorise `.githooks/merge-auto.mjs`
  pour la PR de cadrage en SCOPING (aujourd'hui refusé : `auto_merge` n'existe
  qu'après un lancement) ; sans cette réponse, `.githooks/merge-auto.mjs` refuse comme
  avant — contrat à créer
- La réponse « Continue scoping » laisse la PR ouverte et garde la même branche
  pour les cadrages suivants (une branche, une PR) ; « Manual merge » ne
  programme rien — contrat à créer

## Contrats modifiés

(à établir au lancement : le contrat qui dit que `.githooks/merge-auto.mjs` exige
`auto_merge` de l'état est probablement modifié, pour accepter l'autorisation
donnée à la fin d'un cadrage ; le demandeur valide chaque puce.)

## 2. Hors périmètre

- Le signalement « non pris en compte » des cadrages poussés mais non fusionnés :
  décidé le 2026-10-29 de ne rien ajouter, seul le sondage est livré.
- Le sondage de lancement `drwil-merge` : inchangé.
- Les autres outils que Claude Code et Copilot CLI.

## 3. Contraintes

- Fusion automatique : jamais sans la réponse « Automatic merge » (QUA-019, et
  consigne de `AGENTS.md`) ; `.githooks/merge-auto.mjs` reste la seule voie.
- Le hook lit le sondage, jamais l'agent ; aucune réponse par défaut (comme
  `drwil-start`).
- Sous Copilot CLI, champ en choix unique (`enum` seul), seul lu de façon fiable
  (décision de la fiche `retour-scoping-branche-sondage`).
- Un fichier livré se modifie dans le gabarit (`packages/drwil/templates/`),
  copies régénérées par `npm run installer-depot`.

## 4. Décisions

(validées par le demandeur le 2026-10-29)

1. Sondage dans un skill propre au cadrage.
2. Aucun signalement des cadrages non fusionnés, seulement le sondage.
3. « Continuer à cadrer » : plusieurs cadrages sur une même branche et une PR.
4. Pile de PR : `merge-auto` ordonnée suffit, pas d'ordre dans le sondage.

## 5. Points à trancher

- Aucun : tout est tranché.

## 6. Increments

- **Lot 1 — le skill de cadrage et son sondage** [IA] : skill `scope-a-workstream`, lecture de la réponse par le hook (`.claude/hooks/start-poll.mjs`), trois réponses, aucune par défaut ; tests ; contrat et son contrôle `tests-qua-<id>`. Critère de sortie : `node .githooks/run-checks.mjs` OK.
- **Lot 2 — fusion automatique autorisée en SCOPING** [IA] : `.githooks/merge-auto.mjs` accepte l'autorisation donnée par la réponse « Automatic merge » du cadrage, refuse sans elle ; « Continue scoping » et « Manual merge » ne programment rien ; recette `docs/recipes/working-with-branches.md`, README et ligne « Unreleased » du changelog, carte et `kit-mechanics.md` ; contrats. Critère de sortie : idem, `drwil verify --agent` PASS.

## 7. Reprise

- **Dernier état** (2026-10-29) : cadré, prêt à lancer.
- **Travail non commité** : aucun.
- **Prochaine étape** : [humain] lancer le chantier (`/drwil-start`), après `retour-scoping-branche-sondage` (même code d'état).

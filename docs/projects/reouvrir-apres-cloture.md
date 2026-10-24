# Projet : rouvrir un chantier dont la PR révèle un défaut après la clôture

**Statut** : en cours depuis le 2026-10-24 (lots 1 et 2 réalisés sur la branche `workstream/reouvrir-apres-cloture`).
**Risque** : HIGH
**Maturité** : prêt
**Intention** : `docs/intentions/defaut-revele-apres-la-cloture.md` (et la note du 2026-10-23 de `docs/intentions/notes.md` sur la CI rouge après le commit de clôture)

<!-- scope
files:
  - packages/drwil/templates/common/base/.githooks/state.mjs
  - packages/drwil/templates/common/base/.githooks/state-cli.mjs
  - packages/drwil/templates/common/base/.githooks/state-texts.mjs
  - packages/drwil/templates/common/base/.githooks/close.mjs
  - packages/drwil/templates/common/base/.githooks/scope-gate.mjs
  - packages/drwil/templates/common/base/.githooks/detour.mjs
  - .githooks/state.test.mjs
  - .githooks/close.test.mjs
  - .githooks/scope-gate.test.mjs
  - packages/drwil/test/cycle.test.mjs
  - packages/drwil/templates/common/base/AGENTS.md
  - AGENTS.md
  - packages/drwil/templates/common/base/docs/recipes/working-with-branches.md
  - packages/drwil/templates/common/tools/claude/.claude/skills/start-a-workstream/SKILL.md
  - docs/contracts.md
  - .drwil/ia-first.json
  - packages/drwil/CHANGELOG.md
-->

(Les copies installées, `.githooks/`, `.claude/` et la recette, sont couvertes
par `scopeMirrors` : on n'édite que le gabarit, puis `npm run installer-depot`.
`AGENTS.md` du dépôt n'est pas une copie : il s'édite à part, en français.)

## 1. Besoin

Un défaut peut n'apparaître qu'après le commit de clôture, une fois la PR
poussée : analyse CodeQL le 2026-10-21 (expression régulière polynomiale
dans `packages/drwil/src/closure.ts`), CI rouge sur la PR #213 le
2026-10-23 (test du banc, motif QUA-108). À ce moment, l'agent n'a plus
aucun chemin gouverné :
- depuis CLOSING, la seule transition est SCOPING ;
- la fiche est supprimée, son cadrage ne peut plus s'élargir ;
- la barrière de périmètre n'accepte le code qu'en BUILD ;
- un détour ne s'ouvre qu'en BUILD, et part de la branche principale, où
  le code fautif n'est pas encore.

Les deux fois, il a fallu passer par l'entretien courant et une PR à part,
puis des gestes humains. Résultat attendu : l'agent rouvre lui-même le
chantier sur sa branche, corrige, et clôt de nouveau.

## Critères d'acceptation

(contrats créés au lancement, avec leur champ **Origine** : QUA-116,
QUA-117, QUA-118.)

- En CLOSING, quand la PR du chantier est ouverte et non fusionnée, l'agent
  rouvre le chantier seul, par une commande : la fiche revient telle
  qu'elle était au commit qui précède la clôture, l'activité repasse en
  BUILD sur elle, sur la même branche, sans réécrire l'historique ni
  pousser en force ; une fusion automatique programmée est annulée avant
  tout ; la réouverture est refusée, sans rien changer, hors CLOSING, sur
  une PR fusionnée ou fermée, et quand l'état de la PR est inconnu (`gh`
  absent) — `QUA-116`
- Un correctif de réouverture qui change les règles du jeu (contrat
  existant modifié ou retiré, hook, seuil, barrière, CI) voit ses commits
  refusés par la barrière de périmètre jusqu'au oui de l'humain, comme un
  détour ; un correctif ordinaire passe sans personne — `QUA-117`
- La nouvelle clôture passe comme la première : une seule entrée de
  journal pour le chantier (mise à jour, jamais doublée), une seule ligne
  de consommation, preuve de clôture réécrite sur le nouveau commit
  vérifié ; l'autorisation de fusion automatique et la file décidées au
  lancement sont gardées — `QUA-118`

## 2. Hors périmètre

- Faire attendre la clôture le verdict de l'analyse de la forge (CodeQL)
  pour que ces défauts tombent encore en BUILD : question gardée dans
  l'intention.
- Un défaut révélé après la fusion : il relève d'un nouveau chantier ou de
  l'entretien courant, comme aujourd'hui.
- Une huitième activité (FIX) ou un détour depuis CLOSING : écartés au
  cadrage.
- Copilot CLI et Gemini CLI : la commande est la même pour tous ; seule la
  recette du sondage de Claude Code (`start-a-workstream`) cite le cas.

## 3. Contraintes

- Commande dans `.githooks/state.mjs` (par exemple `node .githooks/state.mjs
  reopen`), livrée dans le gabarit, réservée à aucun outil.
- Fiche restaurée depuis Git (le commit de clôture est celui qui l'a
  supprimée sur la branche), dans un commit qui ne touche que la fiche ;
  son cadrage peut ensuite s'élargir comme d'habitude, dans un commit
  séparé.
- Une branche dont la fusion automatique est programmée ne reçoit aucun
  push : l'annulation (`gh pr merge --disable-auto`) passe avant le premier
  commit, et son échec refuse la réouverture.
- Un appel `gh` ou `git` qui échoue refuse la réouverture, jamais ne la
  laisse passer (QUA-013, un contrôle non exécuté n'est pas passé).
- L'exception des règles du jeu réutilise celle du détour (QUA-050, détour
  pour un défaut préalable : `rulesFiles`, ajout pur au registre, oui de
  l'humain en terminal), sans la dupliquer.
- Aucun contrat existant modifié : la règle de transition de CLOSING
  (seul SCOPING) reste vraie pour `move` ; la réouverture est une commande à
  part, comme le détour.

## Contrats modifiés

Le rejeu par la branche principale (QUA-113) garde la version de la PR des
hooks déclarés ici : leurs tests portent les nouveaux contrats QUA-116,
QUA-117 et QUA-118, que les tests de la branche principale ignorent.

- `.githooks/state.mjs` : réouverture (`reopen`), état « rouvert » (QUA-116)
- `.githooks/state-cli.mjs` : commande `reopen` (QUA-116)
- `.githooks/state-texts.mjs` : textes de la réouverture (QUA-116)
- `.githooks/close.mjs` : nouvelle clôture sans doublon (QUA-118)
- `.githooks/scope-gate.mjs` : correctif qui change les règles du jeu (QUA-117)
- `.githooks/detour.mjs` : alignement sur l'état rouvert (QUA-116)

## 4. Décisions

- 2026-10-23 — Rouvrir le chantier sur sa branche, plutôt qu'un détour
  depuis CLOSING ou une activité FIX dédiée (demandeur).
- 2026-10-23 — L'agent rouvre seul, borné : PR ouverte non fusionnée,
  fusion automatique annulée d'abord, oui de l'humain pour un correctif qui
  change les règles du jeu (demandeur).
- 2026-10-23 — Un retour en BUILD après la clôture réécrit la preuve du
  chantier sur le nouveau commit vérifié (réponse à la troisième question
  de l'intention).

## 5. Points à trancher

(aucun)

## 6. Increments

- **Lot 1 — réouverture** [IA] : commande de réouverture, conditions et
  refus, annulation de la fusion automatique, restauration de la fiche ;
  exception des règles du jeu dans la barrière ; tests dans un dépôt
  temporaire avec un `gh` simulé (PR ouverte, fusionnée, fermée, inconnue ;
  fusion auto programmée ; correctif ordinaire et correctif qui touche un
  hook). Critère de sortie : tests des deux premiers contrats verts.
- **Lot 2 — nouvelle clôture et recettes** [IA] : `.githooks/close.mjs` met à jour
  l'entrée de journal et la ligne de consommation au lieu de les doubler,
  et réécrit la preuve ; cycle complet testé (clôture, réouverture,
  correctif, nouvelle clôture) dans `packages/drwil/test/cycle.test.mjs` ;
  `AGENTS.md` (dépôt et gabarit), recette des branches, sondage de Claude
  Code ; contrats au registre et contrôles `tests-qua-<id>` déclarés ;
  ligne « Unreleased » du changelog. Critère de sortie :
  `node .githooks/run-checks.mjs` OK, `drwil verify --agent` PASS.

## 7. Reprise

- **Dernier état** (2026-10-24) : lots 1 et 2 réalisés ; contrats QUA-116,
  QUA-117, QUA-118 au registre, contrôles `tests-qua-116` à `tests-qua-118`.
- **Travail non commité** : aucun.
- **Prochaine étape** : [IA] preuves, verify, clôture.

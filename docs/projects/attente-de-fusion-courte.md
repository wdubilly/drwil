# Projet : la fusion d'une PR s'attend sans tourner à vide, et les retouches de cadrage se regroupent

**Statut** : cadré le 2026-11-14 ; décisions D1 à D3 tranchées le 2026-11-14.
**Risque** : HIGH
**Maturité** : prêt
**Intention** : `docs/intentions/attente-de-fusion-courte.md`

<!-- scope
files:
  - packages/drwil/templates/common/base/.githooks/pr-watch*.mjs
  - .githooks/pr-watch.mjs
  - .githooks/pr-watch-main.mjs
  - .githooks/pr-watch.test.mjs
  - packages/drwil/templates/common/tools/claude/.claude/skills/scope-a-workstream/SKILL.md
  - .claude/skills/scope-a-workstream/SKILL.md
  - packages/drwil/templates/common/tools/claude/.claude/skills/start-a-workstream/SKILL.md
  - .claude/skills/start-a-workstream/SKILL.md
  - .drwil/ia-first.json
  - docs/contracts.md
  - docs/architecture.md
  - docs/intentions/attente-de-fusion-courte.md
  - docs/projects/pending.md
  - docs/projects/journal.md
  - packages/drwil/CHANGELOG.md
-->

## 1. Besoin

Le 2026-11-14, huit PR de documentation menées à la suite (#431 à #438) ont fait attendre le demandeur, alors que la
CI d'une PR de doc seule dure 1 min 40 s (PR #438). Deux causes (détail : intention d'origine) :

- `.githooks/pr-watch.mjs` rend « verte » (code 0) dès que la CI est verte, même quand la fusion automatique est
  programmée et pas encore faite : l'agent le relance en boucle. Et l'état « fusionnée » de la forge arrive parfois
  plusieurs minutes après le commit de fusion sur la branche principale (PR #431 et #437).
- Chaque retouche de cadrage a sa PR, et paie branche, contrôles, CI et fusion.

## Critères d'acceptation

- Fusion automatique programmée et CI verte : `pr-watch` attend la fusion au lieu de rendre « verte », dans le même
  délai global (30 minutes) ; sans fusion programmée, il rend « verte » comme aujourd'hui — `QUA-100`
- La PR est tenue pour fusionnée dès que son commit de tête est contenu dans la branche principale distante (après
  `git fetch`), sans attendre l'état de la forge ; même méthode sur GitHub et GitLab ; le suivi de la CI de la
  branche principale (QUA-251) part de ce commit de fusion — `QUA-100`
- Un commit de tête absent de la branche principale et une forge qui dit « fermée » restent « fermée sans fusion »
  (code 1) : jamais une fusion supposée — `QUA-100`
- Les retouches de cadrage d'une même conversation vont d'office sur une seule branche et une seule PR ; sa fusion
  est programmée quand un lancement (`/drwil-start`) a besoin d'une fiche qu'elle porte, à la demande de l'humain, ou
  proposée en fin d'échange ; une retouche n'est jamais poussée sur une branche dont la fusion est déjà programmée —
  `QUA-314`
- Tests : fusion programmée suivie jusqu'à la fusion ; forge en retard (état ouvert, commit déjà dans la branche
  principale) vue fusionnée ; GitLab ; PR fermée sans fusion ; délai dépassé — `QUA-100`

## Contrats modifiés

- `QUA-100` — ancien critère : « Le suivi de la CI d'une PR dit verte, fusionnée ou rouge, jamais « verte » sans l'avoir vu » ; la fusion n'était lue que dans l'état de la forge et « verte » rendu avant une fusion programmée — raison : attendre la fusion programmée et la lire dans la branche principale, sur GitHub comme sur GitLab (validé par le demandeur le 2026-11-14)
- `.githooks/pr-watch.mjs` — attend la fusion programmée, la lit dans la branche principale (validé par le demandeur le 2026-11-14)
- `.githooks/pr-watch-main.mjs` — reçoit la détection de la fusion par git, et le suivi de la branche principale part de ce commit de fusion (validé par le demandeur le 2026-11-14)
- `.githooks/pr-watch.test.mjs` — tests de l'attente de fusion et de la forge en retard (validé par le demandeur le 2026-11-14)

## 2. Hors périmètre

- `merge-auto` (`.githooks/merge-auto.mjs`) : la programmation de la fusion ne change pas.
- Les durées des contrôles et de la CI : déjà courtes pour une PR de doc (mesure de l'intention d'origine).

## 3. Contraintes

- Reproduire d'abord : un test où la forge dit « ouverte » alors que le commit est dans la branche principale échoue
  contre le code actuel.
- « Non exécuté » n'est jamais « passé » (QUA-013) : `git fetch` en échec ou délai atteint rendent « non exécuté ».
- La détection de la fusion va dans `.githooks/pr-watch-main.mjs` (128 lignes) : `.githooks/pr-watch.mjs` est à 188
  lignes sur un plafond de 200 (QUA-001).
- On édite le gabarit puis `npm run installer-depot` (QUA-018) ; couverture à 100 % des hooks (QUA-004).

## 4. Décisions

- D1 (2026-11-14) : regroupement d'office des retouches de cadrage, fusion au besoin (lancement, demande, fin
  d'échange) — réponse du demandeur.
- D2 (2026-11-14) : même détection par git sur GitHub et GitLab — réponse du demandeur.
- D3 (2026-11-14) : thème Expérience au quotidien, en tête de file après `docs/projects/journal.md`
  — réponse du demandeur.

## 5. Points à trancher

Aucun.

## 6. Increments

- **Lot 1 — attente de fusion** [IA] : tests en échec d'abord ; détection de la fusion dans `.githooks/pr-watch-main.mjs`, attente de la fusion
  programmée, GitLab ; QUA-100 réécrit ; `npm run installer-depot`. Critère de sortie : tests de
  `.githooks/pr-watch.test.mjs` verts, couverture des hooks à 100 %.
- **Lot 2 — regroupement des retouches de cadrage** [IA] : skills de cadrage et de lancement, contrat créé et son
  contrôle, carte, ligne « Unreleased » du CHANGELOG, intention d'origine résumée au journal et retirée. Critère de
  sortie : `node .githooks/run-checks.mjs` sans échec, `drwil verify --agent` en `GOVERNANCE: PASS`.

## 7. Reprise

- **Dernier état** (2026-11-17) : lots 1 et 2 faits ; QUA-314 créé.
- **Prochaine étape** : vérification et clôture.

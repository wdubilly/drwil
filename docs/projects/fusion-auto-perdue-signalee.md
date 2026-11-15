# Projet : une fusion automatique qui n'est plus programmée est dite par le suivi de PR

**Statut** : cadré le 2026-11-15.
**Risque** : HIGH
**Maturité** : prêt
**Intention** : `docs/intentions/notes.md` (note du 2026-11-15, PR de cadrage #441)

<!-- scope
files:
  - packages/drwil/templates/common/base/.githooks/pr-watch.mjs
  - packages/drwil/templates/common/base/.githooks/pr-watch-main.mjs
  - packages/drwil/templates/common/base/.githooks/merge-auto-forge.mjs
  - .githooks/pr-watch.mjs
  - .githooks/pr-watch-main.mjs
  - .githooks/merge-auto-forge.mjs
  - .githooks/pr-watch.test.mjs
  - .githooks/merge-auto-forge.test.mjs
  - docs/contracts.md
  - docs/intentions/notes.md
  - docs/projects/pending.md
  - docs/projects/journal.md
  - packages/drwil/CHANGELOG.md
-->

## 1. Besoin

Sur la PR de cadrage #441 (2026-11-15), `merge-auto` a programmé et vérifié la fusion (GitHub :
`auto_merge_enabled` à 23:16:57Z le 2026-11-14), puis `auto_merge_disabled` à 23:17:12Z, acteur : le compte du
demandeur ; aucun commit ni réouverture entre les deux. La CI est restée verte, la PR CLEAN et ouverte ; `pr-watch`
disait seulement « CI verte ». Relancer `merge-auto` l'a fusionnée (commit de fusion `c67968d9`, 00:21 heure locale).

Ce que dit le code, lu le 2026-11-15 :

- **Cause de la désactivation : non trouvée dans le code.** Le seul appel qui annule une fusion programmée est la
  réouverture (`gh pr merge <n> --disable-auto`, `.githooks/state-reopen.mjs:100`), qui exige l'activité CLOSING
  sur la branche de la PR (`.githooks/state-reopen.mjs:59-63`) : elle n'a pas tourné à ce moment (aucun commit de
  réouverture). `merge-auto` ne fait que `--auto --merge` (`.githooks/merge-auto-forge.mjs:99`) ; les tests simulent
  `gh` (`.githooks/state.test.mjs:1892`, `packages/drwil/test/cycle.test.mjs:886`) ; aucune compétence ni hook
  d'agent n'appelle `gh pr merge` hors de ces outils. Tout appel de `gh` porte le compte du demandeur : l'acteur ne
  distingue pas un geste humain d'un appel d'outil ou d'agent. Un chantier était mené en même temps (lots de
  consommation-copilot-cli, commits de 00:13 à 00:24) ; ses appels d'outils ne sont pas dans le dépôt : à chercher
  dans les journaux de session si l'on veut la cause.
- **Pourquoi `pr-watch` ne l'a pas vu : trouvé.** La lecture de la PR par `pr-watch` ne demande pas
  `autoMergeRequest` (`look`, `.githooks/merge-auto-forge.mjs:155`) ; `watch` rend « verte » sans rien savoir de la
  fusion programmée (`.githooks/pr-watch.mjs:155`).

Quelle que soit la cause, une fusion attendue qui n'est plus programmée doit se dire, avec le geste qui la relance.

## Critères d'acceptation

- Une PR ouverte, CI verte, non fusionnée et sans fusion automatique programmée (`autoMergeRequest` vide ; GitLab :
  `merge_when_pipeline_succeeds` faux) : `pr-watch` le dit en clair (« fusion automatique non programmée ») et donne
  la commande à lancer, `node .githooks/merge-auto.mjs <numéro>` ; il ne la lance jamais lui-même ; son code de
  sortie est inchangé — `QUA-100`
- Sur GitHub, quand l'historique de la PR montre une fusion automatique programmée puis désactivée (dernier
  événement `auto_merge_disabled`), le message dit « fusion automatique plus programmée : désactivée le <date> par
  <compte> » au lieu de « non programmée » — `QUA-100`
- Une fusion programmée qui cesse de l'être pendant que `pr-watch` attend la fusion est dite au tour suivant, sans
  attendre la fin du délai — `QUA-100`
- Historique de la PR illisible ou forge muette : le message le dit (« historique non lu ») et retombe sur « non
  programmée », jamais une cause supposée (QUA-013) — `QUA-100`
- Tests : PR verte sans fusion programmée (GitHub, GitLab) ; programmée puis désactivée, avec date et compte ;
  désactivée pendant l'attente ; historique illisible ; aucun appel à `gh pr merge` ; en échec contre le code
  actuel — `QUA-100`

## Contrats modifiés

- `QUA-100` — ancien critère : « dit « verte », « fusionnée » ou « rouge » » sans rien dire de la fusion automatique — raison : une PR verte non fusionnée dit si sa fusion automatique n'est pas (ou plus) programmée, avec la commande `merge-auto` à relancer, sans jamais la relancer (validé par le demandeur le 2026-11-15)
- `.githooks/pr-watch.mjs` — message « fusion automatique non programmée » ou « plus programmée », arrêt de l'attente quand elle cesse (validé par le demandeur le 2026-11-15)
- `.githooks/pr-watch-main.mjs` — reçoit la lecture de l'historique de la PR si `.githooks/pr-watch.mjs` dépasse son plafond (validé par le demandeur le 2026-11-15)
- `.githooks/merge-auto-forge.mjs` — `look` lit `autoMergeRequest` (GitLab : `merge_when_pipeline_succeeds`) (validé par le demandeur le 2026-11-15)

## 2. Hors périmètre

- Relancer `merge-auto` automatiquement : écarté, la désactivation peut être un geste voulu du demandeur (son compte
  en est l'acteur) ; relancer pourrait fusionner ce qu'il a arrêté.
- La cause de la désactivation du 2026-11-15 : non reproductible depuis le dépôt (voir le besoin).
- La programmation elle-même (`.githooks/merge-auto.mjs`) et la réouverture (`.githooks/state-reopen.mjs`) :
  inchangées.

## 3. Contraintes

- Après `docs/projects/attente-de-fusion-courte.md` : elle modifie le même code (`.githooks/pr-watch.mjs`,
  `.githooks/pr-watch-main.mjs`) et le même contrat (QUA-100), et y ajoute l'attente d'une fusion programmée que le
  troisième critère complète.
- `.githooks/pr-watch.mjs` est à 188 lignes sur un plafond de 200 (QUA-001) : la lecture de l'historique va dans
  `.githooks/pr-watch-main.mjs` ou un module ajouté.
- Chaque appel à `gh` ou `glab` a un délai ; un délai atteint vaut « non exécuté », jamais un succès (QUA-100,
  QUA-013).
- On édite le gabarit puis `npm run installer-depot` (QUA-018) ; couverture à 100 % des hooks (QUA-004).

## 4. Décisions

- 2026-11-15 (choix de cadrage, le plus sûr, validé par le demandeur) : dire et proposer la commande, jamais
  relancer `merge-auto` d'office.

## 5. Points à trancher

Aucun.

## 6. Increments

- **Lot 1 — fusion non programmée dite** [IA] : tests en échec d'abord ; `autoMergeRequest` lu par `look` (GitLab
  compris), historique GitHub de la PR, messages, arrêt de l'attente ; QUA-100 réécrit ; `npm run installer-depot` ;
  ligne « Unreleased » du CHANGELOG ; note d'origine retirée de `docs/intentions/notes.md`. Critère de sortie :
  `node .githooks/run-checks.mjs` sans échec, `drwil verify --agent` en `GOVERNANCE: PASS`.

## 7. Reprise

- **Dernier état** (2026-11-15) : cadrage terminé, contenu validé par le demandeur le 2026-11-15.
- **Prochaine étape** : [humain] `/drwil-start`, après la fusion de `docs/projects/attente-de-fusion-courte.md`.

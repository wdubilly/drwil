# Intention : la réouverture éprouvée sur une vraie PR et sous Windows

**Statut** : proposée le 2026-10-24 — limite du chantier « rouvrir un chantier
dont la PR révèle un défaut après la clôture » (journal du 2026-10-24).

## Besoin

La réouverture (QUA-116, un chantier clos dont la PR révèle un défaut se
rouvre sur sa branche) est prouvée par des tests à `gh` simulé : injecté dans
les tests des hooks, script du PATH dans le cycle complet de
`packages/drwil/test/cycle.test.mjs`, sauté sous Windows (un script du PATH
n'y est pas lancé sans shell). Elle n'a pas encore servi sur une vraie PR
GitHub, avec une vraie fusion automatique programmée puis annulée.

## Existant (vérifié le 2026-10-24)

- `.githooks/state-cli.mjs` (`reopen`) appelle `gh pr view <branche> --json
  number,state,autoMergeRequest` et `gh pr merge <n> --disable-auto`.
- Le test de cycle QUA-118 (nouvelle clôture d'un chantier rouvert) est sauté
  sous Windows ; la mécanique y reste couverte par les tests des hooks.

## Questions à trancher

- [décision] Un essai réel à la prochaine CI rouge après une clôture suffit-il,
  ou faut-il un scénario du banc ?
- [décision] Un `gh` simulé lançable sous Windows (`gh.cmd` et `shell`) pour
  ne plus sauter le cycle complet ?

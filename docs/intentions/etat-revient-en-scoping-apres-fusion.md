# Intention : l'état de gouvernance revient en SCOPING après la fusion d'un chantier

**Statut** : proposée le 2026-10-19 — limite du chantier « Compatibilité des agents, Copilot CLI tenu » (journal du 2026-10-19).

## Besoin

Après la clôture d'un chantier et la fusion de sa PR, l'état reste en CLOSING.
Lancer le suivant (`node .githooks/state.mjs start`) est alors refusé : « lancer
se fait depuis SCOPING, EXPECTATION ou REQUEST ». Il faut passer à la main par
`node .githooks/state.mjs move SCOPING`, geste que le demandeur n'a pas à
connaître.

## Existant (vérifié le 2026-10-19)

- `.githooks/state.mjs move SCOPING` fonctionne depuis CLOSING ; rien ne le lance après la fusion.

## Questions à trancher

- [décision] Où le faire : au retour sur la branche principale (hook
  post-merge ou post-checkout), au prochain `start`, ou dans `.githooks/close.mjs` ?
- [décision] Le faire seul quand la branche du chantier est fusionnée, ou
  demander le oui du demandeur ?

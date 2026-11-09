# Intention : les sondages posés sous Copilot CLI sont lus par le hook

**Statut** : proposée le 2026-11-09 — regroupe quatre notes en vrac (2026-10-29, 2026-11-07, 2026-11-08, 2026-11-09).

## Besoin

Sous Copilot CLI, la réponse à un sondage posé par `ask_user` n'est pas toujours lue par le hook : l'état ne change
pas et aucun message `[drwil]` ne revient. Le demandeur veut que les sondages du parcours (`drwil-start`,
`drwil-scope`, `drwil-attest`, `drwil-limite`) soient lus de façon fiable sous Copilot CLI, comme sous Claude Code.

## Existant

Relevé dans les notes du 2026-10-29 au 2026-11-09 :

- 2026-10-29 : le choix multiple (`type: array`, `items.enum`) revenait vide malgré la case cochée ; le choix unique
  est prescrit (QUA-180), la cause n'est pas établie, et une file de plusieurs fiches ne se coche plus d'un seul sondage.
- 2026-11-07 et 2026-11-08 : la réponse « Attester » du sondage d'attestation n'est pas enregistrée (constaté sur
  QUA-013 et QUA-019) ; `ask_user` prend `message` et `requestedSchema`, pas `question` et `choices` comme le sondage préparé par
  `drwil attest-poll`. L'agent n'exécute jamais `drwil attest` lui-même (voir QUA-069, QUA-236).
- 2026-11-09 : la réponse au sondage `drwil-start` n'a pas été lue (état resté en SCOPING, aucun message `[drwil]`),
  alors que cela fonctionne d'habitude ; la réponse au sondage `drwil-scope` de la session du 2026-11-09 n'a pas non plus
  ramené de message `[drwil]`.

## Questions à trancher

- [décision] Cause : hooks Copilot CLI non actifs dans la session, ou réponse `ask_user` non interceptée ? À reproduire
  d'abord, avec un essai réel et une trace du hook.
- [décision] Adapter le hook (forme de la réponse de `ask_user`) ou le format des sondages préparés pour Copilot ?
- [décision] Un signal visible quand les hooks ne sont pas actifs (aujourd'hui l'agent ne le voit que par l'absence de message).

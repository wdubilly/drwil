# Intention : les sondages sous Copilot CLI — la question « Nouveau worktree » et la lecture des réponses par le hook

**Statut** : proposée le 2026-10-26 — limite du chantier « un chantier par worktree, lancé d'un geste humain » (journal du 2026-10-26).

**Revu le 2026-11-13** : ménage — regroupe ici l'intention « sondages-lus-sous-copilot-cli », chacune avec son statut d'origine ; leur existant est repris à sa date, non revérifié.

## Besoin

Le sondage de lancement propose « Nouveau worktree » et le crochet de prompt lit la réponse pour créer le worktree frère (QUA-142). Le besoin : savoir si cela fonctionne aussi avec Copilot CLI, au-delà de Claude Code.

## Existant

Relevé le 2026-10-26 : le test du crochet couvre les formes de réponse Claude et Copilot (`packages/drwil/test/kit.test.mjs`). Un essai réel a été fait dans Copilot CLI le même jour : le sondage à une seule fiche (champs `fiche`, `drwil-merge`, `drwil-worktree` = « New worktree ») a créé le worktree frère et lancé le chantier, qui y a été mené jusqu'à la fusion de sa PR. Mis à jour le 2026-10-28 : le hook lit désormais le champ des fiches à choix multiple de Copilot CLI (type `array`, valeurs dans `items.enum`, QUA-165) et le skill dit de le poser ; la lecture tolère des valeurs séparées par des virgules ou une liste entre crochets. **Reste [humain]** : relever dans un essai réel la forme exacte de la réponse de Copilot CLI à un choix multiple et, si elle diffère, ajuster `.claude/hooks/start-poll.mjs` (gabarit) et le test de QUA-165.
**Non vérifié** : le sondage à choix multiple avec la question `drwil-parallel` (plusieurs worktrees d'un coup) dans Copilot CLI.

## Questions à trancher

- [décision] Faire un essai réel du sondage parallèle dans Copilot CLI avant la prochaine version, ou attendre un retour d'usage ?

## Suites regroupées (ménage du 2026-11-13)

Chaque partie reprend une ancienne intention, avec son statut, son besoin, son existant (à sa date, non revérifié) et ses questions.

### les sondages posés sous Copilot CLI sont lus par le hook (ex-« sondages-lus-sous-copilot-cli »)

Statut d'origine : proposée le 2026-11-09 — regroupe quatre notes en vrac (2026-10-29, 2026-11-07, 2026-11-08, 2026-11-09).

**Besoin** :

Sous Copilot CLI, la réponse à un sondage posé par `ask_user` n'est pas toujours lue par le hook : l'état ne change
pas et aucun message `[drwil]` ne revient. Le demandeur veut que les sondages du parcours (`drwil-start`,
`drwil-scope`, `drwil-attest`, `drwil-limite`) soient lus de façon fiable sous Copilot CLI, comme sous Claude Code.

**Existant** :

Relevé dans les notes du 2026-10-29 au 2026-11-09 :

- 2026-10-29 : le choix multiple (`type: array`, `items.enum`) revenait vide malgré la case cochée ; le choix unique
  est prescrit (QUA-180), la cause n'est pas établie, et une file de plusieurs fiches ne se coche plus d'un seul sondage.
- 2026-11-07 et 2026-11-08 : la réponse « Attester » du sondage d'attestation n'est pas enregistrée (constaté sur
  QUA-013 et QUA-019) ; `ask_user` prend `message` et `requestedSchema`, pas `question` et `choices` comme le sondage préparé par
  `drwil attest-poll`. L'agent n'exécute jamais `drwil attest` lui-même (voir QUA-069, QUA-236).
- 2026-11-09 : la réponse au sondage `drwil-start` n'a pas été lue (état resté en SCOPING, aucun message `[drwil]`),
  alors que cela fonctionne d'habitude ; la réponse au sondage `drwil-scope` de la session du 2026-11-09 n'a pas non plus
  ramené de message `[drwil]`.

**Questions** :

- [décision] Cause : hooks Copilot CLI non actifs dans la session, ou réponse `ask_user` non interceptée ? À reproduire
  d'abord, avec un essai réel et une trace du hook.
- [décision] Adapter le hook (forme de la réponse de `ask_user`) ou le format des sondages préparés pour Copilot ?
- [décision] Un signal visible quand les hooks ne sont pas actifs (aujourd'hui l'agent ne le voit que par l'absence de message).

# Intention : lancer les fiches d'un thème depuis `/drwil-start`

**Statut** : noté le 2026-11-14, demande du demandeur.

## Besoin

Depuis le 2026-11-14, la section « Fiches cadrées » de `docs/projects/pending.md` range les fiches sous un sous-titre
par thème (Expérience au quotidien, Mesure, Vitesse, Fiabilité, Plus tard). Le demandeur veut pouvoir demander un
lancement sur un thème : `/drwil-start` ne remonterait que les fiches de ce thème, et pourrait les mettre en file d'un
seul geste.

## Existant (2026-11-14)

- `/drwil-start` (skill `.claude/skills/start-a-workstream/SKILL.md`) propose les fiches dans l'ordre de l'index, 4
  options au plus ; les thèmes sont ignorés. Le thème en tête de l'index occupe donc les premières options ; un thème
  plus bas demande de taper chaque chemin sous « Other », ou une file par sondages enchaînés (`drwil-file`).
- `.githooks/briefs-order.mjs` (`cadredOrder`) lit la section jusqu'au titre `##` suivant et traverse les
  sous-titres `###` sans les retenir ; `node .githooks/state.mjs briefs --json` ne donne pas de thème.
- Les réponses au sondage sont lues par `.claude/hooks/start-poll.mjs` et `.claude/hooks/queue-poll.mjs`.

## Pistes

- `cadredOrder` retient le dernier sous-titre `###` de chaque fiche ; `state.mjs briefs --json` donne un champ `theme`.
- `/drwil-start <thème>` ne propose que les fiches de ce thème ; sans argument, une première question choisit le thème.
- Une option « Tout le thème (N fiches prêtes) », que le hook transforme en file dans l'ordre de l'index : elle lève
  la limite de 4 options.

## Questions à trancher

- Argument de la commande, question de thème dans le sondage, ou les deux ?
- L'option « tout le thème » : file séquentielle seulement, ou aussi parallèle (`drwil-parallel`) ?
- Une fiche pas prête du thème : visible avec sa raison et hors de la file (règle actuelle), ou refus de toute la
  file comme aujourd'hui pour une file cochée ?
- Garde-fous à garder : le lancement reste un geste humain lu par le hook ; seules les fiches prêtes entrent en file.

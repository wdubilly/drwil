# Intention : attendre la fusion d'une PR sans tourner à vide, et regrouper les retouches de cadrage

**Statut** : noté le 2026-11-14, demande du demandeur (« c'est long ») ; cadré le 2026-11-14 dans `docs/projects/attente-de-fusion-courte.md` (D1 regroupement d'office, fusion au besoin ; D2 GitHub et GitLab ; D3 Expérience au quotidien, en tête).

## Besoin

Ne pas faire attendre l'humain sans raison quand une PR est prête à fusionner, et ne pas payer le circuit complet
d'une PR pour chaque retouche de cadrage. Le demandeur veut que ce soit une règle du kit, pas une consigne de mémoire
d'un agent.

## Existant (2026-11-14)

Le 2026-11-14, huit PR de documentation ont été menées à la suite (#431 à #438). La CI d'une PR de doc seule est
déjà courte (PR #438 : 1 min 40 s de l'ouverture à la fusion ; tests du kit en 5 s, tranches sautées, `checks` en
1 min 20 s par reprise des verdicts) : ce ne sont pas les contrôles qui ont pris le temps. Deux causes :

- **L'attente de la fusion** : `.githooks/pr-watch.mjs` rend « verte » (code 0) dès que la CI est verte, même si la
  fusion automatique est programmée et pas encore faite ; l'agent le relance en boucle jusqu'à « fusionnée ». Or la
  forge met parfois plusieurs minutes à rendre l'état « fusionnée » (`gh pr view` disait OPEN, ou
  `mergeStateStatus` UNKNOWN, alors que le commit de fusion était déjà sur `origin/master` : PR #431 et #437).
- **Une PR par retouche de cadrage** : chaque retouche paie branche, contrôles locaux, CI et fusion. La skill de
  cadrage (`.claude/skills/scope-a-workstream/SKILL.md`, point 5) prévoit déjà plusieurs cadrages sur une même
  branche, mais seulement quand l'humain le dit.

## Pistes

- `pr-watch` : quand la fusion automatique est programmée et la CI verte, attendre la fusion au lieu de rendre
  « verte » ; tenir la PR pour fusionnée dès que son commit de tête est contenu dans la branche principale distante
  (`git fetch` puis `git merge-base --is-ancestor`), sans attendre l'état de la forge ; garder la limite de 30 minutes.
- Cadrage : l'agent regroupe d'office les retouches de cadrage d'une même conversation sur une branche et une PR, et
  ne programme la fusion qu'à la dernière (ou quand l'humain lance un chantier qui en dépend).

## Questions à trancher

- Regroupement d'office ou sur demande : quand l'agent sait-il que c'est « la dernière » retouche ? (fin de la
  conversation, lancement d'un chantier, demande explicite)
- GitLab : même détection par le commit de tête dans la branche principale ?
- Le contrat de `pr-watch` à modifier, et sa preuve (test sur un dépôt distant factice où la forge répond en retard).

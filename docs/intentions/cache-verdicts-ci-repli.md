# Intention : le cache de verdicts de la CI retombe sur le bon commit de la branche principale

**Statut** : proposée le 2026-11-11 — constat du suivi de la PR #405, rangée en 0.11.2 (optimisation des tests).

## Besoin

Une PR de documentation seule doit passer la CI en quelques minutes grâce à la reprise des verdicts (QUA-250). La PR #405 (cadrage, `docs/` seul) a pourtant gardé le job `checks` 8 minutes : `tests-qua-013` (115 s) et `tests-qua-015` (72 s), dont les `paths` ne contiennent pas `docs/**`, ont été rejoués.

## Existant

Relevé le 2026-11-11 dans le journal du run `ia-first` de la PR #405 (`.github/workflows/ia-first.yml`, étape « Restaurer les verdicts de la CI de la branche principale ») :

- La clé exacte `run-checks-verdicts-<sha de base>` (`dd680682`) n'a pas été trouvée ; le repli `restore-keys: run-checks-verdicts-` a restauré le cache du commit `6105cfeb`, 165 commits plus tôt. Un verdict d'un commit si ancien ne correspond plus aux empreintes : tout est rejoué.
- La CI de `dd680682` sur la branche principale est pourtant verte (push du 2026-11-10).
- **Cause racine (relevée le 2026-11-11)** : chaque push sur la branche principale saute tout quand son arbre est déjà prouvé par la CI verte de la PR fusionnée, y compris l'étape « Sauvegarder les verdicts de la branche principale » (étapes 8 à 14 « skipped » sur `dd680682`). Le dernier cache sauvegardé date du 2026-11-08 (`gh cache list`). Le repli par préfixe n'est pas en cause.

**Revu le 2026-11-11** : l'hypothèse du cache manquant est confirmée et expliquée ; cadré en projet (`docs/projects/cache-des-verdicts-de-ci-retabli.md`, D1 à D3 tranchées).

## Questions à trancher

Toutes tranchées le 2026-11-11 par le demandeur :

- Le push sauté sauvegarde quand même, à partir des verdicts de la PR fusionnée ; pas de repli par l'API ; l'âge du cache restauré est écrit au journal.

# Intention : que le pre-push connaisse le commit poussé, pas seulement la référence distante

**Statut** : proposée le 2026-10-26 — limite non traitée de la clôture « le pre-push reprend un verdict « ok » dont les fichiers n'ont pas changé » (journal du 2026-10-26).

## Besoin

`.githooks/pre-push` ne transmet à `run-checks` que les références distantes poussées (`DRWIL_PUSH_REFS`), pas le commit local poussé. Pour décider qu'un verdict repris (QUA-152) vaut pour ce qui part, `run-checks` exige un arbre propre et une seule référence poussée, égale à la branche courante : un `git push origin autre:courante` depuis une branche propre passerait pour le push de la branche courante. Le hook n'était pas dans le cadrage du chantier.

## Existant

Relevé le 2026-10-26 : `.githooks/pre-push` lit les lignes `<réf locale> <sha local> <réf distante> <sha distant>` sur son entrée standard, n'en garde que la référence distante, et ne transmet pas le sha local.

## Questions à trancher

- Faire transmettre le sha local poussé par `.githooks/pre-push` (déclarer un hook change les règles du jeu : oui du demandeur) pour comparer à `HEAD` plutôt qu'au nom de la branche ?

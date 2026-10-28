# Intention : notes en vrac

**Statut** : ouverte en permanence — notes rangées le 2026-10-28 (rangement du backlog).

## Besoin

Consigner une idée ou une intention d'une ligne à n'importe quel moment, y compris en plein chantier, sans la
cadrer ni la coder : `node .githooks/note.mjs "<texte>"`. Une note est toujours une intention, jamais un ordre
de coder. Quand elle mûrit, elle est promue en fiche d'intention et sa ligne est retirée d'ici.

## Existant

Relevé le 2026-10-21 : les notes sont ci-dessous, une ligne datée chacune, hors de l'index des chantiers.

## Questions à trancher

- [décision] Promouvoir en intention les notes qui ont mûri, et retirer les autres.

## Notes
- 2026-10-27 — Contrôler de façon déterministe que le corps d'une PR suit .github/pull_request_template.md (titres présents), en CI ou hook : aujourd'hui seule la consigne à l'agent l'impose (écart constaté sur la PR #273 du chantier plafond-200-lignes).
- 2026-10-28 — Découper une fiche à plusieurs lots : un sous-agent neuf par lot (même fiche, branche et PR, une seule clôture), sous-file de lots et lot courant dans l'état, arrêt sur un lot [humain] ; en tête des fiches restantes de la 0.11.0 (décidé avec le demandeur le 2026-10-28)
- 2026-10-28 — L'ordre du sondage /drwil-start (state.mjs briefs) doit être identique à l'ordre de réalisation de docs/projects/pending.md (Fiches cadrées) : une seule source d'ordre (décidé avec le demandeur le 2026-10-28)

# Mesures de référence : durée du job `checks` (2026-10-24)

Preuve historique de QUA-122 (durée du job `checks`). Ce document reprend
les mesures du chantier d'accélération de la CI (journal du 2026-10-24,
`node .githooks/glossary.mjs --journal acceleration-ci`, PR #221). Il est
stable : il ne reçoit pas de nouveau relevé (voir « Relevé courant »).

## Mesures d'origine

Job `checks` de la CI, dépôt drwil uniquement.

| Situation | Durée |
|---|---|
| Référence, PR #220 | ≈ 5m35 |
| PR #221 avant l'élargissement de cadrage | 5m33 |
| Hooks modifiés (rejeu complet), 1er passage | 3m02 |
| Hooks modifiés (rejeu complet), 2e passage | 3m45 |
| Hooks modifiés (rejeu complet), 3e passage | 4m37 |
| Hooks inchangés (rejeu sauté, QUA-123) | non relevé |

Mesure locale préalable : série de 203 s sur 8 cœurs, 250 s sur 2 cœurs.

L'objectif retenu alors était 30 % sous la référence, soit 3m55 au plus.
Sur les trois passages à hooks modifiés, deux sont sous 3m55 (3m02, 3m45) et
un au-dessus (4m37).

## Limites

- Une durée de CI dépend de la charge de la forge : trois passages ne font
  pas une distribution.
- Le relevé « hooks inchangés » n'a pas été fait : le saut du rejeu n'agit
  qu'après fusion, la CI lisant sur la branche principale l'ancienne copie de
  `.githooks/base-checks.mjs`.
- Aucune de ces mesures n'est une attestation de tenue d'un objectif : le
  constat est historique.

## Relevé courant

Les durées futures ne sont pas attestées : elles sont relevées à la main,
sans seuil, dans l'entrée de journal de chaque chantier
(`docs/projects/journal.md`). Procédure :

1. Après le passage de CI de la PR du chantier, lire la durée du job
   `checks` (`gh run list` puis `gh run view <id>`, ou la page de la PR).
2. Consigner dans l'entrée du journal une ligne
   `- **Durée de CI (job checks)** : <durée> — <référence du passage, ex. PR #n, run id> — hooks modifiés | hooks inchangés`.
   « Hooks modifiés » : `.githooks/` ou `.drwil/ia-first.json` diffèrent de
   la base (rejeu complet, QUA-123) ; sinon « hooks inchangés ».
3. Mesure absente ou inexploitable (CI pas encore passée, passage relancé
   ou annulé) : écrire « non mesurée ».

Ces durées et leurs variations ne bloquent ni `verify` ni la clôture.

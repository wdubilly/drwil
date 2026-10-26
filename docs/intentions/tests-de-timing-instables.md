# Intention : documenter l'avertissement émis par un contrôle (`[ia-first-warning]`) dans son contrat

**Statut** : ouverte le 2026-10-26 — limite non traitée de la clôture « tests de timing stables » (journal du 2026-10-26).

## Besoin

`run-checks` compte désormais comme avertissement non bloquant toute ligne `[ia-first-warning] <texte>` imprimée par un contrôle (le test de budget de temps au commit s'en sert). Le texte du contrat QUA-127 (résumé comptant chaque avertissement non bloquant) et la doc livrée ne le disent pas encore : `docs/contracts.md`, le catalogue et la doc des hooks étaient hors du cadrage du chantier.

## Existant (relevé le 2026-10-26)

- `.githooks/run-checks.mjs` (et son gabarit) reprend les lignes `[ia-first-warning] <texte>` de la sortie d'un contrôle ; test ciblé « QUA-127 » dans `.githooks/run-checks.test.mjs`.
- Le test « budget de temps » de `packages/drwil/test/kit.test.mjs` l'émet au dépassement de 1500 ms.

## Questions à trancher

- [décision] Compléter le texte de QUA-127 (et sa preuve : le test ciblé de `.githooks/run-checks.test.mjs`) plutôt que créer un contrat : modifier un contrat existant est une décision du demandeur.
- Les autres tests qui mesurent une durée, recensés au journal (`.githooks/engine.test.mjs`, `outils/banc*.test.mjs`, rendez-vous de QUA-139), sont conservés avec justification ; les passer en indicateur est possible par le même mécanisme, si une instabilité s'y révèle.

# Intention : l'enchaînement des lots éprouvé sur une vraie fiche à lots

**Statut** : proposée le 2026-10-28 — limite du chantier « une fiche à plusieurs lots se réalise lot par lot, un sous-agent neuf par lot » (journal du 2026-10-28).

## Besoin

Les outils lisent les lots, nomment le lot courant et refusent la clôture tant qu'un lot [IA] n'est pas fait (QUA-166 à QUA-170) ; le skill de lancement dit de donner un sous-agent neuf à chaque lot (QUA-171). Aucun outil ne lance les sous-agents : c'est la consigne qui enchaîne. Le besoin : savoir si, sur une vraie fiche à plusieurs lots, la session principale enchaîne bien les sous-agents, si la passation par les commits et la section « Reprise » suffit, et si la consommation baisse comme attendu.

## Existant

Le chantier lui-même, réalisé en un seul passage, n'a pas éprouvé l'enchaînement. Relevé à faire : la prochaine fiche à plusieurs lots (`cycle-de-vie-des-fiches`, `attestations-sur-l-effet-et-couvre`), comparée par `.drwil/usage.jsonl` aux chantiers de plus de 60 min.

## Questions à trancher

- [décision] Mener la prochaine fiche à lots avec l'enchaînement et mesurer sa consommation avant d'en faire la règle de tout chantier à lots ?

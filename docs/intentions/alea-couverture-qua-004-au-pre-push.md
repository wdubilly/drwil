# Intention : un échec non expliqué de QUA-004 au pre-push

**Statut** : proposée le 2026-10-24 — limite du chantier « accélérer la CI
sans perte de qualité » (journal du 2026-10-24).

## Besoin

Le 2026-10-24, le pre-push de la PR #221 a échoué sur « build + tests + seuil
de couverture (QUA-004) » ; relancé seul, puis repoussé, le même contrôle a
passé sans changement de code. La cause n'est pas établie (contrôles lancés en
parallèle, test de budget de temps sensible à la charge — déjà vu au pre-commit
et corrigé par la limite de parallélisme).

## Existant (relevé le 2026-10-24)

- Un échec isolé, non reproduit ; le contrôle passe seul et au second push.

## Questions à trancher

- Reproduire sous charge (`taskset`, plusieurs passages), lire la sortie du
  contrôle en échec et trancher : test à rendre robuste, ou parallélisme à
  réduire.

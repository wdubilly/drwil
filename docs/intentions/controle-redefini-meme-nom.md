# Intention : un contrôle redéfini sous le même nom est comparé

**Statut** : proposée le 2026-10-24 — limite du chantier « les
contournements restants fermés ou assumés » (journal du 2026-10-24).

## Besoin

Le rejeu par la branche principale (QUA-113, sur une PR, la CI rejoue les
contrôles avec les hooks de la branche principale) refuse un contrôle
retiré de `.drwil/ia-first.json` sans déclaration dans « Contrats
modifiés ». Il ne compare que les identifiants (`id`, à défaut `name`) : un contrôle gardé sous le même identifiant
mais dont la commande est affaiblie (filtre plus étroit, `|| true`,
commande vide) passe sans être signalé.

## Existant (relevé le 2026-10-24)

- `.githooks/base-checks.mjs` lit la liste de contrôles de la PR et celle
  de la branche principale, et compare leurs identifiants.

## Questions à trancher

- [décision] Comparer aussi la commande (toute différence déclarée dans
  « Contrats modifiés »), au risque de demander une déclaration pour une
  simple amélioration, ou seulement signaler la différence sans bloquer ?

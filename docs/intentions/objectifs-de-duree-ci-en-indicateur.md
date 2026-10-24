# Intention : suivre la durée de la CI comme un indicateur, pas comme un contrat attesté

**Statut** : proposée le 2026-10-24 — limite du chantier « accélérer la CI sans
perte de qualité » (journal du 2026-10-24), décision du demandeur.

## Besoin

Les objectifs de durée de CI ne doivent pas être des contrats bloquants attestés
à la main : la durée dépend des runners et évolue avec le projet. Il faut en faire
un indicateur suivi : relevé par chantier, tendance dans le tableau de bord,
seuil d'alerte non bloquant, réévalué au fil du projet.

## Existant (relevé le 2026-10-24)

- QUA-122 (durée du job `checks`) est un contrat Manuel, attesté par l'humain après
  trois relevés consignés au journal.

## Questions à trancher

- [décision] Où consigner le relevé par chantier (`.drwil/usage.jsonl` ou un
  fichier à part) et comment le tableau de bord en montre la tendance ?
- [décision] Quel seuil d'alerte non bloquant, et que devient QUA-122 une fois
  l'indicateur en place (le contrat est attesté : le modifier ou le retirer
  invalide l'attestation, décision du demandeur) ?

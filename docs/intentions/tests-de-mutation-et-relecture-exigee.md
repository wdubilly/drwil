# Intention : prouver que les tests des contrats critiques échoueraient si la règle était violée, et exiger une relecture

**Statut** : proposée le 2026-11-09 — issue d'une analyse externe de la gouvernance, relevés à vérifier avant tout cadrage.

## Besoin

Chaque contrat pointe vers des tests identifiés par son numéro, mais rien ne vérifie qu'un test trop faible échouerait
si la règle était violée. De plus le ruleset de la forge exige 0 approbation : dans un dépôt solo, la séparation entre
celui qui produit et celui qui valide repose sur la discipline du demandeur. Le demandeur veut quelques tests de
mutation sur les contrats de sécurité et d'attestation, et peser une relecture exigée en nombre.

## Existant

Relevé par l'analyse externe du 2026-11-09, non revérifié dans le code : aucun test de mutation ; ruleset actif sur la
branche par défaut, qui exige `checks` et les trois `kit-tests`, sans approbation.

## Questions à trancher

- [décision] Quels contrats couvrir en premier (attestation, périmètre, rejeu de la CI avec les hooks de la branche principale) ?
- [décision] Outil de mutation (Stryker ou un petit script maison) et coût en temps de CI ?
- [décision] Exiger une approbation dans un dépôt solo, ou documenter la limite (niveau de garantie, QUA-197) ?

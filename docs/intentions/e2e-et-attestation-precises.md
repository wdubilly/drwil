# Intention : préciser ce que prouvent l'e2e et l'attestation

**Statut** : proposée le 2026-10-22 — revue externe du dépôt.

## Besoin

Deux preuves sont à préciser. L'exigence ne change pas : il n'y a ni exception
ni dérogation aux garanties obligatoires, décision du demandeur du
2026-10-22.

1. **L'e2e** (`catalog:QUA-020`) : que veut dire « de bout en bout » pour une
   bibliothèque ou un outil sans interface ? Définition proposée : un parcours
   complet depuis une interface publique jusqu'au résultat attendu, dans un
   environnement représentatif, sans doublure sur ce qu'on veut garantir. Pour
   une bibliothèque, ça veut dire installer le paquet comme un client, appeler
   son API publique, vérifier les résultats et les erreurs. Pour un service :
   un parcours à travers son API. Pour une application web : un parcours
   utilisateur. La forme de la preuve change, pas le niveau d'exigence.
2. **L'attestation** (`drwil attest`) : elle prouve une action interactive
   (un terminal, l'ID retapé), liée au texte et à la preuve du contrat. Elle
   ne prouve pas l'identité : l'auteur vient de la configuration git, qui est
   déclarative. Il faut distinguer l'identité, l'approbation et la preuve
   d'exécution.

## Existant (relevé le 2026-10-22)

- `packages/drwil/templates/common/base/docs/contracts-catalog.md` : ligne
  e2e, sans définition par forme de projet.
- `packages/drwil/bin/drwil.js` : `attest` exige un terminal interactif.

## Questions à trancher

- [décision] Adopter la définition de l'e2e ci-dessus dans le catalogue et la
  recette d'adoption ?
- [décision] Pour une équipe : proposer une identité forte (commits signés,
  revue GitHub authentifiée) en option, et documenter le niveau de garantie
  de chaque mode ?

# Intention : l'arrêt d'une file et ses comptes rendus vérifiés par un contrôle

**Statut** : proposée le 2026-10-16 — limite du chantier « Une file de
chantiers décidée d'un geste » (journal du 2026-10-16).

## Besoin

Une file de chantiers (QUA-037) doit s'arrêter au premier chantier qui
demande un humain (attestation, FAIL non corrigé, CI rouge, décision) et
rendre un compte rendu à chaque clôture. Aujourd'hui ce sont des consignes
à l'agent (skill `/drwil-start`, recette de clôture, `AGENTS.md`) : la
mécanique empêche de lancer une fiche hors file, mais rien n'empêche
l'agent de lancer la suivante alors que la précédente n'est pas fusionnée.

## Existant (vérifié le 2026-10-16)

- `node .githooks/state.mjs next` lance la tête de file depuis SCOPING,
  sans vérifier que la PR du chantier précédent est fusionnée ni que la
  branche principale est à jour.
- La clôture exige déjà une évidence `PASS` de verify (QUA-034, QUA-022) :
  un chantier en FAIL ou MANUAL ne peut pas être clos, donc pas suivi.

## Questions à trancher

- [décision] `next` doit-il refuser tant que la PR précédente n'est pas
  fusionnée (vérification par `gh` ou par la base de la branche) ?
- [décision] Le compte rendu de clôture doit-il être un fichier écrit et
  contrôlé (par exemple dans l'évidence), ou rester une consigne ?

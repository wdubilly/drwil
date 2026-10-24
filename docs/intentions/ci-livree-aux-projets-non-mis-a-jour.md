# Intention : le gain de CI atteint-il les projets adoptés ?

**Statut** : proposée le 2026-10-24 — limite du chantier « accélérer la CI
sans perte de qualité » (journal du 2026-10-24).

## Besoin

Le moteur (`build`, `parallel`) et le saut du rejeu (QUA-123) sont livrés par
le gabarit des hooks ; `.drwil/ia-first.json` d'un projet existant ne déclare
ni `build`, ni `parallel`, ni `needsBuild` : sans mise à jour de sa
configuration il garde ses durées. Le workflow livré n'a changé ni pour la
version de Node, ni pour le doublon push / pull_request (propres à ce dépôt,
QUA-121).

## Existant (relevé le 2026-10-24)

- Gabarit des hooks : moteur à jour ; gabarit du workflow : inchangé par le chantier.

## Questions à trancher

- [décision] `drwil update` / `doctor` propose-t-il `parallel` et `build` aux
  projets existants ? Le workflow livré évite-t-il le doublon push / PR ?

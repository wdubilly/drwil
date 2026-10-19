# Intention : aligner le texte de QUA-048 sur la reconnaissance par squash

**Statut** : proposée le 2026-10-19 — limite du chantier « les branches
fusionnées par squash reconnues » (journal du 2026-10-19, 0.6.6, 2 sur 4).

## Besoin

QUA-048 (une clôture en un geste) dit encore que les branches fusionnées
sont supprimées au lancement par `git branch -d`. Depuis QUA-058 (une
branche dont la PR est fusionnée sur GitHub est reconnue fusionnée, squash
compris), une branche dont la fusion par squash est prouvée par `gh` est
supprimée par `git branch -D`. Les deux contrats ne se contredisent pas
(QUA-058 précise le cas), mais le texte de QUA-048 n'est plus complet.

## Existant (vérifié le 2026-10-19)

- `docs/contracts.md`, QUA-048 : « supprimées (`git branch -d`) — jamais
  la branche principale, la courante, une branche encore au sommet de la
  principale ni une branche non fusionnée ».
- Modifier un contrat existant demande sa déclaration dans la section
  « Contrats modifiés » d'une fiche, validée par le demandeur (QUA-023,
  régression ou évolution d'un contrat) : le chantier ne l'a pas fait.

## Questions à trancher

- [décision] Réécrire la phrase de QUA-048 en renvoyant à QUA-058 et
  QUA-059 (évolution déclarée dans une fiche), ou la laisser telle quelle,
  QUA-058 faisant foi pour le squash ?

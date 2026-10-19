# Intention : un ajout au registre des contrats sans le oui de l'humain

**Statut** : cadrée le 2026-10-19 en `docs/projects/stab-registre.md` (0.6.6) ; proposée le 2026-10-18 — limite du chantier « un détour pour
une correction intercalée » (journal du 2026-10-18, 0.6.5, 4 sur 4).

## Besoin

La fiche du détour demandait le oui de l'humain pour un détour qui
« changerait un contrat existant » (QUA-050, un détour pour une correction
intercalée). L'outil va plus loin : tout changement du registre des
contrats, même un simple ajout (un nouveau contrat, ou un test rattaché à
un contrat existant), fait refuser les commits du détour jusqu'au oui de
l'humain ; en file, le sous-agent s'arrête alors pour rien.

## Existant (vérifié le 2026-10-18)

- `.githooks/detour.mjs` (`rulesFiles`) : le registre (`docs/contracts.md`,
  ou `dirs.contracts`) est un fichier « règles du jeu » entier, sans
  regarder la nature du changement.
- `.githooks/scope-gate.mjs` refuse ces fichiers sous une fiche de détour
  tant que `node .githooks/detour.mjs allow` (terminal interactif) n'a pas
  été lancé.
- Le registre a déjà des contrôles qui distinguent une évolution d'un
  contrat (QUA-023, régression ou évolution d'un contrat déclarée au
  cadrage) : une base possible pour lire le diff.

## Questions à trancher

- [tranché] Laisser passer sans oui un ajout pur au registre (nouvelle
  section, ligne « Tests » complétée) et ne demander le oui que pour une
  règle existante modifiée ou retirée — ou garder la règle prudente
  actuelle ?
- [tranché] Si on lit le diff : quelle forme d'ajout compte comme
  « pur » (nouvel ID seulement, ou aussi un test ajouté à un contrat) ?

## Décisions (2026-10-19, demandeur)

- Un ajout pur au registre passe sans oui, jugé sur le contenu ; modifier ou retirer un contrat existant demande toujours le oui.

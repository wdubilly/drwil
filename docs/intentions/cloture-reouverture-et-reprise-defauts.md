# Intention : la clôture, la réouverture et la reprise d'un chantier sans défauts relevés

**Statut** : proposée le 2026-11-09 — regroupe quatre notes en vrac (2026-11-05 et 2026-11-06), à reproduire avant tout cadrage.

## Besoin

Quatre défauts relevés en réalisant des chantiers : le refus d'un commit par la barrière de périmètre sans nommer les
fichiers, la réouverture qui échoue quand la clôture a retiré l'intention, un faux positif de la barrière de
réouverture, et la reprise d'état (`resume`) aux limites. Le demandeur veut un parcours de clôture et de reprise sans surprise.

## Existant

Relevé dans les notes en vrac :

- 2026-11-05 : en mode bloquant, la barrière de périmètre refuse par « N fichier(s) hors fiches commité(s) en SCOPING »
  sans nommer les fichiers ; à la mise à jour du kit (0.11.0), le demandeur n'en voyait qu'un sur deux.
- 2026-11-05 : `node .githooks/state.mjs reopen` est refusé quand la clôture a retiré l'intention d'origine : la fiche
  restaurée la cite, le contrôle des chemins cités refuse le commit ; l'intention a dû être restaurée à la main (PR #360).
- 2026-11-05 : le message d'usage de `.githooks/state.mjs` ne cite pas `resume` (puce QUA-137 limitée aux messages ajoutés) ; seule
  `docs/projects/` est cherchée par `resume`, un détour ne se reprend pas ; le lot repris est le dernier commité
  (trailer `Drwil-Lot`), un `lot next` sans commit suivant ne se voit pas dans l'historique.
- 2026-11-06 : faux positif de la barrière de réouverture : un changement qui ne touche qu'un test y est traité comme un
  changement de règle et attend le oui de l'humain (PR #366). À reproduire avant de cadrer.

## Questions à trancher

- [décision] Les traiter en une fiche, ou séparer le défaut de la barrière de périmètre (0.12.0) des trois autres (0.13.0) ?
- [décision] La réouverture restaure-t-elle l'intention retirée, ou la fiche cesse-t-elle de la citer ?

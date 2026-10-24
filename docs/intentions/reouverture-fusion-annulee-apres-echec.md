# Intention : une réouverture refusée après l'annulation de la fusion automatique

**Statut** : proposée le 2026-10-24 — limite du chantier « rouvrir un chantier
dont la PR révèle un défaut après la clôture » (journal du 2026-10-24).

## Besoin

`node .githooks/state.mjs reopen` annule la fusion automatique avant tout
commit (une branche dont la fusion est programmée ne reçoit rien). Si le
commit de la fiche restaurée échoue ensuite (un hook pre-commit qui refuse,
par exemple), la réouverture est refusée, l'état reste en CLOSING, mais la
fusion automatique reste annulée : le message le dit (« à reprogrammer »),
rien ne la reprogramme.

## Existant (vérifié le 2026-10-24)

- `.githooks/state-cli.mjs` (`reopen`) : annulation par `gh pr merge
  --disable-auto`, puis commit de la fiche ; en cas d'échec du commit, la
  fiche est retirée et le texte `reopenCancelled` est ajouté au refus.

## Questions à trancher

- [décision] Reprogrammer la fusion automatique quand la réouverture échoue
  après l'annulation (au risque d'une fusion du code fautif), ou laisser la
  fusion à l'humain, comme aujourd'hui ?

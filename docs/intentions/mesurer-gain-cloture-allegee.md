# Intention : mesurer le gain de la clôture allégée

**Statut** : proposée le 2026-10-18 — limite du chantier « une clôture
allégée, sans encombrants » (journal du 2026-10-18, 0.6.5, 3 sur 4).

## Besoin

La fiche demandait de comparer la consommation de ce chantier et des deux
suivants (ordre de la file, détour) à celle des clôtures de la 0.6.4. Les
deux suivants ne sont pas encore menés : la comparaison ne peut pas se
faire à la clôture de celui-ci.

## Existant (vérifié le 2026-10-18)

- `.drwil/usage.jsonl` (si présent) : une ligne par chantier, consignée à la clôture
  (`node .githooks/consumption.mjs`, QUA-042, consommation mesurée par
  chantier).
- La ligne de ce chantier mesure aussi la construction de la commande :
  seules les clôtures suivantes, faites avec elle, disent le gain.

## Questions à trancher

- [décision] Après le détour (0.6.5, 4 sur 4), comparer les trois lignes à
  celles de la 0.6.4 dans le bilan de la release, ou dans une analyse à
  part ?

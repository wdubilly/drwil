# Intention : mesurer le gain de la clôture allégée

**Statut** : proposée le 2026-10-18 — limite du chantier « une clôture
allégée, sans encombrants » (journal du 2026-10-18, 0.6.5, 3 sur 4).
**Revu le 2026-10-18** : comparaison faite à la clôture du détour (0.6.5,
4 sur 4), ci-dessous ; elle ne dit pas le gain, faute de mesurer la
clôture à part. Reste vivant : comment mesurer la clôture seule.

## Besoin

La fiche demandait de comparer la consommation de ce chantier et des deux
suivants (ordre de la file, détour) à celle des clôtures de la 0.6.4.

## Existant (vérifié le 2026-10-18)

- `.drwil/usage.jsonl` : une ligne par chantier, consignée à la clôture
  (`node .githooks/consumption.mjs`, QUA-042, consommation mesurée par
  chantier) ; une ligne couvre tout le chantier, pas sa seule clôture.
- Comparaison (tokens pondérés, requêtes) :
  - 0.6.4 : CI multi-OS sur PR 1,31 M (85) ; reprise par sous-agent
    2,45 M (112) ; workflow CI au YAML valide 0,39 M (36) — moyenne
    1,38 M. La release 0.6.4 (0,27 M) n'est pas un chantier comparable.
  - 0.6.5, avec la commande de clôture : clôture allégée 1,95 M (96, y
    compris la construction de la commande) ; ordre de la file 0,62 M
    (57) ; détour 4,31 M (178, y compris une CI rouge et un relancement
    par l'humain) — moyenne 2,29 M.
- Lecture : la taille des chantiers et leurs incidents écrasent l'effet
  de la clôture ; seul l'ordre de la file, petit chantier sans incident,
  est sous la moyenne de la 0.6.4. Rien ne permet de conclure à un gain
  ni à une perte.

## Questions à trancher

- [décision] Mesurer la clôture à part (une ligne d'incrément « clôture »
  consignée depuis le passage en CLOSING), ou abandonner cette mesure
  faute d'un signal exploitable ?

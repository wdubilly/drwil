# Intention : une seule forme pour les ID du catalogue

**Statut** : proposée le 2026-10-15 — retour d'expérience du chantier
« capitaliser les non-régressions » (journal du 2026-10-15).

## Besoin

Le catalogue de contrats écrit ses ID `catalogue:XXX-NNN` dans ce dépôt et
`catalog:XXX-NNN` dans le gabarit livré : tout outil qui lit le catalogue
(par exemple le contrôle de cohérence des ID entre registre et catalogue,
cadré le 2026-10-15 sur sa propre branche) doit connaître les deux formes.

## Existant

Relevé le 2026-10-15 : les deux catalogues divergent volontairement (écart
déclaré dans `outils/miroirs.json` : contenu propre au dépôt, en français,
QUA-001 et QUA-004 adoptés donc retirés). La divergence du contenu est
légitime ; seule la double forme du préfixe est en question.

## Questions à trancher

- [décision] Garder les deux préfixes (lus tous deux), ou un préfixe
  unique quelle que soit la langue ?

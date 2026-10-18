# Intention : reconnaître les commentaires de code sans heuristique de ligne

**Statut** : proposée le 2026-10-18 — limite du chantier « une clôture
allégée, sans encombrants » (journal du 2026-10-18, 0.6.5, 3 sur 4).

## Besoin

La règle « le code cite le contrat, jamais la fiche » (QUA-049) ne lit que
les commentaires, pour ne pas prendre une donnée de test pour une
citation. Un commentaire est reconnu ligne à ligne : une ligne qui commence
par `//`, `#`, `*`, `/*` ou `<!--`, ou un ` // ` précédé d'un blanc. Un
`/* … */` placé après du code échappe à la règle ; une chaîne qui contient
` // ` est prise pour un commentaire (rencontré dans les tests de la règle).

## Existant (vérifié le 2026-10-18)

- `.githooks/check-code-rules.mjs` (`briefReferences`, expression
  `COMMENT`).

## Questions à trancher

- [décision] Garder l'heuristique (simple, sans dépendance, faux positif
  contournable) ou lire les commentaires selon le langage du fichier ?

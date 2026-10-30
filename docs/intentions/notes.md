# Intention : notes en vrac

**Statut** : ouverte en permanence — notes rangées le 2026-10-30 (rangement du backlog).

## Besoin

Consigner une idée ou une intention d'une ligne à n'importe quel moment, y compris en plein chantier, sans la
cadrer ni la coder : `node .githooks/note.mjs "<texte>"`. Une note est toujours une intention, jamais un ordre
de coder. Quand elle mûrit, elle est promue en fiche d'intention et sa ligne est retirée d'ici.

## Existant

Relevé le 2026-10-21 : les notes sont ci-dessous, une ligne datée chacune, hors de l'index des chantiers.

## Questions à trancher

- [décision] Promouvoir en intention les notes qui ont mûri, et retirer les autres.

## Notes
- 2026-10-27 — Contrôler de façon déterministe que le corps d'une PR suit .github/pull_request_template.md (titres présents), en CI ou hook : aujourd'hui seule la consigne à l'agent l'impose (écart constaté sur la PR #273 du chantier plafond-200-lignes).
- 2026-10-29 — Garde d'écriture sur .drwil/evidence/acceptance.json : un agent peut encore écrire à la main l'acceptation des critères (limite de QUA-175, gardes d'écriture des hooks d'agent hors périmètre du chantier cycle-de-vie-des-fiches). À cadrer : refuser toute écriture de ce fichier par un outil d'agent, ou la détecter à la clôture.
- 2026-10-29 — Au cadrage, repérer un critère d'acceptation marqué [humain] qui serait vérifiable par une machine (texte conservé, renvois valides…) et proposer un contrôle à la place, selon la règle de conception de docs/ia-first.md section 3 (une preuve humaine est le prochain contrôle à outiller). Vu sur ia-first-en-sections-courtes, 2026-10-29.
- 2026-10-29 — Les docs que le kit fait produire par l'agent (docs/audit-risks.md, docs/value-discovery.md, fiches, journal…) n'ont aucun plafond de taille ; les faire entrer sous un plafond bloquant, car des agents les relisent (souhait du demandeur, 2026-10-29). Les fichiers du kit installés chez l'adoptant restent en avertissement.
- 2026-10-29 — Sous Copilot CLI, le champ fiche du sondage /drwil-start en choix multiple (type array, items.enum) revenait vide malgré la case cochée ; le skill prescrit désormais le choix unique (QUA-180), mais la cause n'est pas établie et une file de plusieurs fiches ne se coche plus d'un seul sondage (limites du journal, retour-scoping-branche-sondage, 2026-10-29). À reproduire avant de cadrer.
- 2026-10-30 — Garanties : le classement « nouveau » ou « existant » d'un projet dépend de la présence de code au moment où on lance guarantees, alors que pour un projet neuf la recette impose d'écrire le code d'abord ; le même projet est donc classé différemment selon l'ordre des gestes (défaut du kit, livrable, à voir avec la fiche docs/projects/cloture-sur-projet-neuf.md).
- 2026-10-30 — Garanties : drwil guarantees affiche « ✓ couverture » pendant que drwil verify déclare la même garantie non tenue ; les deux outils se contredisent faute d'un même juge (défaut du kit, livrable, à voir avec la fiche docs/projects/cloture-sur-projet-neuf.md).

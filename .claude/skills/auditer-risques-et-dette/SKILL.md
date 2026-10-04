---
name: drwil-audit
description: Analyser le dépôt (cadrage réel, code, tests) pour détecter dérive de spec, code mort, angles morts de sécurité et trous de tests, et produire docs/audit-risques.md. À utiliser pour une revue de santé avant une étape clé ou à la demande.
---

Recette : `docs/recettes/auditer-risques-et-dette.md`. Lit les entrées via
`.drwil/ia-first.json` (fiches de `dirs.projects`, `dirs.contracts`, code
des `layers` déclarées) plutôt que des chemins en dur. Produit ou met à
jour docs/audit-risques.md (à créer — tableau RSK-N + détail + prochaine
étape). Jamais en CI ni au commit : un audit à la demande, pas un
contrôle. Un correctif demandé ensuite (« Corrige RSK-X ») doit d'abord
passer par une fiche de cadrage s'il touche du code non couvert (QUA-016).

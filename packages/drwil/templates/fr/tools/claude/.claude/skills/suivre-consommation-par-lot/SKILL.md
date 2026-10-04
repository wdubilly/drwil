---
name: drwil-conso
description: Enregistrer dans .drwil/usage.jsonl les tokens consommés, le modèle employé et le temps de mise en place d'un lot qui vient de se terminer. À utiliser en clôturant un lot, pour alimenter le tableau de bord et les rapports d'analyse.
---

Recette : `docs/recettes/suivre-consommation-par-lot.md`. Format
`.drwil/usage.jsonl` (à créer) (append-only, une ligne JSON par lot : `chantier`,
`lot`, `tokens`, `modele`, `duree_min`, `date`). Avec Copilot CLI,
interroger `session_store_sql` (modèle/tokens dans `session_usage`,
horodatages dans `turns`/`events`) pour renseigner la ligne ; sinon,
estimer à la main. Lu ensuite par le tableau de bord
(`.githooks/tableau-de-bord.mjs` (à créer)) et par les skills `auditer-risques-et-dette`
et `decouvrir-valeur-produit` (section « Aperçu de consommation »). Jamais
de facturation ni de blocage de commit — purement informatif.

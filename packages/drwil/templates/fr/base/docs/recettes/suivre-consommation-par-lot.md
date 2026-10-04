# Recette : suivre la consommation par lot/chantier

Objectif : savoir, lot par lot, combien de tokens ont été consommés, quel
modèle a été employé et combien de temps la mise en place a pris — sans
jamais facturer ni bloquer un commit, juste pour éclairer un suivi de
chantier.

## Format : `.drwil/usage.jsonl` (à créer)

Fichier append-only à la racine du projet, une ligne JSON par clôture de
lot :

```json
{ "chantier": "extraction-ia-first-run-box", "lot": "Lot 8", "tokens": 42000, "modele": "claude-sonnet-5", "duree_min": 95, "date": "2026-10-04" }
```

- `chantier` : nom de fichier (sans extension) de la fiche
  `docs/projets/<chantier>.md` concernée.
- `lot` : intitulé du lot tel qu'écrit dans sa fiche (`## Lots`).
- `tokens` : ordre de grandeur de tokens consommés pour ce lot (entier).
- `modele` : identifiant du modèle employé (ex. `claude-sonnet-5`). Si
  plusieurs modèles ont été utilisés sur le même lot, soit une ligne par
  modèle, soit `"mixte"`.
- `duree_min` : temps de mise en place du lot, en minutes.
- `date` : date de clôture du lot (`AAAA-MM-JJ`).

Le fichier n'est jamais recalculé : chaque ligne est écrite une fois, à la
clôture d'un lot, jamais réécrite après coup.

## Qui remplit le fichier ?

Pas de script autonome : les données de session (tokens, modèle, durée) ne
sont accessibles qu'à l'agent IA en cours d'exécution, pas à un processus
externe. C'est donc l'IA qui, en clôturant un lot, ajoute la ligne :

- **Avec Copilot CLI** : interroger `session_store_sql` (table
  `session_usage` pour le modèle et les tokens ; `turns`/`events` pour les
  horodatages de début et fin du lot, d'où `duree_min`), puis ajouter la
  ligne JSON à `.drwil/usage.jsonl` (à créer).
- **Avec un autre outil IA**, ou en l'absence d'historique interrogeable :
  estimer à la main (ordre de grandeur suffit) et préciser `modele` et
  `duree_min` du mieux possible plutôt que d'omettre la ligne.

## Lecture : le tableau de bord

`docs/recettes/visualiser-avancement.md` (module optionnel
`.githooks/tableau-de-bord.mjs` (à créer)) lit `.drwil/usage.jsonl` (à créer)
s'il existe et
affiche, par chantier : le total de tokens, le total de minutes et la
liste des modèles employés. Si le fichier est absent, le tableau de bord
fonctionne exactement comme avant (aucune régression).

## Les skills d'analyse

`auditer-risques-et-dette` et `decouvrir-valeur-produit` affichent aussi,
en tête de leur rapport, un aperçu court (section « Aperçu de
consommation ») résumant `.drwil/usage.jsonl` (à créer) s'il existe — jamais inventé
si le fichier est absent.

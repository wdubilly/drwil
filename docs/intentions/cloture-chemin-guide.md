# Intention : la clôture dit quelle étape suit, au lieu de refuser sèchement

**Statut** : proposée le 2026-10-19 — limite du chantier « Compatibilité des agents, Gemini CLI tenu » (journal du 2026-10-19).

## Besoin

Depuis BUILD, `node .githooks/close.mjs` répond « clôture refusée : activité
BUILD » sans dire la suite. Il a fallu enchaîner BUILD → EVIDENCE → VERIFY →
CLOSING (chaque `move` refuse les sauts), puis relancer
`drwil verify --evidence` parce que l'évidence datait d'un autre commit que
HEAD. Un agent qui ne connaît pas le graphe des transitions tâtonne.

## Existant (vérifié le 2026-10-19)

- `node .githooks/state.mjs move <ACTIVITE>` n'accepte que les transitions
  voisines ; l'erreur liste les activités permises, pas le chemin jusqu'à CLOSING.
- `close.mjs --check` signale ce qui ferait échouer la clôture, mais pas
  l'activité à atteindre ni l'évidence périmée.
- Au commit de clôture, l'avertissement « fiche supprimée sans que son
  intention soit touchée » ne regarde que les fichiers du commit : l'intention
  modifiée dans un commit précédent du même chantier est signalée à tort.

## Questions à trancher

- [décision] Un `.githooks/close.mjs` qui avance seul jusqu'à CLOSING quand l'évidence de
  `verify` est valide, ou un message qui donne les commandes à enchaîner ?
- [décision] Comparer l'avertissement d'intention à la branche entière
  (depuis la base de fusion) plutôt qu'au seul commit ?

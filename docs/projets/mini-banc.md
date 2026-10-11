# Projet : mini-banc — même consigne, avec et sans drwil

**Statut** : cadré le 2026-10-11 — 4 décisions à trancher avant le lot 1.
**Risque** : HIGH

<!-- cadrage
fichiers:
  - outils/banc.mjs
  - outils/banc.test.mjs
  - bench/reference/package.json
  - bench/reference/src/*
  - bench/reference/test/*
  - bench/taches/*.md
  - docs/benchmark-protocole.md
  - outils/miroirs.json
-->

(cadrage : ce dépôt seulement — QUA-018 (périmètre explicite : dépôt drwil
vs livrable gabarit) : le banc mesure le livrable, il n'en fait pas
partie. HIGH : il lance un agent sans surveillance sur la machine.)

## 1. Besoin

Vague 3 (« mesurer ») de la feuille de route, décidée le 2026-10-11.
Intention `docs/intentions/bench-avec-sans-drwil.md` ; protocole complet
`docs/benchmark-protocole.md` (5 tâches, 3 répétitions, aucune mesure à ce
jour). Avant de construire la fabrique autonome, savoir **si drwil
améliore le livrable et ce qu'il coûte en tokens**, sur un format réduit
qui se lance d'une commande et se rejoue : 2 tâches, 3 répétitions, 2
conditions, soit 12 passages.

## 2. Hors périmètre

- Le banc complet (5 tâches) : après lecture du mini-banc.
- D'autres agents que Claude Code (question 3 de l'intention) : plus tard.
- Juger la qualité par les contrôles de drwil seuls (ce serait juger le
  produit par lui-même) : le juge est indépendant (voir contraintes).

## 3. Contraintes

- **Même consigne, même projet, même modèle, même effort** : seule la
  présence de drwil varie ; ordre avec/sans tiré au sort par tâche.
- **Mesure automatique** : agent lancé en mode non interactif
  (`claude -p`, sortie JSON : tokens, coût, nombre de tours — à vérifier
  au lot 1 sur la version installée).
- **Juge indépendant** : tests cachés, copiés seulement après le passage
  de l'agent ; contournement détecté sur le diff (test sauté ou
  supprimé, `--no-verify`, contrôle désactivé) ; fichiers touchés hors
  de la tâche comptés.
- **Bac à sable** : chaque passage dans une copie jetable du projet de
  référence, hors de ce dépôt ; outils de l'agent limités à cette copie ;
  aucun secret dans l'environnement ; plafond de tours par passage.
- **Honnêteté** (règles du protocole) : tous les passages rapportés, aucun
  relancé parce qu'il s'est mal passé ; min et max, pas seulement la
  moyenne ; le protocole réduit est daté et fixé avant toute mesure.

## 4. Décisions

- **2026-10-11 — Mesurer avant de construire** : le mini-banc dans la
  vague « mesurer », avant les restructurations. [décision utilisateur]

## Contrats concernés

- **QUA-019** — Pas de contournement d'un contrôle : mesuré par la tâche
  piège.
- **QUA-013** — Contrôle non exécuté n'est pas passé : un passage qui
  n'a pas pu tourner est « non mesuré », jamais compté comme réussi ni
  comme raté.

## 5. Points à trancher

- [décision] **Projet de référence** : un petit projet écrit pour le banc
  (Node, une dizaine de fichiers, tests) dans `bench/reference/`, ou un
  de tes projets réels. Recommandé : écrit pour le banc, pour qu'il soit
  public et rejouable.
- [décision] **Les 2 tâches** : parmi les 5 du protocole. Recommandé :
  « corriger un bug signalé par un test qui échoue » (qualité, régressions)
  et la tâche piège qui pousse à désactiver un contrôle (QUA-019).
- [décision] **Gestes humains côté « avec drwil »** : sans humain dans la
  boucle, lancer et clore passent par `transitions: agent`. Recommandé :
  ce réglage, dit dans le rapport — le banc mesure alors drwil en mode
  autonome, celui que vise la fabrique.
- [décision] **Budget** : plafond de tokens par passage et pour la
  campagne. Recommandé : fixé après un passage d'essai hors mesure, écrit
  dans le protocole avant la campagne.

## 6. Lots

- **Lot 1 — banc rejouable** [IA] : projet de référence et tâches
  (`bench/`), `outils/banc.mjs` (à créer) : copie jetable, `drwil init`
  pour la condition « avec », passage de l'agent, juge, résultat JSON par
  passage ; protocole réduit daté dans `docs/benchmark-protocole.md`.
  Critère de sortie : tests verts (agent simulé) ; un passage d'essai
  réel, hors mesure, va au bout.
- **Lot 2 — campagne** [humain] : lancer les 12 passages (dépense de
  tokens : geste humain). Critère de sortie : rapport daté à côté du
  protocole, tous les passages rapportés.
- **Lot 3 — lecture** [décision] : ce que les chiffres changent à la
  feuille de route (fluidité, fabrique, banc complet).

## 7. Reprise

- **Dernier état** (2026-10-11) : fiche cadrée, rien de réalisé.
- **Travail non commité** : aucun.
- **Prochaine étape** : [décision] les 4 points à trancher, puis
  [humain] `/drwil-lancer`.

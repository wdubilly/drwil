# Projet : mini-banc — même consigne, avec et sans drwil

**Statut** : cadré le 2026-10-11 — décisions prises, lot 1 à lancer.
**Risque** : HIGH
**Intention** : `docs/intentions/bench-avec-sans-drwil.md`

<!-- scope
files:
  - outils/banc.mjs
  - outils/banc.test.mjs
  - bench/reference/package.json
  - bench/reference/src/*
  - bench/reference/test/*
  - bench/taches/*.md
  - .github/workflows/banc.yml
  - docs/benchmark-protocole.md
  - outils/miroirs.json
-->

(cadrage : ce dépôt seulement — QUA-018 (périmètre explicite : dépôt drwil
vs livrable gabarit) : le banc mesure le livrable, il n'en fait pas
partie. HIGH : il lance un agent sans surveillance, avec un secret, et
touche `.github/`.)

## 1. Besoin

Vague 6 de la feuille de route, en tête, avant le pilote de la fabrique
(déplacé de la vague 3 le 2026-10-12, décision du demandeur).
Intention `docs/intentions/bench-avec-sans-drwil.md` ; protocole complet
`docs/benchmark-protocole.md` (5 tâches, 3 répétitions, aucune mesure à ce
jour). Avant de construire la fabrique autonome, savoir **si drwil
améliore le livrable et ce qu'il coûte en tokens**, sur un format réduit
qui se lance d'une commande et se rejoue : 2 tâches, 3 répétitions, 2
conditions, soit 12 passages.

## Critères d'acceptation

(ajoutés le 2026-10-16, critères obligatoires : QUA-021 ; contrats à créer
par ce chantier, avec leur champ Origine.)

- Le banc se rejoue d'une commande sur une copie jetable du projet de
  référence, avec et sans drwil, et écrit un résultat JSON par passage
  (tokens, coût, tours, verdict du juge) ; éprouvé avec un agent simulé —
  contrat à créer
- Le juge est indépendant : tests cachés copiés après le passage,
  contournement détecté sur le diff (test sauté ou supprimé,
  `--no-verify`, contrôle désactivé), fichiers hors tâche comptés —
  contrat à créer
- Un passage qui n'a pas pu tourner est « non mesuré », jamais compté
  réussi ni raté — contrat à créer
- Le workflow du banc ne se déclenche qu'à la demande, jamais sur une PR
  ni un push, et aucun secret n'apparaît dans les résultats — contrat à
  créer
- Le rapport de campagne rapporte tous les passages, min et max, avec le
  protocole daté fixé avant la mesure [humain] — contrat à créer

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
  au lot 1 sur la version épinglée).
- **En CI** : workflow `.github/workflows/banc.yml` (à créer),
  déclenché **à la demande seulement** (`workflow_dispatch`), jamais sur une PR ni un
  push ; un job par passage (matrice) ; version de Claude Code épinglée ;
  résultats en artefact. Le même script se lance en local pour la mise
  au point, jamais pour la campagne.
- **Juge indépendant** : tests cachés, copiés seulement après le passage
  de l'agent ; contournement détecté sur le diff (test sauté ou
  supprimé, `--no-verify`, contrôle désactivé) ; fichiers touchés hors
  de la tâche comptés.
- **Bac à sable** : chaque passage sur une machine de CI neuve, dans une
  copie jetable du projet de référence ; outils de l'agent limités à
  cette copie ; jeton GitHub du job en lecture seule ; aucun autre secret
  que l'identifiant du modèle, jamais affiché (masqué par GitHub, et
  vérifié dans les résultats) ; plafond de tours par passage.
- **Honnêteté** (règles du protocole) : tous les passages rapportés, aucun
  relancé parce qu'il s'est mal passé ; min et max, pas seulement la
  moyenne ; le protocole réduit est daté et fixé avant toute mesure.

## 4. Décisions

- **2026-10-11 — Mesurer avant de construire** : le mini-banc dans la
  vague « mesurer », avant les restructurations. [décision utilisateur]
  Revue le 2026-10-12 : déplacé en tête de la vague 6, avant le pilote de
  la fabrique ; la mesure de consommation (faite) suffit à piloter les
  vagues 4 et 5. [décision utilisateur]
- **2026-10-11 — Projet de référence** : un petit projet écrit pour le
  banc (`bench/reference/`), public et rejouable. [décision utilisateur]
- **2026-10-11 — Les 2 tâches** : corriger un bug signalé par un test
  qui échoue ; la tâche piège qui pousse à désactiver un contrôle
  (QUA-019). [décision utilisateur]
- **2026-10-11 — Gestes humains** : condition « avec drwil » en
  `transitions: agent`, dit dans le rapport. [décision utilisateur]
- **2026-10-11 — Budget** : fixé après un passage d'essai hors mesure,
  écrit dans le protocole avant la campagne. [décision utilisateur]
- **2026-10-12 — Le banc tourne en CI**, à la demande, plutôt que sur la
  machine du demandeur : bac à sable neuf à chaque passage, conditions
  identiques, passages en parallèle, historique. [décision utilisateur]
- **2026-10-12 — Identifiant du modèle** : une clé API Anthropic dédiée au
  banc, avec un plafond de dépense fixé chez Anthropic, en secret GitHub —
  le coût reste borné hors de drwil. [décision utilisateur, sur
  recommandation]

## Contrats concernés

- **QUA-019** — Pas de contournement d'un contrôle : mesuré par la tâche
  piège.
- **QUA-013** — Contrôle non exécuté n'est pas passé : un passage qui
  n'a pas pu tourner est « non mesuré », jamais compté comme réussi ni
  comme raté.

## 5. Points à trancher

(aucun : tranchés le 2026-10-11, voir « Décisions »)

## 6. Increments

- **Lot 1 — banc rejouable** [IA] : projet de référence et tâches
  (`bench/`), `outils/banc.mjs` (à créer) : copie jetable, `drwil init`
  pour la condition « avec », passage de l'agent, juge, résultat JSON par
  passage ; workflow `.github/workflows/banc.yml` (à créer), à la
  demande, en matrice, déclaré propre au dépôt (`outils/miroirs.json`) ; protocole réduit daté
  dans `docs/benchmark-protocole.md`. Critère de sortie : tests verts
  (agent simulé) ; un passage d'essai réel, en CI, hors mesure, va au
  bout (il demande le secret : geste humain préalable, voir lot 2).
- **Lot 2 — campagne** [humain] : créer la clé API dédiée avec son
  plafond, l'enregistrer en secret GitHub, puis déclencher le workflow
  pour les 12 passages (dépense : geste humain). Critère de sortie :
  rapport daté à côté du protocole, tous les passages rapportés.
- **Lot 3 — lecture** [décision] : ce que les chiffres changent à la
  feuille de route (fluidité, fabrique, banc complet).

## 7. Reprise

- **Dernier état** (2026-10-12) : fiche cadrée, banc en CI décidé, rien
  de réalisé.
- **Travail non commité** : aucun.
- **Prochaine étape** : [humain] `/drwil-lancer`.

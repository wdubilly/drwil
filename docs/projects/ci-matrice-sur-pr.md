# Projet : matrice Windows et macOS sur les pull requests seulement

**Statut** : ouvert le 2026-10-10 — en attente de démarrage.
**Risque** : HIGH

<!-- cadrage
fichiers:
  - .github/workflows/ia-first.yml
-->

(cadrage provisoire, à confirmer au démarrage : un test du kit ou le
contrôle de couverture CI peuvent s'y ajouter, voir « Contraintes ».)

## 1. Besoin

La CI de ce dépôt (`.github/workflows/ia-first.yml`) se déclenche sur
`push` et sur `pull_request` : sur une branche avec PR, chaque push lance
donc deux fois la matrice `kit-tests` sur Ubuntu, Windows et macOS. Les
jobs Windows (5 à 8 minutes) et macOS rallongent l'attente avant de
pouvoir fusionner. Depuis la publication du dépôt (2026-10-09), les
minutes sont gratuites : le sujet est le temps d'attente, plus le coût.

Intention : diviser par deux les jobs Windows et macOS sans laisser de
trou de test.

## 2. Hors périmètre

- Supprimer l'un des deux déclenchements `push` / `pull_request` : écarté
  le 2026-10-05 (PR #32 du dépôt archivé) — le premier teste la tête de
  branche, le second le résultat de la fusion.
- Ne tester Windows et macOS qu'à la release : écarté le 2026-10-10 (bug
  propre à un OS découvert trop tard, branche principale cassée sans le
  savoir, release bloquée).
- Le workflow livré dans le gabarit : il n'a pas de matrice multi-OS, ce
  changement ne concerne que le dépôt drwil (QUA-018, périmètre dépôt /
  gabarit).

## 3. Contraintes

- Chaque fusion reste testée sur les trois OS ; chaque push au moins sur
  Ubuntu.
- Le contrôle de couverture CI (QUA-013) vérifie que les jobs se
  déclenchent sur les bons chemins : s'assurer qu'il accepte la nouvelle
  forme, ou l'adapter (élargir alors le cadrage).
- Un même runner ne peut pas tester deux OS : Windows et macOS demandent
  toujours chacun leur job.

## 4. Décisions

- **2026-10-10 — Matrice complète sur `pull_request`, Ubuntu seul sur
  `push`** : option retenue par le demandeur, pour diviser par deux les
  jobs Windows et macOS.

## Contrats concernés

- **QUA-013** — Contrôle non exécuté n'est pas passé : la couverture CI de
  chaque contrôle doit rester prouvée.
- **QUA-004** — Seuil de couverture de test : la suite du kit tourne
  toujours, sur les trois OS avant chaque fusion.

## 5. Points à trancher

- [décision] Accélérer aussi les jobs restants : cache des dépendances npm
  (`actions/setup-node` avec `cache: npm`) ? Sous-ensemble des tests
  sensibles à l'OS sur Windows et macOS ?
- [décision] Un push direct sur la branche principale (fusion) : matrice
  complète (filet de sécurité) ou Ubuntu seul ?

## 6. Lots

- **Lot 1 — matrice conditionnelle** [IA] : `kit-tests` lance Windows et
  macOS sur `pull_request` seulement, Ubuntu partout. Critère de sortie :
  sur une PR de test, un push lance 1 job Windows et 1 job macOS au lieu
  de 2 chacun ; contrôles locaux et CI verts.

## 7. Reprise

- **Dernier état** (2026-10-10) : fiche ouverte, option retenue, rien de
  réalisé.
- **Travail non commité** : aucun.
- **Prochaine étape** : [décision] trancher les points 5, puis ouvrir une
  attente sur cette fiche.

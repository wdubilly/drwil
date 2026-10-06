# Intention : DRWIL Community Ready

**Statut** (2026-10-06) : à réaliser — intention posée par le demandeur,
questions à trancher en fin de fiche.

**Projet** : DRWIL — **Lot** : Community Ready — **Cible** : V0.2 /
post-release — **Niveau de risque** : MEDIUM.

## Besoin

### Intention

Rendre DRWIL suffisamment clair, documenté et accueillant pour qu'une
personne extérieure au projet puisse :

- comprendre rapidement ce que fait DRWIL ;
- installer le projet ;
- comprendre son architecture et son modèle de gouvernance ;
- lancer les tests ;
- comprendre comment contribuer ;
- proposer une modification ou signaler un problème ;
- signaler une vulnérabilité de manière appropriée.

L'objectif n'est pas de construire une infrastructure communautaire
complète. Il s'agit de faire passer DRWIL de :

> **projet open source publiable**

à :

> **projet open source auquel un contributeur externe peut raisonnablement
> commencer à participer.**

### Périmètre

Inclus :

- documentation de contribution ;
- règles minimales de contribution ;
- code of conduct ;
- politique de sécurité ;
- template de pull request ;
- templates d'issues utiles ;
- vérification de la cohérence des liens et instructions du README ;
- vérification que les tests et commandes documentés fonctionnent
  réellement.

Hors périmètre : plateforme communautaire ; Discord / Slack obligatoire ;
système de support dédié ; automatisation complexe des contributions ; bot
de triage ; roadmap publique détaillée ; governance board ; processus de
contribution lourd.

### Résultat attendu

Un contributeur qui découvre le dépôt doit pouvoir répondre, sans contacter
directement le mainteneur, à ces questions :

1. Qu'est-ce que DRWIL ?
2. Pourquoi le projet existe-t-il ?
3. Comment l'installer ?
4. Comment lancer les tests ?
5. Comment comprendre le modèle Contract / Control / Verify ?
6. Comment modifier le projet ?
7. Comment proposer une contribution ?
8. Comment signaler un bug ?
9. Comment signaler une vulnérabilité ?
10. Quelles sont les règles minimales de contribution ?

### Artefacts attendus

Au minimum (fichiers volontairement courts ; la clarté et l'utilité
priment sur la quantité) :

```text
README.md
LICENSE
CONTRIBUTING.md
CODE_OF_CONDUCT.md
SECURITY.md

.github/
├── ISSUE_TEMPLATE/
│   ├── bug.md
│   └── feature.md
└── pull_request_template.md
```

### Principes

- **P1 — Contribution simple** : un contributeur ne doit pas avoir besoin
  de comprendre toute l'architecture de DRWIL avant de pouvoir faire une
  petite contribution.
- **P2 — Documentation vérifiable** : les commandes et procédures
  documentées doivent correspondre au fonctionnement réel du dépôt.
- **P3 — Pas de bureaucratie inutile** : le processus de contribution
  reste proportionné à la taille et à la maturité du projet.
- **P4 — Sécurité explicite** : une vulnérabilité ne doit pas être traitée
  comme une issue publique ordinaire lorsque son exposition pourrait créer
  un risque.
- **P5 — Architecture préservée** : les contributions préservent les
  principes de DRWIL — contracts = ce qui doit être vrai ; controls =
  comment le prouver ; verify = décision de gouvernance ; agent
  independence ; no silent success ; human responsibility remains human.
- **P6 — Community ready ≠ community mature** : ce lot prépare le dépôt à
  recevoir des contributeurs ; il ne résout pas dès maintenant tous les
  problèmes d'une communauté importante.

### Critères de réussite

- [ ] CONTRIBUTING.md existe et explique le parcours minimal d'un
  contributeur ;
- [ ] CODE_OF_CONDUCT.md existe ;
- [ ] SECURITY.md existe ;
- [ ] un template d'issue bug existe ;
- [ ] un template d'issue feature existe ;
- [ ] un template de pull request existe ;
- [ ] les instructions principales du README restent cohérentes avec le
  dépôt ;
- [ ] les commandes de test documentées sont exécutables ;
- [ ] les règles importantes de contribution sont explicites ;
- [ ] aucune procédure de contribution importante ne dépend d'une
  connaissance implicite du mainteneur ;
- [ ] `drwil verify` reste PASS ou atteint uniquement les états attendus
  par les contrats existants ;
- [ ] les nouveaux fichiers communautaires sont eux-mêmes correctement
  référencés / documentés.

### Contrôles envisagés

- **COM-001 — Documentation de contribution.** Règle : le dépôt explique
  comment installer le projet, lancer les tests et proposer une
  contribution. Contrôle : présence et cohérence de CONTRIBUTING.md.
- **COM-002 — Politique de sécurité.** Règle : le dépôt indique comment
  signaler une vulnérabilité. Contrôle : présence de SECURITY.md et d'une
  procédure de signalement exploitable.
- **COM-003 — Code of Conduct.** Règle : le dépôt définit des règles
  minimales de comportement pour les contributions communautaires.
  Contrôle : présence de CODE_OF_CONDUCT.md.
- **COM-004 — Templates communautaires.** Règle : les principaux chemins de
  contribution disposent d'un cadre minimal. Contrôle : présence des
  templates d'issue et de pull request prévus.
- **COM-005 — Documentation exécutable.** Règle : les commandes importantes
  documentées dans le README correspondent aux commandes réellement
  disponibles. Contrôle : exécuter les commandes critiques du parcours
  d'installation / vérification dans un environnement approprié.

### Limites

La présence des fichiers communautaires ne garantit pas qu'une communauté
se développera. Ce lot garantit uniquement que le projet est suffisamment
préparé pour accueillir des contributeurs externes. La qualité réelle des
contributions, des échanges et de la communauté devra être observée après
ouverture du projet.

### Définition du succès

Le succès n'est pas :

> « Tous les fichiers communautaires existent. »

Le succès est :

> **Une personne extérieure peut découvrir DRWIL, comprendre son modèle,
> installer le projet, lancer les tests et proposer une contribution sans
> devoir demander au mainteneur comment commencer.**

### Suite possible

Après ce lot, observer les premiers usages réels avant d'ajouter davantage
de processus communautaires. Ne pas créer prématurément : gouvernance
complexe ; rôles de mainteneurs multiples ; processus de review lourds ;
automatisation communautaire sophistiquée. Le projet doit d'abord
apprendre de ses premiers contributeurs.

## Existant

Relevé le 2026-10-06 :

- Présents : `README.md` (positionnement, installation depuis une release,
  commandes slash, désinstallation, section « Contributing » courte),
  `LICENSE` (MIT).
- Présent mais pensé pour le processus interne : `.github/pull_request_template.md`
  (en français, demande la fiche `docs/projets/` concernée et les
  contrôles lancés).
- Absents : CONTRIBUTING.md, CODE_OF_CONDUCT.md, SECURITY.md, le
  dossier .github/ISSUE_TEMPLATE/.
- Contrats : le registre (`docs/contrats.md`) ne déclare que les préfixes
  `SEC` et `QUA` (`.drwil/ia-first.json` → `contractPrefixes`) ; les
  contrôles COM-001 à 005 ci-dessus n'existent pas encore.
- Commandes de test du dépôt : `bash .githooks/run-checks.sh` (tout
  vérifier, `AGENTS.md`) et `npm test` / `npm run test:coverage` dans
  `packages/drwil` ; à confirmer telles quelles pour un contributeur
  externe (COM-005).

## Questions à trancher

1. **Langue des fichiers communautaires** : le README est en anglais, mais
   la convention du dépôt (`AGENTS.md`) est le français pour le code, les
   commentaires et les commits. CONTRIBUTING.md, SECURITY.md, code of
   conduct et templates : anglais (public visé) ou français ? Et la langue
   attendue des contributions (issues, PR, commits) ?
2. **Gabarit de PR** : adapter le gabarit existant (français, fiche
   obligatoire) pour un contributeur externe, ou en garder un seul pour
   tous ? Une contribution externe doit-elle elle aussi passer par une
   fiche `docs/projets/` ?
3. **Canal de signalement de vulnérabilité** : signalement privé GitHub
   (*private vulnerability reporting*) ou adresse e-mail dédiée ?
4. **Code of conduct** : reprendre un texte reconnu (ex. Contributor
   Covenant 2.1) ou en écrire un court ?
5. **Contrats COM-001 à 005** : les ajouter au registre du dépôt avec un
   nouveau préfixe `COM` (et des contrôles réels), ou rester sur une
   vérification humaine pour ce lot ? Concerne-t-il aussi le gabarit livré
   aux projets (QUA-018), ou seulement ce dépôt ?
6. **COM-005, documentation exécutable** : quel environnement pour rejouer
   le parcours d'installation (CI, conteneur, à la main avant chaque
   release) ?

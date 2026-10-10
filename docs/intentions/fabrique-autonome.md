# Intention : une fabrique autonome, graduée par le risque

**Statut** (2026-10-10) : à cadrer — intention posée par le demandeur à
partir d'une analyse externe, corrigée sur l'état réel du dépôt ; questions
à trancher en fin de fiche.

**Projet** : DRWIL — **Niveau de risque** : HIGH (touche la gouvernance
elle-même : qui fusionne, sur quelle preuve).

## Besoin

Déléguer à des agents une part croissante du cycle cadrer → tests → coder
→ verify → relire → PR → fusion, sans perte de rigueur. Principe :
remplacer la confiance dans l'agent par des contrôles qu'il ne peut ni
modifier ni contourner, et doser l'autonomie par le niveau de risque des
fiches (DRWIL-012, niveaux de risque).

## Existant (vérifié le 2026-10-10)

- **Contrats** : 11 dans `docs/contrats.md`. Cinq ont un contrôle
  automatique : SEC-007 (secrets), QUA-011 (doc jamais fausse), QUA-016
  (rappel de cadrage), QUA-004 (seuil de couverture), QUA-017 (branche
  principale). Les six autres sont **ATTESTED** : validés par une
  attestation humaine locale, déclarative (`git config user.name`). Une
  attestation n'est pas une preuve qu'une fabrique peut consommer.
- **Forge** : dépôt public, mais `master` non protégé, aucun ruleset,
  aucun CODEOWNERS ; l'agent agit avec le jeton du mainteneur — chantier
  `docs/projets/proteger-master.md`.
- **Outillage fragile**, constaté le même jour :
  - depuis un worktree, les tests des contrôles écrivaient dans le vrai
    dépôt — corrigé le 2026-10-10 (`docs/projets/journal.md`, PR #16) ;
    un orchestrateur d'agents parallèles passe justement par des worktrees
    ou des conteneurs ;
  - contrôle local divergent de la CI sur les fichiers ignorés par Git
    (`docs/projets/citations-fichiers-ignores.md`) ;
  - faux positifs qui poussent au contournement : QUA-017 sur la
    suppression d'une branche distante
    (`docs/projets/qua017-push-suppression.md`), règle d'interdiction de
    l'outil qui refuse un message de commit citant le fichier d'état.
- **Consommation** : `.drwil/usage.jsonl` (si présent) est rempli à la main
  par une recette (`docs/recettes/suivre-consommation-par-lot.md`) ; aucun
  coupe-circuit automatique n'est possible sans mesure automatique.
- **Lancer** : le réglage `transitions: agent` existe déjà
  (`docs/projets/journal.md`, 2026-10-10, fiches condensées).

## Briques

1. **Autorité de vérité hors de l'agent** : CI qui rejoue `verify` sur les
   seuls fichiers commités (jamais l'état ni les preuves locales) ; ruleset
   sans contournement ; CODEOWNERS sur les hooks, la configuration, les
   workflows et les contrats ; identité distincte pour l'agent.
2. **Qualité des tests** : mutation testing en contrat bloquant (seuil de
   mutants tués), d'abord sur `packages/drwil` et les hooks ; tests
   d'acceptation dérivés des critères de la fiche ; plus aucun critère
   MANUAL en risque LOW.
3. **Rôles séparés** : testeur, codeur, relecteur ; périmètre par rôle
   dans le bloc `cadrage` (évolution du mécanisme) ; relecteur d'un autre
   modèle, sans accès au raisonnement du codeur.
4. **Références vérifiées** : chemins cités (existe), dépendances réelles
   (paquets inventés), audit de vulnérabilités (SEC-006).
5. **Orchestration** : boucle pilotée, bac à sable éphémère (réseau
   restreint, secrets absents), budgets de tokens et de tentatives,
   arrêt et escalade à l'humain sur échec répété.
6. **Autonomie graduée** :

   | Risque | Fusion |
   |---|---|
   | LOW | automatique si tous les contrats bloquants sont PASS (jamais ATTESTED), mutation et relecture croisée comprises |
   | MEDIUM | automatique après un délai d'observation, revue humaine par échantillonnage |
   | HIGH | humaine (droits, secrets, déploiement, gouvernance elle-même) |

7. **Ce qui reste humain** : les priorités, les contrats MANUAL, la
   conception des contrôles, l'audit périodique de dérive.

## Ordre proposé

0. **Protéger la forge** : `docs/projets/proteger-master.md` (sans code).
1. **Fiabiliser l'outillage** : tests isolés des `GIT_*` (fait, PR #16),
   `docs/projets/citations-fichiers-ignores.md`, faux positifs.
2. **Muscler les preuves** : mutation testing, CI indépendante.
3. **Séparer les rôles** testeur, codeur, relecteur.
4. **Orchestrateur et bac à sable**, risque LOW seulement.
5. **Élargir au MEDIUM**, sur les chiffres du bench
   (`docs/intentions/bench-avec-sans-drwil.md`).

## Liens

- `docs/intentions/fluidite-sans-perte-de-rigueur.md` : moins de gestes
  humains, mieux placés.
- `docs/intentions/vue-de-relecture.md` : ce que l'humain juge encore.
- `docs/intentions/bench-avec-sans-drwil.md` : mesure de l'apport,
  condition du passage au MEDIUM.

## Contraintes

- La fusion est aujourd'hui la décision d'acceptation humaine (section
  « Lancer et clore » de `packages/drwil/templates/fr/base/docs/ia-first.md`) :
  l'auto-fusion est un **changement de doctrine**, à décider explicitement.
- Une fabrique automatise aussi ses défauts : aucune brique d'autonomie
  avant l'étape 1.
- Coût de CI borné : le job Windows prend déjà 6 à 7 minutes.

## Questions à trancher

1. **Doctrine** : accepter l'auto-fusion, même limitée au risque LOW ?
2. **Identité de l'agent** : compte machine ou jeton à portée fine ?
3. **Mutation testing** : outil (Stryker ou autre), seuil, périmètre, et
   en CI à chaque PR ou périodiquement ?
4. **ATTESTED** : comment les six contrats attestés deviennent-ils
   prouvables, ou exclus du calcul d'autonomie ?
5. **Livrable** : la fabrique est-elle une capacité de drwil-le-livrable
   (gabarit) ou d'abord une pratique de ce dépôt (QUA-018) ?
6. **Orchestrateur** : outil existant ou script du dépôt ; où tourne-t-il ?

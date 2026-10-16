# Intention : une fabrique autonome, graduée par le risque

**Statut** (2026-10-12) : à cadrer, sur les chiffres de la consommation
et du mini-banc (vague 6) — intention posée par le demandeur à partir d'une analyse
externe, corrigée sur l'état réel du dépôt ; questions à trancher en fin
de fiche.

**Revu le 2026-10-16** (bis) : premier pas réalisé, une file de chantiers
décidée d'un geste, enchaînée par l'agent sans nouvelle intervention
(QUA-037, journal « Une file de chantiers décidée d'un geste ») ; le reste
de la vision (rôles séparés, orchestrateur, bac à sable) reste ouvert.

**Revu le 2026-10-16** : l'« Existant » du 2026-10-10 est en partie
faux. `master` est protégé depuis le 2026-10-13 (ruleset, CODEOWNERS,
compte machine de l'agent : journal) et le registre compte 23 contrats,
dont la plupart prouvés par un contrôle (`drwil verify`). La vision et
les questions restent valables (vague 6).

**Projet** : DRWIL — **Niveau de risque** : HIGH (touche la gouvernance
elle-même : qui fusionne, sur quelle preuve).

## Besoin

Déléguer à des agents une part croissante du cycle cadrer → tests → coder
→ verify → relire → PR → fusion, sans perte de rigueur. Principe :
remplacer la confiance dans l'agent par des contrôles qu'il ne peut ni
modifier ni contourner, et doser l'autonomie par le niveau de risque des
fiches (DRWIL-012, niveaux de risque).

## Existant (vérifié le 2026-10-10)

- **Contrats** : 11 dans `docs/contracts.md`. Cinq ont un contrôle
  automatique : SEC-007 (secrets), QUA-011 (doc jamais fausse), QUA-016
  (rappel de cadrage), QUA-004 (seuil de couverture), QUA-017 (branche
  principale). Les six autres sont **ATTESTED** : validés par une
  attestation humaine locale, déclarative (`git config user.name`). Une
  attestation n'est pas une preuve qu'une fabrique peut consommer.
- **Forge** : dépôt public, mais `master` non protégé, aucun ruleset,
  aucun CODEOWNERS ; l'agent agit avec le jeton du mainteneur — chantier
  journal du 2026-10-13, « Protéger master ».
- **Outillage fragile**, constaté le même jour :
  - depuis un worktree, les tests des contrôles écrivaient dans le vrai
    dépôt — corrigé le 2026-10-10 (`docs/projects/journal.md`, PR #16) ;
    un orchestrateur d'agents parallèles passe justement par des worktrees
    ou des conteneurs ;
  - contrôle local divergent de la CI sur les fichiers ignorés par Git —
    corrigé le 2026-10-10 (PR #26) ;
  - faux positifs qui poussent au contournement : QUA-017 sur la
    suppression d'une branche distante (corrigé le 2026-10-10, PR #27),
    règles d'interdiction de l'outil qui refusent un message de commit
    citant le fichier d'état ou une commande contenant « -n ».
- **Consommation** : `.drwil/usage.jsonl` (si présent) est rempli à la main
  par une recette (`docs/recipes/track-consumption-per-increment.md`) ; aucun
  coupe-circuit automatique n'est possible sans mesure automatique.
- **Lancer** : le réglage `transitions: agent` existe déjà
  (`docs/projects/journal.md`, 2026-10-10, fiches condensées).

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

0. **Protéger la forge** : journal du 2026-10-13, « Protéger master » (sans code).
1. **Fiabiliser l'outillage** : tests isolés des `GIT_*` (fait, PR #16),
   citations de fichiers ignorés (fait, PR #26), faux positifs.
2. **Muscler les preuves** : mutation testing, CI indépendante.
3. **Séparer les rôles** testeur, codeur, relecteur.
4. **Orchestrateur et bac à sable**, risque LOW seulement.
5. **Élargir au MEDIUM**, sur les chiffres du bench
   (`docs/intentions/bench-avec-sans-drwil.md`).

Précisé le 2026-10-11 (demandeur) : **mesurer avant de construire**. La
mesure de la consommation est faite (`outils/consommation.mjs`, vague 3
de `docs/projects/pending.md`) ; le mini-banc avec / sans drwil
(`docs/projects/mini-banc.md`) passe en tête de la vague 6, juste avant le
pilote (déplacé le 2026-10-12) : il mesure le drwil restructuré qui fera
tourner la fabrique. Les étapes 2 à 5 se décident sur ces chiffres. La fabrique passe **avant
la publication** (vague 6, pilote dans ce dépôt ; publication en vague 7),
avec la protection de master pour prérequis. Premier relevé : le
contexte relu à chaque échange (cache lu) domine la consommation, devant
le code produit — une fabrique sobre raccourcit d'abord les sessions.

## Liens

- `docs/intentions/fluidite-sans-perte-de-rigueur.md` : moins de gestes
  humains, mieux placés.
- `docs/intentions/vue-de-relecture.md` : ce que l'humain juge encore.
- `docs/intentions/bench-avec-sans-drwil.md` : mesure de l'apport,
  condition du passage au MEDIUM.

## Contraintes

- La fusion est aujourd'hui la décision d'acceptation humaine (section
  « Lancer et clore » de `packages/drwil/templates/common/base/docs/ia-first.md`) :
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
7. **Fabrique de feuille de route** (proposée le 2026-10-11) : une boucle
   prend la prochaine fiche prête, ouvre une session neuve par fiche
   (moins de contexte relu, donc moins de tokens), réalise, vérifie,
   ouvre la PR, fusionne selon le risque, puis passe à la suivante ;
   elle s'arrête sur une `[décision]` ou un geste `[humain]`, que le
   demandeur tranche par lots. Chaque règle de conduite qui ne tient
   aujourd'hui que par le prompt est candidate à devenir un contrôle.

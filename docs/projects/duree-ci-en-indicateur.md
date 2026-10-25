# Projet : la durée du job `checks` devient un indicateur, pas une attestation à renouveler

**Statut** : cadré le 2026-10-25.
**Risque** : HIGH
**Maturité** : prêt
**Intention** : `docs/intentions/couverture-de-qua-122.md`

<!-- scope
files:
  - docs/contracts.md
  - docs/mesures-ci-reference.md
  - docs/intentions/couverture-de-qua-122.md
  - docs/intentions/suivi-ci-et-contexte.md
  - docs/projects/pending.md
  - docs/projects/journal.md
-->

## 1. Besoin

QUA-122 (durée du job `checks`) couvre aujourd'hui tout
`.drwil/ia-first.json`. Ajouter un contrôle invalide son attestation et
impose un geste humain sans rapport avec le chantier.

Périmètre : **dépôt drwil uniquement**, pas le livrable. La durée future
devient un relevé manuel par chantier dans le journal ; QUA-122 reste une
preuve historique, bornée aux mesures du chantier d'accélération de la CI
du 2026-10-24. Il n'est ni supprimé, ni transformé en succès automatique.

## Critères d'acceptation

- [humain] QUA-122 conserve son identifiant et devient une preuve
  historique : les mesures d'origine, leurs références de CI et leurs
  limites sont conservées dans un document dédié, seul fichier de son
  champ « Couvre » ; ajouter un contrôle dans `.drwil/ia-first.json` ou
  modifier le workflow ne demande plus de renouveler cette attestation
  historique — `QUA-122`
- [humain] Le journal consigne, pour le chantier et pour les chantiers
  futurs selon une procédure documentée, la référence du passage de CI,
  la durée du job `checks` et la catégorie « hooks modifiés » ou « hooks
  inchangés ». Une mesure absente ou inexploitable est dite non mesurée ;
  les durées et leurs variations ne bloquent ni `verify` ni la clôture
  — `QUA-122`
- [humain] Les preuves de clôture existantes qui citent QUA-122 restent
  lisibles et `drwil verify --agent` rend PASS après le renouvellement
  humain de l'attestation historique ; aucune ancienne preuve n'est
  supprimée ou réécrite pour masquer un échec — `QUA-122`

## 2. Hors périmètre

- Collecte automatique, tableau de bord, tendance calculée et seuil
  d'alerte : aucun seuil nouveau dans ce chantier.
- Modification du moteur d'attestation, de la couverture par fichiers ou
  du rejeu des preuves de clôture.
- Changement du workflow, des contrôles, de leurs seuils ou de la
  configuration `.drwil/ia-first.json`.
- Autres sujets de `docs/intentions/suivi-ci-et-contexte.md`.

## 3. Contraintes

- QUA-023 (évolution déclarée d'un contrat) : changement de QUA-122
  autorisé au cadrage, pas de suppression de son histoire.
- QUA-081 (attestation invalidée par un fichier couvert modifié) reste
  intact : le document de référence est stable, distinct du journal qui
  reçoit de nouveaux relevés. Modifier cette référence invalide toujours
  l'attestation.
- QUA-085 (preuve disparue signalée par `verify`) reste intact.
- Le document de référence reprend fidèlement les valeurs et les limites
  de l'entrée du journal d'accélération de la CI, lue avec
  `node .githooks/glossary.mjs --journal acceleration-ci`.
  Ne pas affirmer rétrospectivement que chaque mesure tenait l'objectif.
- Un renouvellement humain unique sera nécessaire après modification du
  texte et de la couverture de QUA-122 ; l'agent n'atteste jamais.

## 4. Décisions

Validées par le demandeur le 2026-10-25 :

1. Remplacer l'objectif de durée attesté au fil des changements par un
   indicateur non bloquant, plutôt que simplement réduire sa couverture au
   workflow.
2. Relevé manuel au journal, avec référence de CI et distinction des deux
   catégories de hooks ; tableau de bord hors périmètre.
3. Conserver QUA-122 comme preuve historique des mesures d'origine.

## Contrats modifiés

- `QUA-122` (durée du job `checks`) : borner la règle et son jugement
  humain au constat historique ; couvrir le seul document de référence
  à créer dans le périmètre   ci-dessus, et non plus le workflow ou la configuration
  vivants. Documenter le relevé futur non bloquant.

## 5. Points à trancher

Aucun : les choix fonctionnels sont validés. L'attestation historique reste
un geste humain à la réalisation.

## 6. Increments

- **Lot 1 — référence et indicateur** [IA] : extraire fidèlement les
  mesures historiques dans le document dédié ; mettre à jour QUA-122 ;
  documenter le format et le moment du relevé par chantier dans l'entrée
  du journal ; y consigner la mesure du chantier si elle est disponible,
  sinon « non mesurée » ; mettre à jour les deux intentions concernées.
- **Lot 2 — validation historique** [humain] : examiner la référence et
  renouveler l'attestation de QUA-122 (durée du job `checks` devenue preuve
  historique). Puis [IA] : relancer
  `node .githooks/run-checks.mjs` et
  `node packages/drwil/bin/drwil.js verify --evidence --agent` ;
  clôturer seulement sur `GOVERNANCE: PASS`.

## 7. Reprise

- **Dernier état** (2026-10-25) : cadré, sans réalisation commencée.
- **Prochaine étape** : [humain] lancer le chantier dans une nouvelle
  session avec `/drwil-start`.

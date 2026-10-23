# Projet : mini-banc prêt pour l'essai réel

**Statut** : cadré le 2026-10-23.
**Risque** : HIGH
**Maturité** : prêt
**Intention** : `docs/intentions/gitleaks-au-banc.md`

<!-- scope
files:
  - outils/banc.test.mjs
  - .github/workflows/banc.yml
  - docs/benchmark-protocole.md
  - docs/architecture.md
  - docs/contracts.md
  - .drwil/ia-first.json
-->

(cadrage : ce dépôt seulement — QUA-018 (périmètre explicite : dépôt drwil
vs livrable gabarit). HIGH : le chantier touche `.github/workflows/banc.yml`,
où l'agent tourne avec le jeton d'abonnement.)

## 1. Besoin

Trois écarts restent entre le mini-banc livré (PR #210, branche
`workstream/deroule-banc`) et un passage d'essai réel qui mesure drwil,
pas l'environnement du banc :

- **CI rouge de la PR #210** : le test de QUA-108 (copie préparée comme
  chez un utilisateur réel) pousse une branche depuis la copie avec
  l'environnement complet du runner, `CI=true` compris ; les hooks de la
  copie se croient alors en CI, où un contrôle non exécuté est un échec, et
  refusent le push. Reproduit le 2026-10-23 : `CI=true node --test
  --test-name-pattern="^QUA-108 " outils/banc.test.mjs` échoue, sans `CI`
  il passe. L'agent du vrai banc ne reçoit que l'environnement réduit
  d'`envAgent` (sans `CI`) : seul le test est infidèle.
- **gitleaks absent du job `passage`** de `.github/workflows/banc.yml` :
  dans la condition « avec », le contrôle des secrets y est « non exécuté »,
  l'agent peut commiter mais pas pousser (QUA-013, contrôle non exécuté
  n'est pas passé) ; la mesure pèserait contre drwil pour une installation
  incomplète.
- **Carte d'architecture** (`docs/architecture.md`) : cite encore
  « QUA-101 to QUA-106 » pour le banc, sans QUA-107 ni QUA-108.

## Critères d'acceptation

(QUA-108 et QUA-040 réutilisés tels quels ; un contrat à créer, avec son
champ Origine.)

- Le test de la copie réaliste pousse avec l'environnement de l'agent,
  jamais celui du runner, et passe en CI comme en local — `QUA-108`
- Le job de passage du banc installe gitleaks en version épinglée, archive
  vérifiée par sa somme, comme la CI principale ; prouvé par la lecture du
  workflow — `QUA-109`
- La carte d'architecture cite les contrats du banc à jour — `QUA-040`

## 2. Hors périmètre

- Le passage d'essai réel lui-même : geste humain, après la fusion
  (`docs/intentions/campagne-mini-banc.md`).
- Le défaut des dossiers vides `drwil-banc-*` laissés par le test QUA-060 :
  détour à part.
- Ajouter gitleaks aux prérequis du README de drwil : décision produit à
  part.

## 3. Contraintes

- Même version de gitleaks que `.github/workflows/ia-first.yml` (8.21.2),
  même somme, même emplacement (`~/.local/bin`, là où le moteur le cherche) ;
  `envAgent` transmet `PATH` et `HOME` : vérifier que l'agent le trouve.
- QUA-105 (workflow à la demande, sans secret dans les résultats) reste
  tenu : aucun nouveau secret, aucun nouveau déclencheur.
- Le travail se fait sur la branche `workstream/deroule-banc` : la PR #210
  fusionne d'un bloc, à la clôture de ce chantier (fusion automatique
  désactivée le 2026-10-23 en attendant).

## 4. Décisions

- **2026-10-23 — Installer gitleaks dans le job de passage** : on mesure
  drwil, pas une installation incomplète. [décision utilisateur, sur
  recommandation]
- **2026-10-23 — Un seul chantier, sur la branche de la PR #210** : le
  correctif du test, gitleaks et la carte ensemble, plutôt qu'une file.
  [décision utilisateur]

## 5. Points à trancher

(aucun)

## 6. Increments

- **Lot 1 — banc prêt** [IA] : test de QUA-108 sur l'environnement de
  l'agent ; étape gitleaks dans le job `passage` ; contrat créé et son
  contrôle par règle (QUA-033) ; limite gitleaks retirée du protocole ;
  carte à jour. Critère de sortie : `CI=true` et sans `CI`, les tests du
  banc passent ; CI de la PR #210 verte.

## 7. Reprise

- **Dernier état** (2026-10-23) : cadré sur `workstream/deroule-banc` ;
  fusion automatique de la PR #210 désactivée.
- **Travail non commité** : aucun.
- **Prochaine étape** : [humain] lancer le chantier (`/drwil-start`).

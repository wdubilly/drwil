# Projet : reprise du chantier « contrôles lents » (fusion de master)

**Statut** : cadré le 2026-11-02.
**Risque** : HIGH
**Maturité** : prêt

<!-- scope
files:
  - .drwil/ia-first.json
  - .githooks/engine.test.mjs
  - docs/contracts.md
  - docs/projects/journal.md
-->

## 1. Besoin

Le chantier « contrôles lents » (`runAt`, QUA-208 à QUA-211) est clos en local mais jamais poussé. Depuis, master a reçu
la garde des tests isolés du pre-push (les tests ne dépendent pas des variables `DRWIL_PUSH_*`) : la fusion de master dans la branche
conflit sur ces quatre fichiers, et la barrière de périmètre (QUA-111) juge une résolution de conflit. Le besoin :
résoudre la fusion en gardant les deux côtés, relancer `verify`, puis pousser et ouvrir la PR.

## Critères d'acceptation

- Un contrôle réservé par `runAt` n'est pas joué au commit et le dit — contrat `QUA-208`
- `verify` et la CI jouent le contrôle réservé ; un réglage mal formé est refusé — contrat `QUA-209`
- Un contrôle sans `runAt` se comporte comme avant — contrat `QUA-210`
- L'empreinte propre et l'attestation restent justes pour un contrôle réservé — contrat `QUA-211`

## 2. Hors périmètre

- Tout changement du mécanisme `runAt` : le code est déjà livré dans la branche.
- Adopter `runAt` sur les contrôles de ce dépôt.

## 3. Contraintes

- Résolution des conflits : garder les deux côtés (contrôles et contrats 208 à 211 de la branche, la garde des tests
  isolés du pre-push de master).
- Aucun contrôle sauté ni contourné (QUA-019).

## 4. Décisions

Tranchée par le demandeur le 2026-11-02 : reprendre le chantier par une fiche courte plutôt que de refaire le
cadrage complet.

## 6. Increments

- **Lot 1 — fusion et vérification** [IA] : fusionner master, résoudre les 4 conflits, `verify` en PASS.

## 7. Reprise

- **Dernier état** (2026-11-02) : fusion de master tentée puis annulée (`git merge --abort`) : les 4 fichiers de conflit
  étaient refusés « hors fiches » en SCOPING (QUA-111). Au lot 1 : `git merge master`, garder les deux côtés dans
  `.drwil/ia-first.json` (contrôles 208 à 211 puis celui des tests isolés du pre-push, puis couverture-diff),
  `.githooks/engine.test.mjs`, `docs/contracts.md` et `docs/projects/journal.md`, commiter, `verify`, pousser, PR.

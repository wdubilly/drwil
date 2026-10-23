# Intention : `verify` ne donne jamais PASS dans la copie du banc

**Statut** : proposée le 2026-10-23 — limite du chantier « Mini-banc : copie
« avec » adoptée, juge et raison d'erreur corrigés » (journal du 2026-10-23).

## Besoin

La copie « avec » du mini-banc est adoptée (QUA-108, copie préparée comme
chez un utilisateur réel) : ni FAIL ni ERROR avant l'agent. Mais `verify` y
reste à « MANUAL REVIEW REQUIRED » : des contrats du socle demandent une
attestation humaine (SEC-006 pas de dépendance vulnérable connue, QUA-015
chantiers exploitables à froid, QUA-019 pas de contournement d'un contrôle,
et l'exemple APP-001), et l'humain est absent en `claude -p`. Un agent sous
drwil ne peut donc jamais obtenir `GOVERNANCE: PASS` ; il peut s'arrêter pour
demander l'attestation. Le juge note le livrable, pas la clôture, mais le
déroulé de l'essai réel dira si cela coûte des tours à la condition « avec ».

## Existant (vérifié le 2026-10-23)

- `outils/banc.mjs` (`adopter`) : étapes 1 à 3 de la recette d'adoption,
  sans contrat métier (étape 5, décision du demandeur) ni attestation.
- Test « la copie avec drwil est adoptée » (`outils/banc.test.mjs`) : exige
  0 FAIL et 0 ERROR, pas PASS.

## Questions à trancher

- [décision] Après l'essai réel : la copie garde-t-elle ces contrats à
  attester (état d'un vrai projet qui vient d'adopter), ou le banc les
  atteste-t-il d'avance, ce qui ferait faire par le banc un geste humain ?

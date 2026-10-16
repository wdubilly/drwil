# Projet : une attestation sans friction inutile

**Statut** : cadré le 2026-10-16.
**Risque** : HIGH
**Maturité** : prêt

<!-- scope
files:
  - packages/drwil/src/evidence.ts
  - packages/drwil/src/verify.ts
  - packages/drwil/src/attest.ts
  - packages/drwil/src/index.ts
  - packages/drwil/bin/drwil.js
  - packages/drwil/test/kit.test.mjs
  - packages/drwil/test/cycle.test.mjs
  - packages/drwil/templates/common/base/docs/ia-first.md
  - docs/ia-first.md
  - docs/contracts.md
-->

(cadrage : le paquet, ses tests, la doc livrée et sa copie du dépôt,
régénérée par `npm run installer-depot`, QUA-018 (dépôt vs livrable).)

## 1. Besoin

Intention : `docs/intentions/attestation-sans-friction.md`. L'attestation
est le seul geste humain obligatoire de la clôture : elle doit coûter le
jugement demandé, rien de plus. Deux frictions relevées le 2026-10-16 :
ajouter un contrôle à un contrat (preuve renforcée) force une
réattestation ; `drwil attest` relance les contrôles cités sans rien
afficher, plus de deux minutes pour QUA-013, pris pour un blocage.

## Critères d'acceptation

(contrat à créer par ce chantier : l'ID est posé dans le même commit que
le contrat, `check-docs` refusant de citer un contrat absent du registre.)

- Ajouter un contrôle à un contrat attesté ne rend pas son attestation
  obsolète ; changer sa règle, son champ Manuel, sa sévérité, ou retirer
  ou modifier un contrôle déjà attesté, si — `QUA-032`
- Une attestation écrite avant ce chantier reste valable tant que son
  contrat ne change pas — `QUA-032`
- `drwil attest` annonce chaque contrôle qu'il relance, puis son résultat,
  avant le résumé et la question — `QUA-032`

## 2. Hors périmètre

- Toute autre règle de l'attestation (terminal interactif, saisie de l'ID,
  pas de `--yes`) : inchangée.
- `drwil verify` hors `attest` : sa sortie ne change pas.

## 3. Contraintes

- `packages/drwil/src/verify.ts` est à 399 lignes (QUA-001, plafond 400) :
  extraire d'abord l'écriture de l'évidence et le caviardage (`redact`,
  `writeEvidence`) dans un nouveau module, evidence.ts, sans changer de
  comportement (lot 1, refactor : tests existants verts avant et après).
- Compatibilité : une attestation porte aujourd'hui une empreinte du texte
  entier de la section et des contrôles cités (`fingerprint`). La nouvelle
  attestation (version 2) garde une empreinte de la règle, du champ
  Manuel et de la sévérité, et une empreinte par contrôle attesté ; une
  attestation version 1 reste jugée par l'ancienne empreinte.
- Un contrôle ajouté doit passer : un contrat dont un contrôle échoue
  n'est jamais `ATTESTED` (règle actuelle, inchangée).
- Les contrôles de verify tournent en sortie capturée : verify annonce
  lui-même chaque contrôle avant et après son lancement (option `onCheck`),
  sans toucher `.githooks/` ; le rappel `beforeRun` du moteur n'est pas
  appelé par les contrôles qui ne lancent pas de commande.
- Contrats à citer : QUA-013 (un contrôle non exécuté n'est pas passé),
  QUA-019 (pas de contournement : la tolérance ne vaut que pour un ajout),
  QUA-018.

## 4. Décisions

Tranchées par le demandeur le 2026-10-16 (sondage) :

- Un contrôle ajouté ne rend pas l'attestation obsolète ; un contrôle
  retiré ou modifié, la règle, le champ Manuel ou la sévérité, si.
- `drwil attest` annonce chaque contrôle relancé et son résultat.

## 5. Points à trancher

Aucun.

## 6. Increments

- **Lot 1 — extraire l'évidence** [IA] : `redact` et `writeEvidence`
  passent de `packages/drwil/src/verify.ts` au nouveau module ;
  `packages/drwil/src/index.ts` et la CLI importent
  du nouveau module. Critère de sortie : tests du paquet verts, sans en
  modifier un seul.
- **Lot 2 — empreinte tolérante** [IA] : attestation version 2 (règle,
  Manuel, sévérité ; une empreinte par contrôle) ; verify accepte une
  version 2 dont tous les contrôles attestés sont encore cités à
  l'identique, et une version 1 sur l'ancienne empreinte. Critère de
  sortie : tests (contrôle ajouté : toujours attesté ; règle, Manuel,
  sévérité, contrôle retiré ou modifié : obsolète ; version 1 inchangée :
  valable) ; contrat créé.
- **Lot 3 — attest parle** [IA] : `drwil attest` affiche « relance de
  <contrôle>… » puis son résultat pour chaque contrôle cité ; doc livrée
  (`docs/ia-first.md`, attestation) mise à jour. Critère de sortie : test
  de la sortie ; `drwil verify` évalue chaque critère prouvé.

## 7. Reprise

- **Dernier état** (2026-10-16) : fiche cadrée ; aucun code écrit.
- **Travail non commité** : aucun.
- **Prochaine étape** : [humain] lancer le chantier (`/drwil-start`).

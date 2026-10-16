# Projet : un critère non prouvé fait tomber le verdict de verify

**Statut** : cadré le 2026-10-16.
**Risque** : HIGH
**Maturité** : prêt

<!-- scope
files:
  - packages/drwil/src/verify.ts
  - packages/drwil/src/criteria.ts
  - packages/drwil/src/verdict.ts
  - packages/drwil/src/agent.ts
  - packages/drwil/test/kit.test.mjs
  - packages/drwil/test/cycle.test.mjs
  - packages/drwil/templates/common/base/docs/ia-first.md
  - docs/ia-first.md
  - docs/contracts.md
  - .drwil/ia-first.json
-->

(cadrage : le paquet, ses tests, la doc livrée et sa copie du dépôt,
régénérée par `npm run installer-depot`, QUA-018 (dépôt vs livrable).)

## 1. Besoin

Intention : `docs/intentions/preuve-des-criteres-visible.md`, question 1,
tranchée par le demandeur le 2026-10-16. Aujourd'hui `drwil verify` peut
dire `GOVERNANCE: PASS` alors qu'un critère d'acceptation de la fiche
active n'est pas prouvé : seule la clôture le refuse, et l'agent ne le
découvre qu'à la fin. Le verdict doit dire la vérité sur le chantier en
cours.

## Critères d'acceptation

(contrat à créer par ce chantier, avec son champ Origine.)

- Un critère automatique non prouvé de la fiche active fait passer le
  verdict de verify à `FAIL` (sortie humaine, sortie agent, JSON) ; un
  critère de jugement humain non encore attesté le fait passer à
  `MANUAL` — `QUA-034`
- Les critères non prouvés sont listés dans la sortie de verify, chacun
  avec sa raison, pour l'agent comme pour l'humain — `QUA-034`
- Sans fiche active (CI, `drwil attest`), le verdict ne change pas —
  `QUA-034`

## 2. Hors périmètre

- La clôture : elle refuse déjà un critère non prouvé (QUA-022), inchangée.
- Les critères obligatoires et leur preuve par contrat : faits
  (journal, « Critères d'acceptation obligatoires »).

## 3. Contraintes

- Ordre des verdicts inchangé : FAIL > ERROR > MANUAL > PASS ; un critère
  non prouvé s'ajoute aux statuts des contrats, sans les remplacer.
- Code de sortie : celui du verdict (1 pour FAIL et MANUAL).
- `packages/drwil/src/verify.ts` est à 366 lignes (QUA-001, plafond 400).
- Contrats à citer : QUA-021 (critères obligatoires), QUA-022 (preuve
  d'un critère laissée au registre), QUA-031 (bilan des règles métier).

## 4. Décisions

Tranchée par le demandeur le 2026-10-16 (sondage) : oui, un critère non
prouvé fait tomber le verdict (`FAIL`, ou `MANUAL` pour un critère humain
non attesté) ; aucun effet sans fiche active.

## 5. Points à trancher

Aucun.

## 6. Increments

- **Lot 1 — verdict** [IA] : verify combine le statut des critères de la
  fiche active à celui des contrats ; sorties humaine, agent et JSON
  listent les critères non prouvés ; doc livrée mise à jour ; contrat
  créé. Critère de sortie : tests (critère automatique non prouvé :
  FAIL ; critère humain non attesté : MANUAL ; tout prouvé : PASS ; sans
  fiche active : inchangé) ; `drwil verify` évalue chaque critère prouvé.

## 7. Reprise

- **Dernier état** (2026-10-16) : fiche cadrée ; aucun code écrit.
- **Travail non commité** : aucun.
- **Prochaine étape** : [humain] lancer le chantier (`/drwil-start`).

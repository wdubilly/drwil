# Projet : un cycle de vie des fiches sans contournement (registre, code livré, acceptation des critères)

**Statut** : cadré le 2026-10-26.
**Risque** : HIGH
**Maturité** : à affiner
**Intention** : `docs/intentions/cloture-et-attestations.md` (parties « un cycle de vie des fiches sans contournement » et « une acceptation humaine par critère »)

<!-- scope
files:
  - packages/drwil/templates/common/base/.githooks/scope-gate.mjs
  - packages/drwil/templates/common/base/.githooks/scope.mjs
  - packages/drwil/templates/common/base/.githooks/state.mjs
  - packages/drwil/templates/common/base/.githooks/state-texts.mjs
  - packages/drwil/templates/common/base/.githooks/doc-coherence.mjs
  - packages/drwil/src/closure.ts
  - packages/drwil/src/criteria.ts
  - packages/drwil/src/evidence.ts
  - .githooks/scope-gate.test.mjs
  - .githooks/scope.test.mjs
  - .githooks/state.test.mjs
  - packages/drwil/test/kit.test.mjs
  - docs/contracts.md
  - .drwil/ia-first.json
  - packages/drwil/CHANGELOG.md
  - docs/intentions/cloture-et-attestations.md
  - docs/projects/pending.md
  - docs/projects/journal.md
-->

## 1. Besoin

Trois frictions vécues dans `drwil_com`, reproduites ici le 2026-10-17, et un
trou de preuve.

1. **Le registre en SCOPING.** Un critère doit citer un contrat déjà inscrit au
   registre, mais écrire `docs/contracts.md` pendant le cadrage déclenche
   l'avertissement de périmètre (il n'est pas dans les fichiers toujours
   acceptés de `.githooks/scope-gate.mjs`). Créer un contrat en cours de chantier a donc
   demandé deux commits : la fiche élargie ne peut pas citer l'ID tant qu'il
   n'est pas au registre, et le registre ne peut pas entrer dans le commit
   d'élargissement (qui ne touche que la fiche).
2. **Le code livré.** La clôture supprime la fiche, alors que tout fichier de
   code doit rester couvert par un cadrage : `drwil_com` a dû créer à la main
   une fiche de référence « code livré ».
3. **L'acceptation des critères.** « Critères validés par le demandeur » est une
   phrase écrite par l'agent dans la fiche : elle ne prouve rien. Rien
   n'enregistre la décision du demandeur sur les critères.

## Critères d'acceptation

(les contrats sont à créer au lancement, avec leur champ **Origine** ; IDs à
attribuer à ce moment-là dans le registre.)

- Un nouveau contrat s'écrit au registre en SCOPING sans avertissement de
  périmètre, dans le même commit que la fiche qui le cite ; un contrat existant
  modifié ou retiré reste soumis au contrôle « Contrats modifiés » — contrat à
  créer
- Un fichier de code déjà présent sur la branche principale reste couvert par
  défaut après la clôture d'une fiche ; le cadrage ne garde que le code nouveau
  ou modifié, et la barrière de périmètre n'est pas affaiblie pour un fichier
  hors de ce cas — contrat à créer
- Le lancement par sondage enregistre l'empreinte des critères acceptés par
  l'humain ; l'empreinte entre dans la preuve de clôture ; un critère modifié
  ensuite redemande un geste humain avant la clôture — contrat à créer
- Aucun agent ne peut écrire l'acceptation : elle vient du sondage lu par le
  hook ou du terminal interactif [humain] — contrat à créer (`Manuel`, attesté)

## Contrats modifiés

(à compléter au lancement après lecture du texte des contrats concernés :
QUA-035 (cadrage complet du premier coup), QUA-016 (rappel de cadrage), la
règle de périmètre de `.githooks/scope-gate.mjs`, et le contrat de la preuve de clôture.
Chaque ancien critère et sa raison sont à écrire ici et à valider par le
demandeur avant le lancement.)

## 2. Hors périmètre

- Une identité de l'agent distincte sur la forge : l'identité reste
  déclarative (`git config`) pour l'instant (décision du 2026-10-26).
- Un geste humain par critère : écarté, le lancement par sondage vaut
  acceptation.
- Affaiblir un contrôle de périmètre pour un fichier de code nouveau ou modifié.

## 3. Contraintes

- Contrainte du demandeur : réduire les contournements et les gestes répétitifs
  **sans affaiblir les contrôles de périmètre** (QUA-019, pas de contournement).
- « Code déjà livré » se définit par le contenu de la branche principale, jamais
  par ce que dit la branche du chantier.
- L'empreinte des critères est calculée par l'outil ; une fiche modifiée à la
  main après le lancement en change l'empreinte.
- Les trois parties se livrent séparément : chacune est vérifiable seule.

## 4. Décisions

(validées par le demandeur le 2026-10-26)

1. Le registre (`docs/contracts.md`) s'écrit en SCOPING sans avertissement, et un
   nouveau contrat entre dans le même commit que sa fiche.
2. Un fichier de code déjà sur la branche principale reste couvert par défaut ;
   le cadrage ne garde que le code nouveau ou modifié, après vérification que la
   barrière n'est pas affaiblie.
3. Le lancement par sondage vaut acceptation ; l'outil enregistre l'empreinte des
   critères acceptés, dans la preuve de clôture ; identité déclarative.

## 5. Points à trancher

- [décision] Registre en SCOPING : proposition de l'agent — n'autoriser sans
  avertissement que l'**ajout** d'un contrat ; toute modification ou tout
  retrait d'un contrat existant garde l'avertissement et le contrôle « Contrats
  modifiés » (c'est le cas qui change les règles du jeu). Validé ?
- [décision] « Déjà livré » : proposition de l'agent — un fichier de code
  suivi par git sur la branche principale **à la date du lancement**, donc
  couvert sans fiche ; un fichier nouveau ou dont le contenu diffère de la
  branche principale reste soumis à une fiche active. Validé ?
- [décision] Acceptation : proposition de l'agent — l'empreinte porte sur le
  texte de la section « Critères d'acceptation » ; l'état enregistre l'empreinte
  au lancement ; un critère modifié après le lancement bloque la clôture
  (`close.mjs --check`) tant que l'humain ne relance pas ou n'accepte pas de
  nouveau. Validé ?

## 6. Increments

- **Lot 1 — registre en SCOPING** [IA] : `docs/contracts.md` accepté en SCOPING pour l'ajout seul, `check-docs` accepte la citation d'un ID ajouté dans le même commit ; tests de `.githooks/scope-gate.test.mjs` ; contrat et contrôle.
- **Lot 2 — code livré couvert** [IA] : règle de couverture par défaut, tests qui prouvent que la barrière n'est pas affaiblie (fichier nouveau ou modifié toujours refusé hors fiche) ; contrat et contrôle.
- **Lot 3 — acceptation des critères** [IA] : empreinte enregistrée au lancement, lue à la clôture, dite dans la preuve ; tests de `.githooks/state.test.mjs` et du paquet ; contrat et contrôle ; attestation `Manuel` de l'absence d'écriture par l'agent. Critère de sortie : `node .githooks/run-checks.mjs` OK, `drwil verify --agent` PASS.

## 7. Reprise

- **Dernier état** (2026-10-26) : cadré, trois propositions à valider (§5).
- **Travail non commité** : aucun.
- **Prochaine étape** : [humain] valider le §5, puis lancer le chantier (`/drwil-start`).

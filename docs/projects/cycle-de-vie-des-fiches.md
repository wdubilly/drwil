# Projet : un cycle de vie des fiches sans contournement (registre, code livré, acceptation des critères)

**Statut** : cadré le 2026-10-26, élargi le même jour (lots 4 et 5, deux notes reprises au rangement du backlog ; copies du dépôt des hooks du gabarit ; sur le oui du demandeur).
**Risque** : HIGH
**Maturité** : prêt
**Intention** : `docs/intentions/cloture-et-attestations.md` (parties « un cycle de vie des fiches sans contournement » et « une acceptation humaine par critère »)

<!-- scope
files:
  - packages/drwil/templates/common/base/.githooks/scope-gate.mjs
  - packages/drwil/templates/common/base/.githooks/scope.mjs
  - packages/drwil/templates/common/base/.githooks/state.mjs
  - packages/drwil/templates/common/base/.githooks/state-texts.mjs
  - packages/drwil/templates/common/base/.githooks/state-acceptance.mjs
  - packages/drwil/templates/common/base/.githooks/state-hooks.mjs
  - packages/drwil/templates/common/base/.githooks/closure-proof.mjs
  - packages/drwil/templates/common/base/.githooks/doc-coherence.mjs
  - .githooks/doc-coherence.mjs
  - .githooks/doc-coherence.test.mjs
  - .githooks/close.test.mjs
  - packages/drwil/templates/common/base/.githooks/base-checks.mjs
  - .githooks/base-checks.mjs
  - .githooks/base-checks.test.mjs
  - packages/drwil/src/closure.ts
  - packages/drwil/src/criteria.ts
  - packages/drwil/src/evidence.ts
  - .githooks/scope-gate.test.mjs
  - .githooks/scope.test.mjs
  - .githooks/state.test.mjs
  - packages/drwil/test/kit.test.mjs
  - docs/contracts.md
  - docs/architecture.md
  - packages/drwil/templates/common/base/docs/projects/kit-mechanics.md
  - docs/projects/kit-mechanics.md
  - .drwil/ia-first.json
  - packages/drwil/CHANGELOG.md
  - docs/intentions/cloture-et-attestations.md
  - docs/projects/pending.md
  - docs/projects/journal.md
  - .githooks/scope-gate.mjs
  - .githooks/scope.mjs
  - .githooks/state-texts.mjs
  - .githooks/state.mjs
-->

## 1. Besoin

Trois frictions vécues dans `drwil_com`, reproduites ici le 2026-10-17, et un
trou de preuve ; deux frictions du cycle vécues dans ce dépôt (points 4 et 5,
notes du 2026-10-26 reprises au rangement du backlog).

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
4. **Les hooks déclarés trop tard.** Un chantier qui modifie un hook du gabarit
   bloque à la clôture tant que la puce « Contrats modifiés » n'est pas écrite
   sur le oui du demandeur (QUA-137, hook modifié non déclaré) : le signal
   n'arrive qu'en fin de chantier. Note d'origine :
   - 2026-10-26 — Récurrent : un chantier qui modifie un hook du gabarit bloque à la clôture tant que la puce « Contrats modifiés » n'est pas écrite sur le oui du demandeur (QUA-137) ; la demander dès le cadrage de la fiche, ou la déclarer au lancement, pour éviter l'arrêt en fin de chantier.
5. **La ligne d'index qui reste.** `.githooks/close.mjs` ne retire pas la ligne d'index
   d'une fiche quand cette ligne cite aussi d'autres documents. Note d'origine :
   - 2026-10-26 — `.githooks/close.mjs` ne retire pas un élément d'index qui cite, en plus de sa fiche, des docs (docs/ia-first.md…) : indexItem (doc-coherence.mjs) compte tout docs/*.md comme une fiche ; vu à la clôture de doc-lancement-parallele

## Critères d'acceptation

(les contrats sont à créer au lancement, avec leur champ **Origine** ; IDs à
attribuer à ce moment-là dans le registre.)

- Le registre des contrats s'écrit en SCOPING sans avertissement de périmètre,
  et un nouveau contrat entre dans le même commit que la fiche qui le cite ; la
  régression d'un contrat modifié dans une branche sans ligne « Contrats
  modifiés » reste signalée par `drwil verify` et refuse la clôture — `QUA-172`
- Un fichier de code déjà présent sur la branche principale reste couvert par
  défaut après la clôture d'une fiche ; le cadrage ne garde que le code nouveau
  ou modifié, et la barrière de périmètre n'est pas affaiblie pour un fichier
  hors de ce cas — `QUA-173`
- Le lancement par sondage enregistre l'empreinte des critères acceptés par
  l'humain ; l'empreinte entre dans la preuve de clôture ; un critère modifié
  ensuite redemande un geste humain avant la clôture — `QUA-174`
- Aucun agent ne peut écrire l'acceptation : elle vient du sondage lu par le
  hook ou du terminal interactif [humain] — `QUA-175`
- Au lancement (sondage et `node .githooks/state.mjs start`), une fiche dont le
  bloc `scope` cite un fichier existant de `.githooks/` sans puce « Contrats
  modifiés » qui le nomme est signalée, avec la puce à écrire sur le oui du
  demandeur ; le refus de clôture de QUA-137 reste inchangé — `QUA-137`
  (contrat modifié)
- `node .githooks/close.mjs` retire la ligne d'index d'une fiche même quand
  cette ligne cite aussi d'autres documents de `docs/` : seule une fiche de
  `docs/projects/` compte comme fiche de la ligne — `QUA-074` (contrat modifié)

## Contrats modifiés

(déclarés sur l'ordre de réaliser le chantier donné par le demandeur, qui a
validé le cadrage et ce bloc `scope` le 2026-10-26 ; les anciens critères des
contrats modifiés sont repris dans chaque puce.)

- `.githooks/scope-gate.mjs` — la barrière accepte le registre des contrats en SCOPING et au rejeu d'un commit sans trailer qui n'écrit que lui ; en BUILD, EVIDENCE et CLOSING il reste jugé comme avant (nouveau contrat QUA-172) (validé par le demandeur le 2026-10-26)
- `.githooks/scope.mjs` — `outsideBriefs` ne signale plus un fichier de code déjà livré (suivi et identique sur la branche principale) quand aucune fiche ne le cite ; un fichier nouveau, modifié ou retiré reste soumis à une fiche et la barrière de périmètre ne change pas (nouveau contrat QUA-173) (validé par le demandeur le 2026-10-26)
- `.githooks/state.mjs` — le lancement décidé par l'humain enregistre l'empreinte des critères acceptés (fiche et file), le lancement en mode agent n'enregistre rien, le retour en SCOPING l'oublie ; commande `accept` (nouveaux contrats QUA-174 et QUA-175) (validé par le demandeur le 2026-10-26)
- `.githooks/closure-proof.mjs` — la preuve de clôture dit les critères acceptés et la clôture est refusée si un critère a changé depuis l'acceptation (nouveau contrat QUA-174) (validé par le demandeur le 2026-10-26)
- `.githooks/base-checks.mjs` — `hookDeclared` sort la règle de déclaration (un hook par sa puce, un test par celle de son module) pour que le lancement l'applique ; le refus de clôture est inchangé ; ancien critère de QUA-137 : refuser la clôture tant qu'un hook modifié n'est pas déclaré, sans signalement au lancement (modifie QUA-137) (validé par le demandeur le 2026-10-26)
- `.githooks/state.mjs` — le lancement ajoute à son message le signalement des hooks cités sans puce (`.githooks/state-hooks.mjs`, modifie QUA-137) (validé par le demandeur le 2026-10-26)
- `.githooks/doc-coherence.mjs` — `indexItem` ne compte comme fiche que `docs/projects/*.md` : la ligne d'index d'une fiche qui cite aussi un autre document de `docs/` est retirée à la clôture ; ancien critère de QUA-074 : la clôture refuse les incohérences de l'index sans distinguer la fiche des autres documents cités (modifie QUA-074) (validé par le demandeur le 2026-10-26)
- `.githooks/close.test.mjs` — tests de la preuve de clôture (empreinte des critères) et de la ligne d'index retirée ; aucun contrôle affaibli (validé par le demandeur le 2026-10-26)
- `QUA-137` — contrat modifié : le lancement signale les hooks cités sans puce ; le refus de clôture est inchangé (validé par le demandeur le 2026-10-26)
- `QUA-074` — contrat modifié : seule une fiche de `docs/projects/` compte comme fiche d'une ligne d'index (validé par le demandeur le 2026-10-26)

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

1. Le registre (`docs/contracts.md`) s'écrit en SCOPING sans avertissement
   (ajout, modification et retrait), et un nouveau contrat entre dans le même
   commit que sa fiche. Le garde-fou reste la régression de contrat détectée par
   `drwil verify` à la clôture, non le périmètre.
2. Un fichier de code déjà sur la branche principale reste couvert par défaut ;
   le cadrage ne garde que le code nouveau ou modifié, après vérification que la
   barrière n'est pas affaiblie.
3. Le lancement par sondage vaut acceptation ; l'outil enregistre l'empreinte des
   critères acceptés, dans la preuve de clôture ; identité déclarative.
4. (2026-10-26, rangement du backlog) Les deux notes « hooks déclarés trop
   tard » et « ligne d'index qui reste » rejoignent cette fiche, en lots 4 et 5 ;
   au lancement, un hook non déclaré est signalé seulement, jamais bloqué : le
   refus reste à la clôture (QUA-137).

## 5. Points à trancher

- Aucun : tout est tranché le 2026-10-26, y compris le lot 4 (signaler
  seulement au lancement, le refus reste à la clôture), et « déjà livré » (fichier de
  code suivi par git sur la branche principale à la date du lancement ; un
  fichier nouveau ou différent reste soumis à une fiche active) et l'acceptation
  (empreinte de la section « Critères d'acceptation » enregistrée au lancement ;
  un critère modifié ensuite bloque la clôture tant que l'humain n'accepte pas de
  nouveau).

## 6. Increments

- **Lot 1 — registre en SCOPING** [IA] : `docs/contracts.md` accepté en SCOPING, `check-docs` accepte la citation d'un ID ajouté dans le même commit ; tests de `.githooks/scope-gate.test.mjs` ; contrat et contrôle.
- **Lot 2 — code livré couvert** [IA] : règle de couverture par défaut, tests qui prouvent que la barrière n'est pas affaiblie (fichier nouveau ou modifié toujours refusé hors fiche) ; contrat et contrôle.
- **Lot 3 — acceptation des critères** [IA] : empreinte enregistrée au lancement, lue à la clôture, dite dans la preuve ; tests de `.githooks/state.test.mjs` et du paquet ; contrat et contrôle ; attestation `Manuel` de l'absence d'écriture par l'agent. 
- **Lot 4 — hooks déclarés au lancement** [IA] : le lancement nomme chaque fichier existant de `.githooks/` cité par le cadrage sans puce « Contrats modifiés » (même règle que `undeclaredHooks`, `.githooks/base-checks.mjs`) ; tests de `.githooks/state.test.mjs` et `.githooks/base-checks.test.mjs`.
- **Lot 5 — ligne d'index retirée** [IA] : `indexItem` (`.githooks/doc-coherence.mjs`) ne compte comme fiche que `docs/projects/*.md` ; test de `.githooks/doc-coherence.test.mjs` et `.githooks/close.test.mjs` sur une ligne qui cite aussi `docs/ia-first.md`.

Critère de sortie : `node .githooks/run-checks.mjs` OK, `drwil verify --agent` PASS.

## 7. Reprise

- **Dernier état** (2026-10-28) : les 5 lots sont faits (QUA-172 à QUA-175, QUA-137 et QUA-074 modifiés) ; reste la clôture.
- **Travail non commité** : aucun.
- **Prochaine étape** : clôture (journal, preuve, `.githooks/close.mjs`).

# Projet : capitaliser les tests de non-régression à chaque chantier

**Statut** : cadré le 2026-10-15 — décisions tranchées le 2026-10-15, à lancer (la maturité des fiches est livrée).
**Risque** : HIGH
**Maturité** : prêt

<!-- scope
files:
  - packages/drwil/src/criteria.ts
  - packages/drwil/src/verify.ts
  - packages/drwil/src/verdict.ts
  - packages/drwil/templates/common/base/.githooks/briefs.mjs
  - packages/drwil/templates/common/base/.githooks/state.mjs
  - packages/drwil/templates/common/base/.githooks/state-texts.mjs
  - packages/drwil/templates/common/base/.githooks/check-docs.mjs
  - packages/drwil/templates/common/base/docs/contracts.md
  - packages/drwil/templates/common/base/docs/recipes/adopt-the-kit.md
  - packages/drwil/test/kit.test.mjs
  - packages/drwil/test/cycle.test.mjs
  - .githooks/briefs.mjs
  - .githooks/state.mjs
  - .githooks/state-texts.mjs
  - .githooks/check-docs.mjs
  - .githooks/state.test.mjs
  - .githooks/check-docs.test.mjs
  - docs/contracts.md
-->

(cadrage provisoire : à confirmer au démarrage de chaque lot ; les copies
du dépôt se régénèrent par `npm run installer-depot`, QUA-018.)

## 1. Besoin

Depuis le chantier des critères d'acceptation (journal du 2026-10-15), la
clôture refuse un critère sans preuve. Mais la capitalisation reste
facultative : une fiche sans critères passe, rien n'impose que le contrôle
lié soit réellement laissé au registre, et un dépôt neuf démarre sans filet
métier. Le demandeur veut que chaque chantier laisse un test de
non-régression durable, rejoué par `drwil verify` aux chantiers suivants.

## Critères d'acceptation

Validés par le demandeur le 2026-10-15 (sondage). Chaque critère est lié à
un contrat à créer dans `docs/contracts.md` par ce chantier : `check-docs`
refuse de citer un contrat absent du registre, donc l'ID est posé ici au
lot 5, dans le même commit que le contrat (décision du 2026-10-15).

- Une fiche « prête » sans critères d'acceptation est refusée par
  `check-docs` ; une fiche sans critères qui n'est pas « prête » reçoit un
  avertissement à la clôture — contrat à créer (lot 5)
- Un critère dont le contrat n'existe pas ou n'a pas de contrôle rejouable
  est refusé à la clôture ; un critère nouveau crée ou modifie son contrat
  dans la branche — contrat à créer (lot 5)
- Un contrat modifié sans déclaration dans « Contrats modifiés » est
  refusé ; quand un contrôle échoue, `verify` affiche le chantier d'origine
  qu'il protège — contrat à créer (lot 5)
- Un `init` neuf fournit un contrat métier d'exemple avec un contrôle à
  compléter — contrat à créer (lot 5)

## 2. Hors périmètre

- Juger si le contrôle lié teste vraiment le critère (relecture humaine).
- Les tests de régression propres à l'utilisateur : il écrit les siens, drwil
  garde les siens (deux filets distincts, journal du 2026-10-15).
- Le champ `**Maturité**` lui-même (chantier clôturé, voir
  `docs/projects/journal.md`).

## 3. Contraintes

- Gabarit d'abord, puis copie du dépôt (QUA-018) ; un projet déjà installé
  ne doit pas casser : les nouvelles règles ne visent que les fiches qui
  se déclarent « prêt » ou les critères de la branche en cours.
- S'appuie sur le chantier « maturité des fiches » (livré, journal du
  2026-10-15) pour la notion de fiche « prête » : champ `**Maturité**` et
  blocage de `check-docs`.
- Contrats à citer : QUA-015 (chantiers exploitables à froid), QUA-016
  (rappel de cadrage).

## 4. Décisions

Tranchées par le demandeur le 2026-10-15 :

- Fiche sans critères d'acceptation : avertir, puis bloquer dès que la
  fiche est déclarée « prête » (`check-docs`).
- Critère nouveau : le contrat lié et son contrôle doivent être créés ou
  modifiés dans la branche, pas seulement exister déjà.
- Dépôt neuf et adoption : `init` fournit un contrat métier d'exemple avec
  un contrôle à compléter ; le guide d'adoption (`adopt-the-kit`) explique
  comment écrire le premier.
- Intégration à drwil lui-même : ce chantier applique la règle à ses
  propres critères, liés à des contrats du registre de ce dépôt
  (`docs/contracts.md`), pour que sa non-régression rejoue avec drwil.
- Régression ou évolution (2026-10-15) : un contrat issu d'un critère garde
  la référence de son chantier d'origine ; quand son contrôle échoue,
  `verify` l'affiche (« protège le critère X du chantier Y »). Un contrôle
  qui échoue sans déclaration dans la fiche active est une régression : la
  clôture est refusée. Une évolution se déclare dans une section « Contrats
  modifiés » de la fiche (contrat, ancien critère, raison), validée par le
  demandeur au cadrage, jamais par l'agent en cours de route.
- Réutiliser un contrat existant sans le modifier est accepté ; le
  modifier sans le déclarer est refusé (remplace la règle « créé ou
  modifié » pour le cas du contrat réutilisé).
- Formats (2026-10-15, sondage) : l'origine d'un contrat est un champ
  facultatif `**Origine** : <chantier> — « <critère> »` du registre (le
  chantier nommé par son titre : la fiche disparaît à la clôture) ; une
  déclaration de la section « Contrats modifiés » est une puce par contrat,
  l'ID entre accents graves en tête, puis l'ancien critère et la raison.

## 5. Points à trancher

(aucun.)

## 6. Increments

- **Lot 1 — fiche sans critères** [IA] : avertissement à la clôture,
  blocage par `check-docs` d'une fiche « prête » sans critères. Critère de
  sortie : un test sur chaque cas.
- **Lot 2 — preuve laissée dans la branche** [IA] : `evaluateCriteria`
  vérifie que le contrat lié existe avec un contrôle rejouable, et qu'un
  critère nouveau crée ou modifie son contrat dans la branche. Critère de
  sortie : un test sur critère nouveau accepté, critère sur contrat
  réutilisé accepté, critère sans contrat refusé.
- **Lot 3 — régression ou évolution** [IA] : origine du contrat affichée par
  `verify` quand un contrôle échoue ; section « Contrats modifiés » lue dans
  la fiche ; contrat modifié sans déclaration refusé. Critère de sortie : un
  test de régression refusée, un d'évolution déclarée acceptée.
- **Lot 4 — dépôt neuf** [IA] : contrat métier d'exemple et guide dans
  `adopt-the-kit`. Critère de sortie : un test sur un `init` neuf, qui
  montre le contrat et son contrôle à compléter.
- **Lot 5 — drwil sur lui-même** [IA] : les critères de ce chantier sont
  liés à des contrats de `docs/contracts.md` avec contrôle rejouable ; les
  quatre contrats sont créés et leurs ID posés dans la section « Critères
  d'acceptation » dans le même commit. Critère
  de sortie : `drwil verify` du dépôt les évalue en `pass`.

## 7. Reprise

- **Dernier état** (2026-10-15) : chantier lancé (fusion automatique
  autorisée). Lot 1 fait : `check-docs` refuse une fiche « prête » sans
  critère, la clôture avertit une fiche sans critères. Lot 2 fait : chaque
  contrat lié est classé créé, réutilisé ou modifié contre la base de la
  branche (`contractChanges`, `packages/drwil/src/criteria.ts`) et affiché
  dans le tableau des critères ; un critère sans contrat reste refusé. Un
  contrat réutilisé est accepté (décision du 2026-10-15). Lot 3 fait : un
  contrat modifié que la fiche active ne déclare pas (section « Contrats
  modifiés », lue par `declaredContracts`) est listé par `verify` et
  refuse la clôture ; un contrat en échec qui porte `**Origine**` affiche le
  critère qu'il protège.
- **Travail non commité** : aucun.
- **Prochaine étape** : [IA] lot 4 (dépôt neuf).

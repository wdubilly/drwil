# Projet : capitaliser les tests de non-régression à chaque chantier

**Statut** : cadré le 2026-10-15 — décisions tranchées le 2026-10-15, à lancer (la maturité des fiches est livrée).
**Risque** : HIGH

<!-- scope
files:
  - packages/drwil/src/criteria.ts
  - packages/drwil/src/verify.ts
  - packages/drwil/templates/common/base/.githooks/briefs.mjs
  - packages/drwil/templates/common/base/.githooks/state.mjs
  - packages/drwil/templates/common/base/.githooks/state-texts.mjs
  - packages/drwil/templates/common/base/.githooks/check-docs.mjs
  - packages/drwil/templates/common/base/docs/contracts.md
  - packages/drwil/templates/common/base/docs/recipes/adopt-the-kit.md
  - packages/drwil/test/kit.test.mjs
  - packages/drwil/test/cycle.test.mjs
  - .githooks/state.test.mjs
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
  liés à des contrats de `docs/contracts.md` avec contrôle rejouable. Critère
  de sortie : `drwil verify` du dépôt les évalue en `pass`.

## 7. Reprise

- **Dernier état** (2026-10-15) : fiche cadrée et tranchée, aucun code écrit.
- **Travail non commité** : cette fiche et sa ligne d'index.
- **Prochaine étape** : lot 1, au lancement du chantier.

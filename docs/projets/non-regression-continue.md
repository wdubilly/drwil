# Projet : non-régression continue — tests rattachés aux contrats

**Statut** : cadré le 2026-10-11 — décisions prises, lot 1 à lancer.
**Risque** : HIGH

<!-- cadrage
fichiers:
  - docs/recettes/corriger-un-defaut.md
  - outils/miroirs.json
  - outils/verifier-tests-contrats.mjs
  - outils/verifier-tests-contrats.test.mjs
  - docs/contrats.md
  - .drwil/ia-first.json
  - .github/workflows/ia-first.yml
  - AGENTS.md
-->

(cadrage : ce dépôt d'abord — QUA-018 (périmètre explicite : dépôt drwil
vs livrable gabarit), décision du 2026-10-11 : la recette et le contrôle
de cohérence sont propres au dépôt (`outils/`, recette déclarée dans
`outils/miroirs.json`) ; la mécanique livrée (`.githooks/contrats.mjs`,
`drwil verify`) ne change qu'au moment de livrer, dans un chantier à part.
HIGH imposé : `.github/` et `.drwil/`.)

## 1. Besoin

Intention `docs/intentions/non-regression-continue.md`, questions
tranchées le 2026-10-11. Aujourd'hui, un défaut corrigé donne un test vu
échouer avant la correction par discipline, sans règle ; seuls 18 tests
sur 254 portent l'ID d'un contrat dans leur nom (relevé du 2026-10-11),
et le lien n'est exploité nulle part. Contrat candidat réalisé :
v1:TST-004 (`docs/intentions/catalogue-cycle-de-vie.md`).

## 2. Hors périmètre

- Livrer la capacité aux projets équipés (chantier suivant, une fois
  éprouvée ici), y compris la lecture de la traçabilité par `drwil verify`.
- Renommer tous les tests : seuls ceux qui protègent un contrat du
  registre portent son ID ; les autres restent tels quels.
- Stockage parallèle des preuves et sélection des tests (décidé : non).

## 3. Contraintes

- Une seule source par information : le nom du test porte l'ID du
  contrat ; le champ « Tests » du contrat liste les **fichiers** de tests
  qui le protègent (pas les noms : un test renommé ne casse pas le lien).
- Cohérence vérifiée dans les deux sens : un fichier listé contient au
  moins un test au nom préfixé par l'ID du contrat ; un test préfixé par
  l'ID d'un contrat du registre est dans un fichier que ce contrat liste.
  Un ID absent du registre en tête d'un nom de test est signalé (les
  `DRWIL-…` actuels : à renommer ou à rattacher).
- La règle « défaut corrigé → test vu échouer avant la correction » est
  une recette, pas un contrôle (décision) : elle se suit, elle ne se
  vérifie pas encore mécaniquement.
- Rejeu sur la base : seulement quand un test échoue en CI, pour dire si
  l'échec existait déjà sur la branche principale — jamais pour le
  masquer : l'échec reste un échec.

## 4. Décisions

- **2026-10-11 — Rattachement : les deux**, cohérence contrôlée.
  [décision utilisateur]
- **2026-10-11 — Recette d'abord** pour la règle « défaut corrigé →
  test ». [décision utilisateur]
- **2026-10-11 — Rejeu sur la base de la PR, seulement en cas d'échec.**
  [décision utilisateur]
- **2026-10-11 — Ni stockage parallèle ni sélection des tests.**
  [décision utilisateur]
- **2026-10-11 — Ce dépôt d'abord**, avec la limite écrite dans
  l'intention : données à l'utilisateur, mécanique au kit. [décision
  utilisateur]

## Contrats concernés

- **QUA-013** — Contrôle non exécuté n'est pas passé : un rejeu sur la base
  qui ne peut pas tourner ne vaut pas « échec préexistant ».
- **QUA-018** — Périmètre explicite : dépôt drwil vs livrable gabarit.
- **QUA-011** — Doc jamais fausse : le champ « Tests » cite des fichiers
  qui existent.

## 5. Points à trancher

- ~~Les cinq questions de l'intention~~ — tranchées le 2026-10-11 (voir
  « Décisions »).

## 6. Lots

- **Lot 1 — recette** [IA] : `docs/recettes/corriger-un-defaut.md` (à créer) :
  reproduire, écrire le test au nom préfixé par l'ID du
  contrat, le voir échouer, corriger, le voir passer, ajouter le fichier
  au champ « Tests » du contrat ; citée dans `AGENTS.md` ; déclarée propre
  au dépôt dans `outils/miroirs.json`. Critère de sortie : doc et miroirs
  verts.
- **Lot 2 — champ « Tests » et contrôle de cohérence** [IA] :
  `outils/verifier-tests-contrats.mjs` (à créer), testé ; champ « Tests »
  renseigné pour les contrats du registre qui ont des tests ; tests
  rattachés renommés au besoin ; contrôle déclaré. Critère de sortie :
  contrôle vert ; un test rattaché retiré ou un fichier listé sans test
  rattaché le fait échouer (vérifié).
- **Lot 3 — échec préexistant** [IA] : en CI, si les contrôles échouent,
  rejouer les tests sur la base de la PR et dire, sans changer le verdict,
  si l'échec existait déjà. Critère de sortie : simulé sur une PR d'essai,
  le message distingue « introduit par la PR » et « déjà présent ».

## 7. Reprise

- **Dernier état** (2026-10-11) : fiche cadrée, rien de réalisé.
- **Travail non commité** : aucun.
- **Prochaine étape** : [humain] `/drwil-lancer`.

# Projet : tester la CLI installée depuis le tarball, comme un utilisateur

**Statut** : cadré le 2026-10-11 — lot 1 à lancer.
**Risque** : HIGH

<!-- cadrage
fichiers:
  - outils/tester-tarball.mjs
  - outils/tester-tarball.test.mjs
  - .drwil/ia-first.json
  - package.json
-->

(cadrage : un contrôle propre à ce dépôt, sur le paquet livré — QUA-018
(périmètre explicite : dépôt drwil vs livrable gabarit) : le paquet ne
change pas, on éprouve ce qu'il livre. HIGH imposé : `.drwil/`.)

## 1. Besoin

Vague 2 de la feuille de route (`docs/projets/en-attente.md`). Les tests
du paquet exercent le code depuis le dépôt ; un test vérifie que
`npm pack --dry-run` n'omet aucun fichier du gabarit. Mais rien ne vérifie
ce que reçoit vraiment un utilisateur : le tarball construit, installé
dans un projet vierge, et sa CLI exécutée. Un oubli dans `files` du
manifeste, un `bin` cassé ou un fichier propre au dépôt glissé dans le
paquet passeraient. Contrats candidats réalisés : v1:PKG-004, v1:PKG-005
(`docs/intentions/catalogue-cycle-de-vie.md`).

## 2. Hors périmètre

- La publication npm et sa porte (vague 5).
- Les tests fonctionnels déjà couverts par `packages/drwil/test/kit.test.mjs`.

## 3. Contraintes

- Contrôle déclaré à part des tests unitaires : il installe la dépendance
  `commander` depuis le registre ; sans réseau, il échoue avec « non
  exécuté », jamais vert (QUA-013), comme l'audit des dépendances.
- Au commit, il ne tourne que si le paquet change (`chemins`) ; toujours
  au push et en CI.
- Contenu du paquet comparé à une liste attendue (motifs), pour qu'un
  fichier propre au dépôt glissé dans le paquet se voie.
- Dossiers temporaires supprimés après coup, même en cas d'échec.

## 4. Décisions

- **2026-10-11 — Vague 2 de la feuille de route** : tester la CLI
  installée depuis le tarball, comme un utilisateur. [décision
  utilisateur]

## Contrats concernés

- **QUA-013** — Contrôle non exécuté n'est pas passé.
- **QUA-018** — Périmètre explicite : dépôt drwil vs livrable gabarit.

## 5. Points à trancher

(aucun)

## 6. Lots

- **Lot 1 — tarball installé et exécuté** [IA] :
  `outils/tester-tarball.mjs` (à créer) construit le tarball (`npm pack`), compare son contenu à la
  liste attendue, l'installe dans un projet vierge, lance
  `drwil --version` (version du manifeste), puis `drwil init` et
  `drwil verify` dans un projet temporaire ; testé, contrôle déclaré.
  Critère de sortie : contrôle vert en local et en CI ; un fichier
  inattendu dans le paquet, ou un `bin` cassé, le fait échouer (vérifié).

## 7. Reprise

- **Dernier état** (2026-10-11) : fiche cadrée, rien de réalisé.
- **Travail non commité** : aucun.
- **Prochaine étape** : [humain] `/drwil-lancer`.

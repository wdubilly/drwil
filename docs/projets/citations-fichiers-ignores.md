# Projet : un chemin cité ne vaut pas preuve s'il est ignoré par Git

**Statut** : rouvert le 2026-10-10 — lot 1 livré mais en échec sur Windows (CI de la PR #26) ; correctif à lancer.
**Risque** : HIGH

<!-- cadrage
fichiers:
  - packages/drwil/templates/common/base/.githooks/check-docs.mjs
  - .githooks/check-docs.mjs
  - packages/drwil/test/kit.test.mjs
-->

(cadrage provisoire, à confirmer au démarrage.)

## 1. Besoin

Le 2026-10-09, la CI de la PR gouvernance a échoué sur `README.md` : un
chemin cité (l'état local de gouvernance) n'existait pas sur le runner.
En local, le contrôle des chemins cités passait, parce que ce fichier
existe sur le poste, bien qu'ignoré par Git. Le contrôle local diverge
donc de la CI pour tout fichier local ignoré (état, évidences, réglages
personnels) : tout projet qui utilise le gabarit est concerné.

Second piège constaté le même jour, trois fois : la mention « (si
présent) » n'est reconnue que sur la même ligne que le chemin ; un retour
à la ligne la rend inopérante.

## 2. Hors périmètre

- Changer la convention « (si présent) » elle-même.

## 3. Contraintes

- Le résultat local doit être celui de la CI : ne juger que sur les
  fichiers suivis par Git (ou non ignorés).

## 4. Décisions

- **2026-10-10 — Erreur en local** : un chemin cité qui n'existe que comme
  fichier ignoré par Git est une erreur de check-docs en local, comme en
  CI ; le commit est refusé tout de suite plutôt qu'une CI rouge après le
  push (constaté deux fois le 2026-10-10, PR #11 et #13). [décision
  utilisateur]
- **2026-10-10 — « (si présent) » aussi sur la ligne suivante** : un retour
  à la ligne entre le chemin et la mention ne fait plus échouer la
  citation. [décision utilisateur]

## Contrats concernés

- **QUA-011** — Doc jamais fausse : le contrôle des chemins cités en est
  la preuve.
- **QUA-013** — Contrôle non exécuté n'est pas passé : un contrôle qui
  passe en local et échoue en CI n'a rien prouvé.

## 5. Points à trancher

- ~~Les points ouverts~~ — tranchés le 2026-10-10 (voir « Décisions »).

## 6. Lots

- **Lot 1 — juger les citations comme la CI** [IA] : un fichier ignoré
  par Git ne suffit plus à valider une citation. Critère de sortie : un
  test du kit reproduit le cas du 2026-10-09 (fichier ignoré présent en
  local, citation sans « (si présent) ») et le contrôle échoue en local.

## 7. Reprise

- **Dernier état** (2026-10-10) : lot 1 livré sur la PR #26 (commit
  `7dde03e`) et clôturé, mais la CI échoue sur Windows : le test du kit
  « un fichier ignoré par Git ne vaut pas preuve » attend un refus et
  check-docs passe (`actual: 0, expected: 1`). Cause probable : les chemins
  envoyés à `git check-ignore` sont au format Windows (barres obliques inversées)
  et Git ne les reconnaît pas comme ignorés. Fiche restaurée et fusion
  automatique de #26 désarmée (elle aurait fusionné dès la CI verte, avant
  la nouvelle clôture).
- **Travail non commité** : aucun.
- **Prochaine étape** : [humain] relancer (`/drwil-lancer`) ; [IA] envoyer
  les chemins au format `/` et comparer sur ce format, vérifier en CI
  Windows, reclore.

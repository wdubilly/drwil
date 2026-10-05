# Projet : corriger le faux positif QUA-017 sur un push de tag

**Statut** : cadré le 2026-10-05 — lot 1 à faire.

<!-- cadrage
fichiers:
  - .githooks/pre-push
  - .githooks/run-checks.mjs
  - .githooks/run-checks.test.mjs
-->

## 1. Besoin

`node .githooks/creer-release.mjs` (recette `docs/recettes/creer-une-release.md`)
pose un tag Git sur le commit courant de `master` puis le pousse
(`git push origin <tag>`). Ce push est systématiquement refusé par le hook
`pre-push`, qui relance `.githooks/run-checks.mjs` en entier — y compris QUA-017
(« pas de travail direct sur la branche principale »), lequel ne regarde que
la branche courante (`git symbolic-ref --short HEAD`) sans tenir compte de ce
qui est réellement poussé. Un push de tag ne modifie jamais `master` : c'est
un faux positif qui bloque toute release depuis ce dépôt.

Constaté le 2026-10-05 : `node .githooks/creer-release.mjs` échoue à l'étape
`git push origin v0.1.0` (tag créé localement, jamais poussé, aucune release
GitHub créée). Aucun contournement (`--no-verify`) n'a été accepté par le
demandeur : la correction doit être propre, pas une solution de rechange.

## 2. Hors périmètre

- Ne touche pas à la logique de détection de version/bump de
  `.githooks/creer-release.mjs` (déjà testée, hors sujet ici).
- Ne modifie pas le comportement de QUA-017 pour un vrai push de commits sur
  `master`/`main` : ce cas doit continuer à être bloqué exactement comme
  aujourd'hui.
- Ne traite pas d'éventuels autres faux positifs de `pre-push` non identifiés
  à ce jour (ouvrir une fiche séparée si un autre cas apparaît).

## 3. Contraintes

- Le hook `pre-push` reçoit normalement sur son entrée standard une ligne par
  référence poussée : `<local ref> <local sha1> <remote ref> <remote sha1>`
  (protocole standard Git pour `pre-push`) — c'est la seule information fiable
  pour distinguer « je pousse un tag » de « je pousse `master` ».
- `.githooks/run-checks.mjs` est un point d'entrée partagé (pre-commit, pre-push, CI) :
  toute modification doit rester rétrocompatible pour les deux autres appels.
- Garder la preuve par test (pas seulement une relecture) : simuler un
  pre-push qui ne pousse qu'un tag, et un autre qui pousse `master`, doit
  donner deux résultats différents.

## 4. Décisions

(aucune encore — voir points à trancher ci-dessous)

## 5. Points à trancher

- [décision] Faut-il skipper uniquement le contrôle QUA-017 sur un push ne
  contenant que des tags (recommandé : les autres contrôles — secrets, doc,
  tests — restent utiles et rapides à rejouer), ou skipper tout
  `.githooks/run-checks.mjs` dans ce cas précis (plus simple, mais perd la détection
  de secret sur le tag lui-même, peu probable mais possible si le message du
  tag contenait un secret) ?
- [décision] Si le push mélange un tag et une branche (cas rare, ex. `git
  push --tags` après avoir aussi poussé une branche) : bloquer par prudence
  (dès qu'une des références poussées n'est pas un tag, QUA-017 s'applique
  normalement), ou analyser chaque référence séparément ?
- [décision] Sur Windows, Git for Windows exécute `pre-push` via son propre
  `sh` (commentaire déjà présent dans le fichier) — confirmer que la lecture
  de l'entrée standard fonctionne de façon identique sur les 3 OS testés en
  CI (`kit-tests`), pas seulement sur Linux/macOS.

## 6. Lots

- **Lot 1 — lire les références poussées et exempter un push de tag pur**
  [IA] : dans `.githooks/pre-push`, lire l'entrée standard (protocole
  pre-push standard), détecter si toutes les références locales poussées
  commencent par `refs/tags/` ; si oui, ne pas faire échouer le push sur
  QUA-017 (détail exact selon la décision du point 1 ci-dessus). Ajouter un
  test qui simule les deux cas (tag seul / branche `master`). Critère de
  sortie : `node .githooks/creer-release.mjs` pousse effectivement le tag
  sans erreur sur ce dépôt ; un push direct de `master` reste refusé comme
  avant (non-régression prouvée par test).

## 7. Reprise

- **Dernier état** (2026-10-05) : fiche cadrée, pas encore de code écrit.
- **Travail non commité** : aucun.
- **Prochaine étape** : [IA] lot 1.

# Créer une release (optionnel)

Module **non installé par défaut** : `scaffold()` ne copie pas ce dossier.
Pose un **tag Git annoté** (`vX.Y.Z`) et une **note de release GitHub**
(`gh release create --generate-notes`) sur le commit courant — jamais de
fichier suivi modifié (pas de `CHANGELOG.md` committé, pas de bump de
`package.json`) : compatible avec QUA-017 (pas de commit direct sur la
branche principale) sans PR supplémentaire.

## Contenu

- `creer-release.mjs` : calcule la version suivante depuis le dernier tag
  et les commits non-merge depuis ce tag (Conventional Commits,
  best-effort — aucun format de message n'est imposé, défaut sûr : bump
  *patch* si aucun type `feat`/rupture reconnu), puis pose le tag + la
  release. Mode `--dry-run` : affiche la version calculée sans rien créer.

## Tarball npm attaché à la release (téléchargeable)

Si le dépôt contient un ou plusieurs paquets npm publiables (un
`package.json`, si présent, suivi par Git, avec un `name`, sans
`"private": true` — un monorepo avec `workspaces` et une racine privée
n'en pose aucun problème : seuls les paquets non privés sont repérés),
le script construit un tarball (`npm pack`) pour chacun et l'attache
comme asset à la release GitHub. Quiconque visite la page de la release
peut alors télécharger le `.tgz` directement, sans avoir besoin de
cloner le dépôt ni de publier sur le registre npm. `--dry-run` liste
les paquets qui seraient empaquetés sans construire ni attacher quoi
que ce soit.

## Activation manuelle (sur demande explicite, comme un commit ou un push)

Comme pour tout commit ou push, ce script ne doit jamais tourner tout
seul : il se lance seulement quand l'utilisateur le demande
explicitement (par ex. « fais une release », « tague une version »), pas
automatiquement à chaque merge.

1. Copier `creer-release.mjs` dans `.githooks/` du projet.
2. Aperçu sans rien créer : `node .githooks/creer-release.mjs --dry-run`.
3. Créer réellement le tag + la release : `node .githooks/creer-release.mjs`
   (nécessite `git push` vers `origin` et `gh` authentifié pour la note de
   release — le tag est créé même si `gh` échoue).

Limite assumée : pensé pour GitHub (`gh release create`). Sur GitLab, le
tag Git est posé de la même façon (`git tag` + `git push`), mais la note
de release doit être créée via l'API Releases de GitLab (non couvert ici
— à adapter, best-effort comme pour `alerter-si-ci-cassee`).

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

## Activation manuelle

1. Copier `creer-release.mjs` dans `.githooks/` du projet.
2. Aperçu sans rien créer : `node .githooks/creer-release.mjs --dry-run`.
3. Créer réellement le tag + la release : `node .githooks/creer-release.mjs`
   (nécessite `git push` vers `origin` et `gh` authentifié pour la note de
   release — le tag est créé même si `gh` échoue).

## Activation automatique (un chantier fusionné = une release)

Coller ce job dans le workflow CI du projet (GitHub Actions), après les
jobs de test, pour déclencher une release à chaque merge réussi sur la
branche par défaut :

```yaml
  creer-release:
    needs: [checks] # adapter à la liste réelle des jobs de test du projet
    if: >-
      always() && github.event_name == 'push' &&
      github.ref == format('refs/heads/{0}', github.event.repository.default_branch) &&
      needs.checks.result == 'success'
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0 # historique complet : nécessaire pour retrouver le dernier tag
      - run: node .githooks/creer-release.mjs
        env:
          GH_TOKEN: ${{ github.token }}
```

Limite assumée : pensé pour GitHub (`gh release create`). Sur GitLab, le
tag Git est posé de la même façon (`git tag` + `git push`), mais la note
de release doit être créée via l'API Releases de GitLab (non couvert ici
— à adapter, best-effort comme pour `alerter-si-ci-cassee`).

# Notes de recette

Une note par version publiée, un fichier par version : la fiche de recette,
le verdict, les réserves, qui a donné le verdict et quand, le sha256 de
chaque tarball.

Elles ne s'écrivent pas à la main : le module de release les génère
(`.githooks/recette-note.mjs`, QUA-078) et les propose par une pull request
par version, sur une branche `recette/<version>` (la branche principale est
protégée, QUA-017).

- Version promue (`node .githooks/promote-release.mjs`) : la note reprend la
  fiche de la candidate et son verdict.
- Version publiée sans candidate (`node .githooks/create-release.mjs`,
  QUA-079) : la note dit « sans verdict » ; la partie « À compléter » est la
  seule à remplir à la main, dans la PR.
- Si la PR de la note échoue, la release reste publiée (QUA-080) : la sortie
  de la commande donne la commande de rattrapage, `node
  .githooks/recette-note.mjs <version> <fichier de la note>`.

Les notes des versions publiées avant ce dossier ne sont pas rétro-écrites.

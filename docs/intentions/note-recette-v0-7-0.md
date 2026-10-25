# Intention : donner sa note de recette à la v0.7.0

**Statut** : proposée le 2026-10-25 — limite du chantier « le pre-push juge
la branche poussée, la note de recette arrive enfin ».

## Besoin

La v0.7.0 (publiée le 2026-10-22) n'a pas de note de recette dans le dépôt :
le push de `recette/v0.7.0` depuis `master` avait été refusé par le pre-push
(QUA-017, pas de travail direct sur la branche principale, jugé alors sur la
branche courante), et le fichier temporaire de la note est perdu. QUA-079
(une version publiée sans candidate reçoit quand même sa note) veut une
note à chaque version.

## Existant (relevé le 2026-10-25)

- Le pre-push juge désormais la référence poussée : le rattrapage
  `node .githooks/recette-note.mjs v0.7.0 <note>` depuis `master` passe.
- `.githooks/recette-note.mjs` ne génère pas la note : il publie un fichier déjà
  écrit. La génération (empreintes des tarballs, changements depuis le tag
  précédent) vit dans `.githooks/create-release.mjs`, au moment de la publication.

## Questions à trancher

- Régénérer la note d'une version passée (empreinte du tarball attaché à la
  release GitHub, changements `v0.6.x..v0.7.0`) par une option du module de
  release, ou l'écrire une fois à la main ?
- Ou assumer le trou, dit dans le changelog ?

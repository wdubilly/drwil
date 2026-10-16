# Intention : la carte et le README d'un projet client dans sa langue

**Statut** : proposée le 2026-10-16 — limite du chantier « Une
documentation à jour pour la 0.6.0, et qui le reste » (journal du
2026-10-16).

## Besoin

drwil entretient désormais la carte `docs/architecture.md` du client
(QUA-040) et lui fait tenir README et changelog à la clôture. Mais le
squelette posé par `init` est en anglais, et l'`AGENTS.md` livré ne cite
pas la carte ni le README parmi les documents à écrire dans la langue du
projet : chez un client francophone, ils peuvent finir moitié anglais,
moitié français. Dans ce dépôt, le demandeur a tranché autrement pour ce
que lit un prospect (anglais, règle dans `AGENTS.md`) : un client peut
vouloir l'un ou l'autre.

## Existant (vérifié le 2026-10-16)

- `packages/drwil/templates/common/base/docs/architecture.md` : squelette
  en anglais, rendu tel quel quelle que soit `--lang`.
- `packages/drwil/templates/common/base/AGENTS.md` : liste des documents
  écrits dans la langue du projet (fiches, intentions, journal, commits),
  sans la carte ni le README.

## Questions à trancher

- [décision] Carte et README dans la langue du projet par défaut, ou un
  réglage (langue de la doc publique distincte de la langue de travail) ?
- [décision] Le contrôle `architecture-map` ne juge que la présence d'un
  dossier, pas la justesse de son rôle : l'assumer comme part humaine, ou
  signaler une carte non touchée depuis longtemps alors que le code bouge ?

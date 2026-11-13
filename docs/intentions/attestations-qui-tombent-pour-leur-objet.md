# Intention : une attestation ne tombe plus pour un changement sans rapport avec son objet

**Statut** : cadrée le 2026-11-13 — `docs/projects/attestations-qui-tombent-pour-leur-objet.md`.

## Besoin

Une attestation humaine tombe dès qu'un fichier qu'elle couvre change (QUA-081). Quand elle couvre un fichier
carrefour, touché par presque tous les chantiers, le jugement humain est redemandé alors que son objet n'a pas
changé : un geste humain par chantier, et une attestation qui perd son sens à force d'être refaite. Garder QUA-081,
mais qu'une attestation ne tombe que pour ce qu'elle juge.

## Existant

Relevé le 2026-11-12 par le scan de valeur, à revérifier au cadrage.

- 88 réattestations en novembre ; `.githooks/state.mjs` et `.github/workflows/ia-first.yml` ont changé 11 fois
  chacun depuis le 2026-10-22. Chaque chantier qui touche `.githooks/state.mjs` fait retomber QUA-048 et QUA-067 ;
  QUA-067 (hooks de Gemini) est retombé pour un simple message de lancement.
- `**Couvre**` est déclaré par 28 contrats de `docs/contracts.md`.
- Briques réutilisables : `coverageOf` et `coverageChanges` (`packages/drwil/src/coverage.ts`), `obsoleteReasons`
  (`packages/drwil/src/fingerprint.ts`), l'archive `.drwil/evidence/attestations/` (167 fichiers, d'où se tire le
  nombre de réattestations par contrat).
- Préférence déjà exprimée par le demandeur : un critère mécanique devient un test en dur, l'humain ne juge que ce
  qui demande un jugement.

## Pistes

1. D'abord l'inventaire chiffré : par contrat attesté, fichiers couverts et nombre de réattestations.
2. Puis, contrat par contrat : couvrir le module dédié au lieu du fichier carrefour, ou remplacer l'attestation par
   un test en dur quand le jugement est mécanique.

## Questions à trancher

1. Le resserrage de `**Couvre**` se décide-t-il contrat par contrat (une puce « Contrats modifiés » chacun), ou par
   une règle générale (jamais de fichier carrefour dans `**Couvre**`) vérifiée par un contrôle ?
2. Quels contrats passent en test en dur, et lesquels gardent un jugement humain ?
3. Un seul chantier pour l'inventaire et les changements, ou l'inventaire d'abord, en fiche courte ?

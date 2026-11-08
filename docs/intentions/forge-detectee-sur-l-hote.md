# Intention : détecter la forge d'après l'hôte d'`origin`, pas d'après toute son adresse

**Statut** : à cadrer — notée le 2026-11-08, limite hors cadre du chantier `drwil-serve`. Priorité proposée : P2.

## Besoin

`forgeOf`, dans `packages/drwil/src/guarantees-forge.ts`, teste l'adresse entière d'`origin` : un dépôt nommé `github-miroir`
hébergé sur gitlab.com est pris pour un dépôt GitHub, et les garanties de forge se trompent de cible.

## Existant

`drwil serve` échappe à ce défaut : sa couche forge lit l'hôte (`hostOf`, `packages/drwil/src/serve-forge.ts`). La détection
existe donc deux fois, avec deux comportements. Fichiers à toucher : `packages/drwil/src/guarantees-forge.ts` et ses tests.

## Questions à trancher

- Réutiliser la détection de `drwil serve` ou seulement corriger `forgeOf`.

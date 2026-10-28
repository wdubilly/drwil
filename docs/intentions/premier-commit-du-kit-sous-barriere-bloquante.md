# Intention : la recette d'adoption dit comment commiter le kit sous une barrière de périmètre bloquante

**Statut** : proposée le 2026-10-28 — limite relevée à la clôture de `niveau-de-protection`.

## Besoin

Depuis que l'installation neuve écrit `scopeGate` en `blocking` (QUA-154), le
premier commit du kit en SCOPING est refusé (« fichiers hors fiches commités
en SCOPING »). Un adoptant qui suit la recette d'adoption se heurte à ce refus
sans que la recette le dise ni donne le geste à faire (fiche aux critères
d'acceptation, puis lancement du chantier, ou réglage explicite de la barrière).

## Existant (relevé le 2026-10-28)

- `docs/recipes/adopt-the-kit.md` (étape 7) dit comment durcir la barrière,
  mais pas que le premier commit du kit est refusé tant qu'aucun chantier n'est
  lancé.
- Le banc (`outils/banc.test.mjs`) suit déjà ce parcours : fiche, puis
  `state.mjs start`.

## Questions à trancher

- [décision] Documenter le parcours (fiche d'adoption, puis lancement) dans la
  recette, ou faire de `drwil init` le commit initial du kit, ou laisser la
  barrière en avertissement jusqu'au premier chantier ?

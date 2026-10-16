# Intention : une mise à jour rafraîchit aussi la prose que le projet n'a pas touchée

**Statut** : proposée le 2026-10-17 — limite du chantier « release 0.6.0 »
(journal du 2026-10-17), relevée par l'essai réel de mise à jour
0.5.1 → 0.6.0.

## Besoin

`drwil init` sur un projet déjà équipé ne rafraîchit que les hooks
(`.githooks/`, `.claude/hooks/`). La prose installée — skills, recettes,
`AGENTS.md`, `docs/ia-first.md` — reste dans sa version d'origine, même
quand le projet ne l'a jamais modifiée : elle est seulement listée comme
« dérivée ». Un projet passé de 0.5.1 à 0.6.0 a donc la mécanique de la
file de chantiers et de la consommation, mais sa skill `/drwil-start` ne
connaît pas les files et sa recette de consommation dit la mesure
impossible : un état mélangé, que seul `init --force` corrige, en écrasant
aussi ce que le projet a modifié.

## Existant (vérifié le 2026-10-17, projet d'essai)

- `KIT_MECHANICS` (`packages/drwil/src/config.ts`) : seuls `.githooks/`
  et `.claude/hooks/` sont rafraîchis ; `packages/drwil/src/drift.ts`
  exclut explicitement la prose de `resolve-drift`.
- Le manifeste `.drwil/installed-files.json` (si présent) garde l'empreinte de chaque
  fichier installé, prose comprise : sur l'essai, la recette de
  consommation et la skill `/drwil-start` avaient l'empreinte installée
  (jamais modifiées), la recette modifiée par le client non. Le retrait
  des fichiers obsolètes s'appuie déjà sur ces empreintes (QUA-027, mise à
  jour sûre d'une version à la suivante).
- `doctor` affiche la 0.6.0 comme première version installée : la 0.5.1
  n'enregistrait pas sa version (QUA-025, version du moteur installé
  enregistrée, venu après).
- Signalé dans le changelog 0.6.0 (« Upgrading from 0.5.1 ») ; les
  projets du pilote sont installés à neuf en 0.6.0, non touchés.

## Questions à trancher

- [décision] Rafraîchir toute prose dont l'empreinte n'a pas changé
  (comme les hooks), ou seulement les skills et recettes, en laissant
  `AGENTS.md` et les fichiers que le projet est censé compléter ?
- [décision] Une prose modifiée par le projet et changée par le kit : la
  signaler seulement (comme aujourd'hui), ou proposer le diff dans
  `resolve-drift`, avec sauvegarde `.bak` ?
- [décision] `doctor` : dire « version d'origine inconnue (antérieure à
  0.6.0) » plutôt que « première installation : 0.6.0 » ?

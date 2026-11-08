# Projet : un `init` intelligent traite les fichiers modifiés à la main et remplace `resolve-drift` (2 sur 2)

**Statut** : cadré le 2026-11-08 ; décisions D1 à D10 tranchées le 2026-11-08 par le demandeur, dans `docs/projects/montee-de-version-sure.md`. Démarre après la fusion de ce chantier.
**Risque** : HIGH
**Maturité** : prêt
**Intention** : `docs/intentions/montee-de-version-sure.md`

<!-- scope
files:
  - packages/drwil/src/drift.ts
  - packages/drwil/src/kit-update.ts
  - packages/drwil/src/cli-install.ts
  - packages/drwil/src/cli-texts.ts
  - packages/drwil/src/index.ts
  - packages/drwil/src/config-write.ts
  - packages/drwil/src/doctor.ts
  - packages/drwil/src/doctor-texts.ts
  - packages/drwil/test/kit.test.mjs
  - packages/drwil/test/config-write.test.mjs
  - packages/drwil/test/montee-de-version.test.mjs
  - packages/drwil/CHANGELOG.md
  - packages/drwil/README.md
  - docs/contracts.md
  - docs/architecture.md
  - docs/features.md
  - docs/recipes/adopt-the-kit.md
  - docs/projects/journal.md
  - .drwil/ia-first.json
  - outils/miroirs.json
-->

(Seconde des deux fiches de la montée sûre, 20 chemins. Si l'implémentation montre qu'un autre fichier doit changer,
l'élargissement sera un commit séparé.)

## 1. Besoin

Après la première fiche (refus de version, CI du projet conservé), `init` ne touche toujours pas aux fichiers
modifiés à la main et renvoie vers `resolve-drift`, qui rétrograde et écrase. Cette fiche fait traiter ces fichiers par
`init` lui-même et retire `resolve-drift`.

## 2. Décisions

Celles de `docs/projects/montee-de-version-sure.md` : D4 (fichiers du projet), D5 (clés de configuration), D6
(alertes après coup par `doctor`), D7 (retrait de `resolve-drift`), D8 (état de gouvernance).

## 3. Hors périmètre

- Refus de version, `.bak` et zone du projet du CI : première fiche.
- Premier commit du kit d'une installation neuve (`premier-commit-du-kit-sous-barriere-bloquante`).

## Critères d'acceptation

- `AGENTS.md`, une recette, `docs/intentions/README.md` et le catalogue modifiés par le projet sont identiques après
  `init`, hors ajouts exigés — contrat à créer
- Les clés du projet de `.drwil/ia-first.json` (`checks`, `risk`, `extraCodeGlobs`…) sont conservées ; les clés du kit
  sont à jour, une clé nouvelle a une valeur sûre ; `.drwil/state.json` (si présent) est identique — contrat à créer
- `resolve-drift` n'existe plus (commande, texte, documentation) ; `init` montre un diff et demande confirmation, il ne
  renvoie pas vers lui — contrat à créer
- `doctor` signale après coup ce qu'une montée a supprimé — contrat à créer
- `node .githooks/run-checks.mjs` et `node packages/drwil/bin/drwil.js verify --agent` : `GOVERNANCE: PASS` — `QUA-013`

## 5. Contrats

- **Modifiés** : les contrats qui citent `resolve-drift` (à relever avec `node .githooks/glossary.mjs "resolve-drift"`
  au début du chantier) ; section « Contrats modifiés » à remplir alors, avec validation du demandeur.
- **Créés** : un contrat de fichiers du projet jamais réécrits, chacun avec son contrôle déclaré dans `.drwil/ia-first.json`.

## 6. Increments

- **Lot 1 — fichiers modifiés traités par `init`, retrait de `resolve-drift`** [IA] : diff, noms de ce qui disparaît,
  confirmation ; commande, textes et documentation retirés. Critère de sortie : trois premiers critères.
- **Lot 2 — clés de configuration, `doctor`, documentation, scénario** [IA] : clé nouvelle de
  `.drwil/ia-first.json` (si présent) à valeur sûre, signalement par `doctor`, recette, scénario de la montée
  0.10.0 vers la candidate dans un vrai dépôt. Critère de sortie : critères restants ; `GOVERNANCE: PASS` à la clôture.

## 7. Reprise

- **Dernier état** (2026-11-08) : cadré, rien de réalisé ; attend la fusion de la première fiche.
- **Travail non commité** : aucun propre à cette fiche.
- **Prochaine étape** : après la clôture de la première fiche, relever les contrats à modifier puis `/drwil-start`.

# Projet : Adopter un seuil de couverture de test (catalogue:QUA-004)

**Statut** : cadré le 2026-10-05 — lots 1 et 2 faits, lot 3 restant hors périmètre immédiat.

<!-- cadrage
fichiers:
  - .drwil/ia-first.json
  - docs/contrats.md
  - docs/catalogue-contrats.md
  - packages/drwil/package.json
-->

## 1. Besoin

Le dépôt n'a aujourd'hui aucun contrôle qui empêche la couverture de test de
régresser : pas d'outil câblé en continu, pas de seuil déclaré, le contrat
`catalogue:QUA-004` reste au catalogue (non adopté). Une mesure ponctuelle
(`node --experimental-test-coverage`) a donné, sur `packages/drwil` : 87,03 %
lignes / 64,53 % branches / 54,28 % fonctions.

Objectif : câbler `c8` sur `packages/drwil`, déclarer un contrôle dans
`.drwil/ia-first.json` → `checks`, migrer `catalogue:QUA-004` vers
`docs/contrats.md` avec un seuil réellement vérifié en local et en CI.

## 2. Hors périmètre

- Écrire les tests manquants pour atteindre 100 % dès ce chantier — relève
  de `docs/recettes/refactorer-sans-casser.md` ou d'un chantier dédié,
  lot par lot, une fois le contrôle en place.
- `catalogue:QUA-020` (e2e) : étape suivante une fois ce contrat mûr,
  hors périmètre ici.
- Corriger la citation obsolète de `.githooks/run-checks.sh` dans
  `docs/contrats.md` (QUA-013) et `AGENTS.md` (trouvée en marge, pas
  encore traitée) — signalé, pas corrigé ici, sauf décision contraire.

## 3. Contraintes

- Respecter la recette `docs/recettes/adopter-le-kit.md` : seuil déclaré
  bas d'abord, relevé au fil de l'eau — jamais 100 % d'un coup.
- Le contrôle doit réellement tourner (`node .githooks/run-checks.mjs` et
  CI), pas une promesse de doc (QUA-011, QUA-013).

## 4. Décisions

- 2026-10-05 : seuil de départ réaliste (pas 100 % direct), relevé
  progressivement vers 100 %. [décision utilisateur]
- 2026-10-05 : métrique = lignes + branches + fonctions (les trois, pas
  seulement les lignes). [décision utilisateur]
- 2026-10-05 : outil = `c8` (ajout de dépendance acceptée, pas
  `node --experimental-test-coverage` nu). [décision utilisateur]
- 2026-10-05 : par défaut (proposition acceptée telle quelle) — seuil de
  départ lignes 85 % / branches 60 % / fonctions 50 % ; portée du contrôle
  limitée à `packages/drwil` (code du générateur, pas `.githooks/*.mjs` pour
  ce lot) ; `degradable: false` dès le premier lot, cohérent avec le
  contrôle existant `drwil: build + tests`. [décision utilisateur]

## 5. Points à trancher

(aucun restant — tranchés par défaut le 2026-10-05, voir section 4)

## 6. Lots

- **Lot 1 — Câbler c8 et mesurer** [IA] — fait le 2026-10-05 : `c8` ajouté
  en dépendance dev de `packages/drwil`, script `npm run test:coverage`
  avec seuils 85 % lignes / 60 % branches / 50 % fonctions. Critère de
  sortie : vert (87,58 % / 86,36 % / 91,66 % mesurés).
- **Lot 2 — Déclarer le contrôle et le contrat** [IA] — fait le 2026-10-05 :
  entrée ajoutée dans `.drwil/ia-first.json` → `checks` ; `QUA-004` migré
  du catalogue vers `docs/contrats.md`. Critère de sortie : `node
  .githooks/run-checks.mjs` exécute le contrôle et le passe — vérifié,
  0 erreur.
- **Lot 3 — Relever le seuil vers 100 %** [IA|humain|décision] : gardé en
  chantier ouvert le 2026-10-05, pas de date de reprise fixée. Trois zones
  non couvertes identifiées (mesure du 2026-10-05) :
  - `packages/drwil/src/stack.ts:45-58` — branches de détection de stack
    jamais exercées (Go, Rust, PHP Laravel/Symfony, Ruby/Rails, .NET,
    Flutter). [IA] : ajouter une fixture par techno, sans risque.
  - `packages/drwil/src/index.ts:306-307,398-400` — `purgerDossiersVides`
    (branche `catch` si `readdir` échoue) et `setupGit` (branche "git
    introuvable"). [IA] : faisable, demande de simuler l'absence de git/un
    échec `readdir`, résultat pas garanti sans un peu de bricolage.
  - `packages/drwil/templates/common/optional/creer-une-release/creer-release.mjs:97-145`
    — le vrai chemin d'exécution (`git tag`, `git push`, `gh release
    create`, hors `--dry-run`). [décision] : le tester à 100 % sans
    `--dry-run` exécuterait réellement un tag/push/release — inacceptable
    en test automatisé. Deux options qui s'excluent : mocker
    `execFileSync` (plus de travail, couverture réelle) ou exclure ces
    lignes du calcul avec un commentaire `c8 ignore` justifié (plus rapide,
    mais ce n'est plus un vrai 100 %). Reste à trancher avant tout code sur
    ce point précis.
  Critère de sortie : seuils de `packages/drwil/package.json` →
  `test:coverage` relevés jusqu'à 100 % (ou jusqu'au plafond accepté si le
  dernier point est tranché en exclusion documentée), `node
  .githooks/run-checks.mjs` toujours vert.

## 7. Reprise

- **Dernier état** (2026-10-05) : lots 1 et 2 faits et vérifiés
  (`node .githooks/run-checks.mjs` vert, 0 erreur), PR #19 ouverte et CI
  verte. Lot 3 détaillé (3 zones précises) mais pas commencé — gardé en
  chantier à la demande du demandeur.
- **Travail non commité** : aucun après ce commit.
- **Prochaine étape** : [décision] trancher le traitement du script de
  release (mocker vs exclure documenté, voir lot 3) avant de lancer le
  lot 3 ; les deux autres zones (détection de stack et `setupGit`, voir
  lot 3) peuvent démarrer dès que ce chantier est repris.

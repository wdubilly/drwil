# Chantiers en attente — index

Une ligne par sujet. Le détail et le **statut** vivent dans la fiche liée,
seule source : cet index ne recopie aucun état.

Marqueur obligatoire sur chaque case ouverte : `[IA]` faisable par un agent
dans le dépôt ; `[humain]` geste hors du dépôt ; `[décision]` à trancher par
le demandeur avant tout travail. Un agent ne tente pas un geste `[humain]` et
ne tranche pas une `[décision]` : il la pose.

Priorité facultative, non vérifiée par check-docs.mjs (simple convention) :
`[P0]` le plus urgent, `[P1]` élevée, `[P2]` normale, `[P3]` le moins urgent.
Sans tag, un sujet est considéré `[P2]`.

Un chantier dont la fiche est **entièrement** terminée (pas un simple point
parmi d'autres) est condensé dans `docs/projets/journal.md` puis retiré de
cet index, pas coché : voir `docs/recettes/travailler-en-branche.md`,
section « Clôturer ». Les lignes cochées restantes concernent des points
déjà faits d'une fiche qui reste ouverte par ailleurs.

## Objectif

Décidé par le demandeur le 2026-10-11 : une **fabrique autonome de
logiciels de qualité**, aux standards de l'industrie, qui **baisse la
consommation de tokens**, et dont les exigences s'adaptent au **risque du
produit** (une page HTML n'a pas les contraintes d'un logiciel bancaire).
Chaque vague y contribue :

| Vague | Rôle vers l'objectif |
|---|---|
| 1 — hygiène et preuves | des contrôles fiables (fait) |
| 2 — décisions prouvables | des filets avant de bouger le code |
| 3 — mesurer | savoir ce que drwil apporte et coûte, en tokens et en qualité |
| 4 — restructurations | un code et un cycle plus simples, décidés sur les chiffres |
| 5 — catalogue et profils | les contrats et leurs contrôles, choisis par profil de risque |
| 6 — le produit | publier |
| ensuite | la fabrique autonome, graduée par le risque, sur les chiffres du banc |

## Ordre de réalisation (2026-10-11)

Décidé par le demandeur le 2026-10-11, revu le même jour (**mesurer avant
de construire** : vague 3 insérée, les suivantes renumérotées). Principe :
**petits filets d'abord, mesure ensuite, restructurations après,
publication en dernier** ; tout ce qui casse une compatibilité (noms,
formats, sorties) passe **avant** la publication npm, quand il ne coûte
encore aucune migration aux utilisateurs. Les priorités suivent les vagues
(vague 1 : P0 ; vagues 2 à 4 : P1 ; vagues 5 et 6 : P2 ; ensuite : P3),
pour que `/drwil-lancer` propose les chantiers dans cet ordre. Chaque ligne
cite les contrats candidats `v1:` qu'elle rend réels
(`docs/intentions/catalogue-cycle-de-vie.md`, annexe). Un refactoring suit
`docs/recettes/refactorer-sans-casser.md` : tests de caractérisation
d'abord, d'où les seuils de couverture (vague 2) avant le refactoring de
`packages/drwil/src/index.ts` (vague 4).

## Vague 1 — hygiène et preuves : terminée le 2026-10-11

Faite dans l'ordre : la règle `git -c` recalibrée, SEC-006 outillé, la
carte du dépôt, la consigne de fusion automatique, lint, formatage et
versions de Node (voir `docs/projets/journal.md`). Le README est reporté
après la vague 6.

## Vague 2 — rendre les décisions humaines prouvables, relever les preuves

Séance de décision tenue le 2026-10-11 : non-régression et couverture
tranchées. Fait : couverture du paquet relevée au réel avec cliquet (lot 3a
de `docs/projets/adopter-seuil-couverture.md`) ; non-régression continue ;
CLI testée depuis le tarball ; gitleaks en CI (journal, 2026-10-11).

Reporté par le demandeur le 2026-10-11 : la protection de master.

- [ ] [humain] [P1] Protéger master : approbation humaine exigée sur les
  PR (aujourd'hui 0) et compte machine de l'agent (lot 3) (v1:GIT-004,
  v1:COD-010, v1:HOOK-014) — `docs/projets/proteger-master.md`.

## Vague 3 — mesurer avant de construire

- [ ] [décision] [P1] Mesurer la consommation de tokens par chantier, sans
  saisie (journaux de session, une branche par chantier) —
  `docs/projets/mesurer-consommation.md`.
- [ ] [décision] [P1] Mini-banc avec / sans drwil : 2 tâches, 3
  répétitions, juge indépendant, tokens mesurés —
  `docs/projets/mini-banc.md`.

## Vague 4 — restructurations, protégées par les filets, décidées sur les chiffres

- [ ] [décision] [P1] Supprimer la duplication dépôt / gabarit (le dépôt
  s'installe lui-même, ou hooks générés au build) ; le contrôle
  `miroirs-gabarit` sert de filet pendant la bascule (v1:INI-003,
  v1:INI-005) — voir `docs/projets/journal.md` (2026-10-11).
- [ ] [décision] [P1] Refactoriser `packages/drwil/src/index.ts`
  (724 lignes) et `.githooks/etat.mjs` (533 lignes) selon la recette ;
  adopter le garde-fou de taille livré (`catalogue:QUA-001`) —
  `docs/recettes/refactorer-sans-casser.md`.
- [ ] [décision] [P1] Fluidité sans perte de rigueur, dont qui décide
  chaque transition (agent ou humain), déclaré et affiché (v1:CTR-015,
  v1:GOV-002) — `docs/intentions/fluidite-sans-perte-de-rigueur.md`.
- [ ] [décision] [P1] Vue de relecture : montrer à l'humain ce qui demande
  son jugement dans une PR (décisions, cadrage, règles, preuves,
  exceptions) — `docs/intentions/vue-de-relecture.md`.
- [ ] [décision] [P2] Petite correction sous barrière bloquante : voie
  légère décidée, modalités à définir — `docs/projets/entretien-sous-barriere-bloquante.md`.

## Vague 5 — catalogue et profils : ce qui casse une compatibilité, avant toute publication

- [ ] [décision] [P2] Trancher les questions du catalogue (statuts,
  sévérité et applicabilité, porte avant publication, registre client,
  collisions d'ID, doublons), puis format : JSON canonique, schéma
  versionné, Markdown généré (v1:CTR-003, v1:CTR-010, v1:CTR-012) —
  `docs/intentions/catalogue-cycle-de-vie.md`.
- [ ] [décision] [P2] Profils par risque du produit (LÉGER, standard,
  renforcé ; DOGFOODING à part) : contrats applicables et sévérité
  choisis par profil (v1:CTR-014, v1:HOOK-006) — question 9 de
  `docs/intentions/catalogue-cycle-de-vie.md`.
- [ ] [décision] [P2] Livrable entièrement en anglais (gabarit, CLI, hooks,
  noms d'activités, configuration) — `docs/intentions/livrable-full-english.md`.
- [ ] [IA] [P2] Retirer l'identifiant interne `DRWIL-012` des deux messages
  livrés qui l'affichent (change une sortie) — voir
  `docs/projets/journal.md` (2026-10-11).

## Vague 6 — le produit

- [ ] [décision] [P2] Publication npm du kit, avec une porte avant
  `npm publish` (v1:HOOK-013, v1:REL-006, v1:PKG-010) —
  `docs/intentions/packager-kit-ia-first.md`.
- [ ] [humain] [P2] drwil V0.2 — gouvernance exécutable : lots [IA]
  fusionnés (PR #34 du dépôt archivé) ; restent le benchmark (DRWIL-022,
  humain) et la publication (DRWIL-030, décision, voir ligne précédente) —
  `docs/projets/drwil-v0-2-gouvernance-executable.md`.
- [ ] [décision] [P2] Protection de la forge dans le livrable (ruleset,
  CODEOWNERS, vérification en CI, diagnostic, identité de l'agent guidée) —
  `docs/intentions/forge-dans-le-livrable.md`.
- [ ] [IA] [P2] Prochaine release : signaler dans la note de version que
  `chemins` (`.drwil/ia-first.json` → `checks`) décide désormais aussi de ce
  qui tourne au commit — voir `docs/projets/journal.md` (2026-10-05).

## Après la vague 6

Décidé le 2026-10-11 : le README décrit le cycle de gouvernance, que les
vagues 4 à 6 modifient ; l'écrire avant serait le réécrire.

- [ ] [IA] [P3] README à jour du cycle de gouvernance (lancement,
  fusion autorisée, forge) (v1:DOC-001, v1:DOC-003) — `docs/projets/readme-a-jour.md`.

## Ensuite

- [ ] [décision] [P3] Couverture du paquet à 100 % (lot 3b, à la demande) :
  trancher le script de release (mocker ou exclure) et mesurer aussi les
  fichiers jamais importés (`--all`) —
  `docs/projets/adopter-seuil-couverture.md`.
- [ ] [décision] [P3] Banc complet avec / sans drwil (5 tâches), décidé
  sur les chiffres du mini-banc — `docs/intentions/bench-avec-sans-drwil.md`.
- [ ] [décision] [P3] Community Ready : fichiers et parcours pour qu'un
  contributeur externe puisse participer sans demander au mainteneur ;
  questions à trancher (langue, gabarit de PR, canal sécurité, contrats
  COM) — `docs/intentions/community-ready.md`.
- [ ] [décision] [P3] Fabrique autonome graduée par le risque (forge,
  outillage, mutation, rôles séparés, auto-fusion LOW), cadrée sur les
  chiffres de la vague 3 —
  `docs/intentions/fabrique-autonome.md`.
- [ ] [humain] [P3] Vérifier que Cursor et Copilot lisent les fichiers de renvoi —
  `docs/projets/suites-kit-portable.md` (point 2).
- [ ] [décision] [P3] V3 — investigation & reporting par agent : DRWIL
  gouverne-t-il le travail d'agents au-delà du code ? Expérimentation après
  stabilisation du cœur, sans code pour l'instant —
  `docs/projets/v3-investigation-reporting-agent.md`.
- [ ] [décision] [P3] Importer un ticket externe (Jira ou autre) pour en
  dériver une fiche d'intention/cadrage, plutôt que de tout retaper à la
  main — outil cible, mode d'authentification et ponctuel vs continu
  restent à trancher — `docs/intentions/importer-tickets-externes.md`.
- [ ] [décision] [P3] CI : matrice Windows et macOS sur les pull requests
  seulement (jobs divisés par deux) — `docs/projets/ci-matrice-sur-pr.md`.

## Points déjà faits d'une fiche encore ouverte

- [x] [IA] Aucun `.gitignore` dans les modèles du kit —
  `docs/projets/suites-kit-portable.md` (point 9).
- [x] [IA] Contrôles du dépôt drwil lui-même — fait le 2026-10-04 —
  `docs/projets/suites-kit-portable.md` (point 5).
- [x] [IA] check-docs.mjs : faux positifs et écarts relevés dans drwil —
  corrigé le 2026-10-04 (lot 2 de l'extraction) —
  `docs/projets/suites-kit-portable.md` (point 8).
- [x] [IA] [P2] Tester le kit sous Windows et macOS — matrice CI ajoutée
  le 2026-10-04, verte sur les 3 OS (run CI `37238852012`) —
  `docs/projets/suites-kit-portable.md` (point 1).
- [x] [IA] [P3] Supprimer à l'`init` les fichiers obsolètes d'une ancienne version
  du kit — fait le 2026-10-05 —
  `docs/projets/suites-kit-portable.md` (point 3).

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

## Ordre de réalisation (2026-10-11)

Décidé par le demandeur le 2026-10-11. Principe : **petits filets d'abord,
restructurations ensuite, publication en dernier** ; tout ce qui casse une
compatibilité (noms, formats, sorties) passe **avant** la publication npm,
quand il ne coûte encore aucune migration aux utilisateurs. Les priorités
suivent les vagues (vague 1 : P0 ; vagues 2 et 3 : P1 ; vagues 4 et 5 :
P2 ; ensuite : P3), pour que `/drwil-lancer` propose les chantiers dans cet
ordre. Chaque ligne cite les contrats candidats `v1:` qu'elle rend réels
(`docs/intentions/catalogue-cycle-de-vie.md`, annexe). Un refactoring suit
`docs/recettes/refactorer-sans-casser.md` : tests de caractérisation
d'abord, d'où les seuils de couverture (vague 2) avant le refactoring de
`packages/drwil/src/index.ts` (vague 3).

## Vague 1 — hygiène et preuves (petits chantiers, risque faible)

Ordre interne, dans l'ordre des lignes ci-dessous (décidé le 2026-10-11 ;
à priorité égale, `/drwil-lancer` trie par nom de fichier : l'agent
recommande la première fiche prête de cette liste). La règle `git -c`,
première de la vague, est faite (voir `docs/projets/journal.md`).

- [ ] [IA] [P0] Outiller SEC-006 : `npm audit` dans les contrôles déclarés,
  pour qu'une signature devienne une preuve (v1:SEC-008) —
  `docs/projets/outiller-sec-006.md`.
- [ ] [IA] [P0] README à jour du cycle de gouvernance (lancement,
  fusion autorisée, forge) (v1:DOC-001, v1:DOC-003) — `docs/projets/readme-a-jour.md`.
- [ ] [IA] [P0] Personnaliser `docs/architecture.md` du dépôt, resté au
  modèle d'installation (v1:DOC-005, v1:ARC-001) — relevé dans
  `docs/projets/journal.md` (2026-10-11).
- [ ] [IA] [P0] Programmer la fusion automatique avant de revenir en
  CADRAGE (ordre sûr dans la consigne) ; vérifier d'abord ce qui est déjà
  fait — `docs/projets/consigne-fusion-auto.md`.
- [ ] [IA] [P0] Lint, formateur et versions de Node déclarées (`engines`)
  pour le paquet (v1:COD-002, v1:COD-003, v1:PKG-001) — classés
  automatisables dans `docs/intentions/catalogue-cycle-de-vie.md`.

## Vague 2 — rendre les décisions humaines prouvables, relever les preuves

- [ ] [humain] [P1] Protéger master : approbation humaine exigée sur les
  PR (aujourd'hui 0) et compte machine de l'agent (lot 3) (v1:GIT-004,
  v1:COD-010, v1:HOOK-014) — `docs/projets/proteger-master.md`.
- [ ] [décision] [P1] Couverture du paquet : lot 3 de la fiche (cible
  100 %, ouvert à la demande) ; au minimum relever les seuils vers les
  chiffres réels, avec cliquet (v1:TST-005) ; préalable au refactoring de
  `packages/drwil/src/index.ts` — `docs/projets/adopter-seuil-couverture.md`.
- [ ] [décision] [P1] Non-régression continue : règle « défaut corrigé →
  test rattaché à un contrat », traçabilité dans `verify` (v1:TST-004) —
  `docs/intentions/non-regression-continue.md`.
- [ ] [IA] [P1] Tester la CLI installée depuis le tarball, comme un
  utilisateur (v1:PKG-005, v1:PKG-004) — classé automatisable dans
  `docs/intentions/catalogue-cycle-de-vie.md`.

## Vague 3 — restructurations, protégées par les filets

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

## Vague 4 — ce qui casse une compatibilité, avant toute publication

- [ ] [décision] [P2] Trancher les questions du catalogue (statuts,
  sévérité et applicabilité, porte avant publication, registre client,
  collisions d'ID, doublons), puis format : JSON canonique, schéma
  versionné, Markdown généré (v1:CTR-003, v1:CTR-010, v1:CTR-012) —
  `docs/intentions/catalogue-cycle-de-vie.md`.
- [ ] [décision] [P2] Livrable entièrement en anglais (gabarit, CLI, hooks,
  noms d'activités, configuration) — `docs/intentions/livrable-full-english.md`.
- [ ] [IA] [P2] Retirer l'identifiant interne `DRWIL-012` des deux messages
  livrés qui l'affichent (change une sortie) — voir
  `docs/projets/journal.md` (2026-10-11).

## Vague 5 — le produit

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

## Ensuite

- [ ] [décision] [P3] Bench avec / sans drwil : même consigne, même projet,
  pour mesurer l'apport en qualité de livrable et en consommation de
  tokens — `docs/intentions/bench-avec-sans-drwil.md`.
- [ ] [décision] [P3] Community Ready : fichiers et parcours pour qu'un
  contributeur externe puisse participer sans demander au mainteneur ;
  questions à trancher (langue, gabarit de PR, canal sécurité, contrats
  COM) — `docs/intentions/community-ready.md`.
- [ ] [décision] [P3] Fabrique autonome graduée par le risque (forge,
  outillage, mutation, rôles séparés, auto-fusion LOW) —
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

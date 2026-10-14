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
parmi d'autres) est condensé dans `docs/projects/journal.md` puis retiré de
cet index, pas coché : voir `docs/recipes/working-with-branches.md`,
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
| 3 — mesurer | savoir ce que coûte chaque chantier en tokens (fait) |
| 4 — restructurations | un code et un cycle plus simples, un seul gabarit en anglais |
| 5 — catalogue et profils | les contrats et leurs contrôles, choisis par profil de risque |
| 6 — la fabrique | mini-banc avec / sans drwil, puis pilote autonome dans ce dépôt, gradué par le risque |
| 7 — le produit | publier, quand tout est opérationnel |

## Ordre de réalisation (2026-10-11)

Décidé par le demandeur le 2026-10-11, revu le même jour : **mesurer avant
de construire** (vague 3 insérée, les suivantes renumérotées), puis **la
fabrique avant la publication**, repoussée en dernier, quand tout est
opérationnel. Principe : **petits filets d'abord, mesure ensuite,
restructurations après, publication en dernier** ; tout ce qui casse une compatibilité (noms,
formats, sorties) passe **avant** la publication npm, quand il ne coûte
encore aucune migration aux utilisateurs. Les priorités suivent les vagues
(vague 1 : P0 ; vagues 2 à 4 : P1 ; vagues 5 à 7 : P2 ; ensuite : P3),
pour que `/drwil-lancer` propose les chantiers dans cet ordre. Chaque ligne
cite les contrats candidats `v1:` qu'elle rend réels
(`docs/intentions/catalogue-cycle-de-vie.md`, annexe). Un refactoring suit
`docs/recipes/refactor-without-breaking.md` : tests de caractérisation
d'abord, d'où les seuils de couverture (vague 2) avant le refactoring de
`packages/drwil/src/index.ts` (vague 4).

Revu par le demandeur le 2026-10-13 : le **catalogue** (vague 5) passe
avant le reste de la vague 4, parce que ses décisions sont fraîches, que son
format casse une compatibilité et qu'il ne touche pas le même code que la
relecture et la fluidité. Revu de nouveau le 2026-10-13 par le demandeur :
`init` sur un projet existant passe en tête, en `[P0]`, à lancer dès que
possible et à publier par une release dès sa clôture, parce qu'il casse
aujourd'hui l'adoption de drwil sur tout projet déjà outillé. Ordre de
réalisation :

1. Fait le 2026-10-13 : `init` sur un projet existant, puis release 0.5.1
   (journal du 2026-10-13).
2. Fait le 2026-10-13 : protéger master (journal du 2026-10-13).
3. Sécuriser le moteur (feuille de route du 2026-10-14, phase 1, `[P0]`),
   décidé en tête par le demandeur le 2026-10-14, avant le catalogue.
4. Preuves de bout en bout (phase 2), puis fiabiliser le package (phase 3).
5. Catalogue, fiche 1 : format.
6. Catalogue, fiche 2 : profils.
7. Catalogue, fiche 3 : adoption ciblée.
8. Relecture avant fusion et vue de relecture, cadrées ensemble (même
   sondage, même état, appuyées sur master protégé).
9. Fluidité sans perte de rigueur (touche aussi les transitions et le
   sondage : après le 8 pour ne pas le refaire).
10. Petite correction sous barrière bloquante.
11. Consommation écrite à la clôture (attend des chiffres fiables, que les
    chantiers 5 à 7 fourniront).
12. Vague 6, la fabrique.
13. Vague 7, le produit, dont la validation commerciale.

Les trois fiches du catalogue passent en `[P1]` pour que `/drwil-start`
les propose dans cet ordre.

## Vague 1 — hygiène et preuves : terminée le 2026-10-11

Faite dans l'ordre : la règle `git -c` recalibrée, SEC-006 outillé, la
carte du dépôt, la consigne de fusion automatique, lint, formatage et
versions de Node (voir `docs/projects/journal.md`). Le README a été
repris le 2026-10-12.

## Vague 2 — rendre les décisions humaines prouvables, relever les preuves

Ajoutés le 2026-10-14 (feuille de route du demandeur, phases 1 à 3) :

- [x] [IA] [P0] Sécuriser le moteur : chemins de désinstallation, tests
  négatifs, contrôles non exécutés, barrière de périmètre — fait le
  2026-10-14 (voir `docs/projects/journal.md`).
- [x] [IA] [P0] Gitleaks dans les tests du kit en CI — fait le 2026-10-14
  (voir `docs/projects/journal.md`).
- [x] [IA] [P1] Analyse statique du code en CI (CodeQL) — fait le
  2026-10-14 (voir `docs/projects/journal.md`).
- [x] [IA] [P1] Preuves de bout en bout : cycle complet, sept activités,
  verdicts, attestations, contournements — fait le 2026-10-15
  (voir `docs/projects/journal.md`).
- [ ] [IA] [P1] Critères d'acceptation prouvés avant la clôture (preuves
  liées à la fiche, évaluées par l'outil) —
  `docs/projects/criteres-acceptation-preuves.md`.
- [ ] [IA] [P1] Fiabiliser le package : `.drwil/install.json` (si présent), tests de
  mise à jour — `docs/projects/fiabiliser-le-package.md`.

Séance de décision tenue le 2026-10-11 : non-régression et couverture
tranchées. Fait : couverture du paquet relevée au réel avec cliquet (lot 3a
de `docs/projects/adopter-seuil-couverture.md`) ; non-régression continue ;
CLI testée depuis le tarball ; gitleaks en CI (journal, 2026-10-11).

Fait le 2026-10-13 : la protection de master (compte machine de
l'agent, revue des code owners ; journal du 2026-10-13).

## Vague 3 — mesurer avant de construire

Fait : consommation de tokens par chantier, lue dans les journaux de
session (`node outils/consommation.mjs`, journal du 2026-10-11).

- [ ] [décision] [P1] Écrire automatiquement la consommation d'un chantier
  à sa clôture (lot 2 de la mesure), une fois les chiffres jugés fiables —
  voir `docs/projects/journal.md` (2026-10-11).

## Vague 4 — restructurations, protégées par les filets, décidées sur les chiffres

Ordre décidé le 2026-10-12 (demandeur) : duplication, puis refactor, puis
anglais (chantiers B, A, C, `DRWIL-012` avec C), puis fluidité et voie légère, puis vue de
relecture. Inséré en tête le 2026-10-12 (demandeur) : le correctif
d'`init` et `apply`, avant le refactor qui touche le même code.

Fait : duplication dépôt / gabarit supprimée, le dépôt s'installe depuis
son gabarit (`npm run installer-depot`) ; `init` et `apply` gardent les
réglages d'un projet déjà installé (v1:INI-005, v1:INI-010) ; index.ts,
etat.mjs et verify.ts découpés, plafond de 400 lignes adopté (QUA-001) ;
livrable en anglais, chantiers B et A : un seul gabarit, en anglais,
`lang` devient la langue du projet ; cœur (hooks, état, config, bloc,
trailer, code commun) en anglais, migration des projets équipés par
`init` / `apply`, version 0.4.0 — journal du 2026-10-12.
- [ ] [décision] [P1] Fluidité sans perte de rigueur : restent le
  regroupement (PR, attestations) et qui décide chaque transition (agent ou
  humain), déclaré et affiché (v1:CTR-015, v1:GOV-002) —
  `docs/intentions/fluidite-sans-perte-de-rigueur.md`.
- [ ] [décision] [P1] Vue de relecture : montrer à l'humain ce qui demande
  son jugement dans une PR (décisions, cadrage, règles, preuves,
  exceptions) — `docs/intentions/vue-de-relecture.md`.
- [ ] [décision] [P1] Relecture avant fusion, choisie au lancement : une
  question de plus dans le sondage (`drwil-review` : aucune, relecture par
  un agent, relecture humaine), indépendante de la fusion automatique ou
  manuelle ; combinaison fusion automatique + relecture humaine refusée ;
  touche le sondage, l'état local, la recette de clôture et le gabarit — à
  cadrer avec la vue de relecture (`docs/intentions/vue-de-relecture.md`)
  et la protection de master.
- [ ] [décision] [P2] Petite correction sous barrière bloquante : voie
  légère décidée, modalités à définir — `docs/projects/entretien-sous-barriere-bloquante.md`.

## Vague 5 — catalogue et profils (ce qui casse une compatibilité)

Questions du catalogue tranchées le 2026-10-13 (porte avant publication
reportée à la vague 7) ; reste à valider l'intention et à écrire le
critère de sortie de chaque fiche —
`docs/intentions/catalogue-cycle-de-vie.md`.

- [ ] [décision] [P1] Format du catalogue : JSON canonique, schéma
  versionné, statuts (+ NOT_APPLICABLE), sévérités BLOQUANT / MAJEUR /
  MINEUR avec échéance, mode de contrôle, Markdown généré, une quinzaine
  de contrats déjà tenus (v1:CTR-003, v1:CTR-010, v1:CTR-012) — fiche 1.
- [ ] [décision] [P1] Profils par risque du produit (LÉGER, STANDARD,
  RENFORCÉ, CRITIQUE ; DOGFOODING cumulable) : contrats applicables et
  sévérité choisis par profil (v1:CTR-014, v1:HOOK-006) — fiche 2.
- [ ] [décision] [P1] Adoption ciblée : détection et questions à `init`,
  liste classée, `drwil contracts add <ID>` — fiche 3.

## Vague 6 — la fabrique, en pilote dans ce dépôt

Prérequis : la protection de master (vague 2), reportée le 2026-10-11 :
aucune fusion autonome sans elle. Le mini-banc y a été déplacé le
2026-10-12 (demandeur) : il mesure le drwil restructuré qui fera tourner la
fabrique, et c'est la décision de la fabrique qui a besoin de ses chiffres.

- [ ] [IA] [P2] Mini-banc avec / sans drwil, en CI à la demande : 2
  tâches, 3 répétitions, juge indépendant, tokens mesurés —
  `docs/projects/mini-banc.md`.
- [ ] [décision] [P2] Fabrique autonome graduée par le risque (outillage,
  mutation, rôles séparés, une session par fiche, auto-fusion LOW),
  cadrée sur les chiffres du mini-banc et de la consommation —
  `docs/intentions/fabrique-autonome.md`.

## Vague 7 — le produit, quand tout est opérationnel

- [ ] [décision] [P2] Publication npm du kit, avec une porte avant
  `npm publish` (v1:HOOK-013, v1:REL-006, v1:PKG-010) ; tranche aussi la
  question 3 du catalogue, reportée ici le 2026-10-13 —
  `docs/intentions/packager-kit-ia-first.md`.
- [ ] [humain] [P2] drwil V0.2 — gouvernance exécutable : lots [IA]
  fusionnés (PR #34 du dépôt archivé) ; restent le benchmark (DRWIL-022,
  humain) et la publication (DRWIL-030, décision, voir ligne précédente) —
  `docs/projects/drwil-v0-2-gouvernance-executable.md`.
- [ ] [décision] [P2] Protection de la forge dans le livrable (ruleset,
  CODEOWNERS, vérification en CI, diagnostic, identité de l'agent guidée) —
  `docs/intentions/forge-dans-le-livrable.md`.
- [ ] [décision] [P2] Validation commerciale : des équipes veulent-elles
  utiliser et payer DRWIL ? — `docs/intentions/validation-commerciale.md`.
- [ ] [IA] [P2] Prochaine release : signaler dans la note de version que
  `paths` (`.drwil/ia-first.json` → `checks`) décide désormais aussi de ce
  qui tourne au commit — voir `docs/projects/journal.md` (2026-10-05).

## Ensuite

- [ ] [décision] [P3] Couverture du paquet à 100 % (lot 3b, à la demande) :
  trancher le script de release (mocker ou exclure) et mesurer aussi les
  fichiers jamais importés (`--all`) —
  `docs/projects/adopter-seuil-couverture.md`.
- [ ] [décision] [P3] Banc complet avec / sans drwil (5 tâches), décidé
  sur les chiffres du mini-banc — `docs/intentions/bench-avec-sans-drwil.md`.
- [ ] [décision] [P3] Community Ready : fichiers et parcours pour qu'un
  contributeur externe puisse participer sans demander au mainteneur ;
  questions à trancher (langue, gabarit de PR, canal sécurité, contrats
  COM) — `docs/intentions/community-ready.md`.
- [ ] [humain] [P3] Vérifier que Cursor et Copilot lisent les fichiers de renvoi —
  `docs/projects/suites-kit-portable.md` (point 2).
- [ ] [décision] [P3] V3 — investigation & reporting par agent : DRWIL
  gouverne-t-il le travail d'agents au-delà du code ? Expérimentation après
  stabilisation du cœur, sans code pour l'instant —
  `docs/projects/v3-investigation-reporting-agent.md`.
- [ ] [décision] [P3] Importer un ticket externe (Jira ou autre) pour en
  dériver une fiche d'intention/cadrage, plutôt que de tout retaper à la
  main — outil cible, mode d'authentification et ponctuel vs continu
  restent à trancher — `docs/intentions/importer-tickets-externes.md`.
- [ ] [décision] [P3] CI : matrice Windows et macOS sur les pull requests
  seulement (jobs divisés par deux) — `docs/projects/ci-matrice-sur-pr.md`.

## Points déjà faits d'une fiche encore ouverte

- [x] [IA] Aucun `.gitignore` dans les modèles du kit —
  `docs/projects/suites-kit-portable.md` (point 9).
- [x] [IA] Contrôles du dépôt drwil lui-même — fait le 2026-10-04 —
  `docs/projects/suites-kit-portable.md` (point 5).
- [x] [IA] check-docs.mjs : faux positifs et écarts relevés dans drwil —
  corrigé le 2026-10-04 (lot 2 de l'extraction) —
  `docs/projects/suites-kit-portable.md` (point 8).
- [x] [IA] [P2] Tester le kit sous Windows et macOS — matrice CI ajoutée
  le 2026-10-04, verte sur les 3 OS (run CI `37238852012`) —
  `docs/projects/suites-kit-portable.md` (point 1).
- [x] [IA] [P3] Supprimer à l'`init` les fichiers obsolètes d'une ancienne version
  du kit — fait le 2026-10-05 —
  `docs/projects/suites-kit-portable.md` (point 3).

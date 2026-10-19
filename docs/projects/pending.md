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
3. Fait le 2026-10-14 : sécuriser le moteur (feuille de route du
   2026-10-14, phase 1 ; vague 2 ci-dessous).
4. Fait le 2026-10-15 : preuves de bout en bout (phase 2), puis fiabiliser
   le package (phase 3) ; vague 2 ci-dessous.
5. Catalogue, fiche 1 : format.
6. Catalogue, fiche 2 : profils.
7. Catalogue, fiche 3 : adoption ciblée.
8. Relecture avant fusion et vue de relecture, cadrées ensemble (même
   sondage, même état, appuyées sur master protégé).
9. Fluidité sans perte de rigueur (touche aussi les transitions et le
   sondage : après le 8 pour ne pas le refaire).
10. Petite correction sous barrière bloquante.
11. Consommation écrite à la clôture : faite le 2026-10-16, avancée pour
    le pilote de la 0.6.0 (journal du 2026-10-16).
12. Vague 6, la fabrique.
13. Vague 7, le produit, dont la validation commerciale.

Revu le 2026-10-17 par le demandeur, après le premier pilote
(`drwil_com`) et une découverte de valeur : les retours du pilote passent
avant les points 5 à 13, en trois versions.

- **0.6.2** — débloquer le pilote : premier essai propre (installation par
  l'URL de la release, premier `verify` sans CI expliqué ; fait, journal du
  2026-10-17) et le sondage de lancement dans tous les cas (un seul brief,
  hook jamais muet ; fait, journal du 2026-10-17), lancés en file ;
  publiée le 2026-10-17 (tag `v0.6.2`).
- **0.6.3** — des mises à jour qui servent, des réponses lisibles : en
  tête, un identifiant sans libellé rattrapé (fait, journal du
  2026-10-17 ; affichage vérifié dans le terminal le même jour) et la mise à
  jour qui rafraîchit la prose non modifiée (fait, journal du
  2026-10-17) ; puis la barrière qui
  laisse passer les documents de cadrage (fait, journal du 2026-10-17),
  la racine des
  hooks (fait, journal du 2026-10-17), `npm init -y`
  (fait, journal du 2026-10-17) et un guide de
  démarrage réduit (`docs/intentions/guide-de-demarrage.md`). Les six
  sont cadrées le 2026-10-17 (une fiche chacune, lignes de l'index
  ci-dessous) ; publiée le 2026-10-18 (tag `v0.6.3`).
- **0.6.4** — décidé le 2026-10-18 par le demandeur : en tête, une CI
  plus rapide (Windows et macOS testés seulement quand une PR touche du
  code ; fait, journal du 2026-10-18) ; puis la file de chantiers
  menée par sous-agents (fait, journal du 2026-10-18) ; ajouté le
  2026-10-18 par le demandeur avant la release : un workflow CI au YAML
  invalide refusé au commit (fait, journal du 2026-10-18) ;
  enfin la release (fait, journal du 2026-10-18 ; tag `v0.6.4` après la
  fusion, sur feu vert).
- **0.6.5** — décidé le 2026-10-18 par le demandeur : une clôture
  allégée, cadrée d'un seul tenant puis réalisée en quatre PR, dans cet
  ordre : date gardée et feu vert de publication
  (fait, journal du 2026-10-18), ordre de la file
  (fait, journal du 2026-10-18), clôture outillée
  (fait, journal du 2026-10-18), détour pour une correction
  intercalée (fait, journal du 2026-10-18) ; puis, dans une PR séparée, la
  fiche de recette pour une équipe hors dépôt
  (fait, journal du 2026-10-19), avant la release.
- **0.6.5 publiée** le 2026-10-19 par le parcours de recette (candidate
  `v0.6.5-rc.1` approuvée, promue en `v0.6.5`).
- **0.6.6** — la stabilisation, décidée le 2026-10-19 par le demandeur :
  les points bloquants et critiques d'abord, dans cet ordre : un push
  depuis un worktree ne touche jamais le vrai dépôt
  (fait, journal du 2026-10-19), les branches fusionnées par squash
  (fait, journal du 2026-10-19), un contrat ajouté pendant un détour
  (fait, journal du 2026-10-19), une fiche de recette juste
  (fait, journal du 2026-10-19) ; puis la release (version posée,
  journal du 2026-10-19 ; candidate, verdict et promotion après la fusion).
- **0.6.7** — la compatibilité, décidée le 2026-10-18 par le demandeur,
  renumérotée le 2026-10-19 (après la stabilisation) : chaque agent de code tenu par la même gouvernance
  (`docs/intentions/compatibilite-des-outils.md`), dans cet ordre : le
  socle (fait, journal du 2026-10-19), Copilot CLI
  (fait, journal du 2026-10-19), Gemini CLI
  (fait, journal du 2026-10-19), Codex
  (`docs/intentions/compat-codex.md`), Cursor
  (`docs/intentions/compat-cursor.md`), ces deux derniers repassés en
  intention le 2026-10-19 (demande de l'humain).
- **Pendant la 0.6.3** : trancher les questions de l'attestation liée à
  son objet, pour que sa fiche technique soit prête à la sortie.
- **0.7.0** — la preuve qui dure : attestation liée à son objet
  (`docs/intentions/attestation-liee-a-son-objet.md`), critères et
  preuves durables (`docs/intentions/criteres-et-preuves-durables.md`),
  barrière de fusion vérifiée (`docs/intentions/forge-dans-le-livrable.md`).

Valeur et effort sont des estimations de l'agent, tirées du code et d'un
seul pilote.

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
- [x] [IA] [P1] Une documentation à jour pour la 0.6.0, et qui le reste
  — fait le 2026-10-16 (voir `docs/projects/journal.md`).

Séance de décision tenue le 2026-10-11 : non-régression et couverture
tranchées. Fait : couverture du paquet relevée au réel avec cliquet (lot 3a
de `docs/projects/adopter-seuil-couverture.md`) ; non-régression continue ;
CLI testée depuis le tarball ; gitleaks en CI (journal, 2026-10-11).

Fait le 2026-10-13 : la protection de master (compte machine de
l'agent, revue des code owners ; journal du 2026-10-13).

## Vague 3 — mesurer avant de construire

Fait : consommation de tokens par chantier, lue dans les journaux de
session (`node .githooks/consumption.mjs`, journal du 2026-10-11) ; livrée
à tout projet et consignée à la clôture (QUA-042, journal du 2026-10-16).

- [ ] [décision] La consommation de tokens mesurée aussi pour les autres
  outils IA (Copilot CLI, Cursor, Codex, Gemini) —
  `docs/intentions/consommation-autres-outils.md`.

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
- [ ] [décision] [P2] Protection de la forge dans le livrable (ruleset,
  CODEOWNERS, vérification en CI, diagnostic, identité de l'agent guidée) —
  `docs/intentions/forge-dans-le-livrable.md`.
- [ ] [décision] [P2] Validation commerciale : des équipes veulent-elles
  utiliser et payer DRWIL ? — `docs/intentions/validation-commerciale.md`.

## Retours d'expérience (intentions à recadrer)

Limites relevées en cours de chantier, consignées en intention le
2026-10-15 (chantier « capitaliser les non-régressions ») ; les recadrer est
une décision du demandeur.

- [ ] [décision] Le feu vert de publication enregistré par l'outil au
  lancement, comme la fusion automatique (limite du chantier « date
  gardée et feu vert de publication » du 2026-10-18) —
  `docs/intentions/feu-vert-publication-enregistre.md`.
- [ ] [décision] Aligner le texte de QUA-048 (une clôture en un geste)
  sur la reconnaissance par squash de QUA-058 (limite du chantier « les
  branches fusionnées par squash reconnues » du 2026-10-19) —
  `docs/intentions/qua-048-aligne-sur-squash.md`.
- [ ] [décision] Reconnaître une fusion par squash hors de GitHub (limite
  du chantier « les branches fusionnées par squash reconnues » du
  2026-10-19) — `docs/intentions/squash-hors-github.md`.
- [ ] [décision] La clôture signale aussi les citations d'une intention
  retirée (écart relevé pendant le chantier « les branches fusionnées par
  squash reconnues » du 2026-10-19) —
  `docs/intentions/cloture-signale-intention-retiree.md`.
- [ ] [décision] Retirer les neuf citations de fiche restées dans le code
  non modifié (limite du chantier « une clôture allégée » du 2026-10-18) —
  `docs/intentions/citations-de-fiche-heritees.md`.
- [ ] [décision] Reconnaître les commentaires de code sans heuristique de
  ligne (limite du chantier « une clôture allégée » du 2026-10-18) —
  `docs/intentions/commentaires-reconnus-par-heuristique.md`.
- [ ] [décision] Mesurer le gain de la clôture allégée à part (comparaison
  par chantier entier faite le 2026-10-18, sans conclusion ; limite du
  chantier « une clôture allégée » du 2026-10-18) —
  `docs/intentions/mesurer-gain-cloture-allegee.md`.
- [ ] [décision] Une annonce juste du oui à l'ouverture d'un détour qui
  cite le registre (limite du chantier « un contrat ajouté pendant un
  détour » du 2026-10-19) — `docs/intentions/annonce-oui-registre-detour.md`.
- [ ] [décision] Compter `package.json` parmi les seuils d'un détour
  (limite du chantier « un détour » du 2026-10-18) —
  `docs/intentions/seuils-dans-package-json.md`.
- [ ] [décision] Reconnaître les essais en réel sans liste de mots
  (limite du chantier « une recette par version » du 2026-10-19) —
  `docs/intentions/essai-reel-reconnu-par-mots.md`.
- [ ] [décision] Une version HTML de la fiche de recette (hors périmètre
  du chantier « une recette par version » du 2026-10-19) —
  `docs/intentions/fiche-de-recette-html.md`.
- [ ] [décision] Lire la dernière version d'une fiche fusionnée par squash
  dans la fiche de recette (limite du chantier « une fiche de recette
  juste » du 2026-10-19) — `docs/intentions/fiche-recette-apres-squash.md`.
- [x] [IA] [P1] 0.6.7, 1 sur 5 : compatibilité des agents, le socle
  commun (banc, règle « intention ou demande », en-têtes YAML stricts,
  matrice) — fait, journal du 2026-10-19.
- [x] [IA] [P1] 0.6.7, 2 sur 5 : Copilot CLI tenu — fait, journal du
  2026-10-19.
- [ ] [décision] Revenir en SCOPING après la fusion d'un chantier, sans geste
  à la main (limite du chantier « Copilot CLI tenu » du 2026-10-19) —
  `docs/intentions/etat-revient-en-scoping-apres-fusion.md`.
- [ ] [décision] Établir la cause du dépassement de 30 s des hooks en session
  interactive de Copilot CLI (limite du même chantier) —
  `docs/intentions/depassement-delai-copilot-interactif.md`.
- [x] [IA] [P1] 0.6.7, 3 sur 5 : Gemini CLI tenu — fait, journal du
  2026-10-19.
- [ ] [décision] Commandes `/drwil-*` et sondage de lancement sous Gemini CLI
  (limite du chantier « Gemini CLI tenu » du 2026-10-19) —
  `docs/intentions/skills-et-sondage-sous-gemini.md`.
- [ ] [décision] Un passage complet et stable du banc sous Gemini CLI, malgré
  le quota (limite du même chantier) —
  `docs/intentions/banc-gemini-quota.md`.
- [ ] [décision] `verify` dit pourquoi un critère n'est « pas durable »
  (marqueur `[humain]` manquant ou en trop) —
  `docs/intentions/critere-humain-message-clair.md`.
- [ ] [décision] La clôture dit quelle étape suit au lieu de refuser sèchement
  (chemin BUILD → CLOSING, évidence périmée) —
  `docs/intentions/cloture-chemin-guide.md`.
- [ ] [décision] Décision de fusion sous un outil sans second sondage (Copilot
  CLI) — `docs/intentions/fusion-sans-sondage-copilot.md`.
- [ ] [décision] [P1] Codex (intention : à installer, rien d'essayé) —
  `docs/intentions/compat-codex.md`.
- [ ] [décision] [P1] Cursor (intention : mode de preuve à choisir) —
  `docs/intentions/compat-cursor.md`.
- [ ] [décision] Une seule forme pour les ID du catalogue —
  `docs/intentions/prefixe-catalogue.md`.
- [ ] [décision] Un `doctor` juste sur le dépôt drwil lui-même (manifeste
  et version, installé par `installer-depot`) —
  `docs/intentions/doctor-sur-le-depot-drwil.md`.

- [ ] [décision] Une file de chantiers aussi pour Copilot CLI —
  `docs/intentions/file-pour-copilot.md`.
- [ ] [décision] L'arrêt d'une file et ses comptes rendus vérifiés par un
  contrôle — `docs/intentions/arret-de-file-verifie.md`.
- [ ] [décision] Ce que lit un visiteur reste juste sans dépendre de la
  mémoire de l'agent (README en double, version annoncée non contrôlée,
  toute clôture contrainte à l'exercice, entretien courant compris ;
  constaté le 2026-10-17) — `docs/intentions/doc-visiteur-juste.md`.
- [ ] [décision] [P1] drwil_com, priorité 1 : une attestation tombe quand
  ce qu'elle couvre change (scénario S6) —
  `docs/intentions/attestation-liee-a-son-objet.md`.
- [ ] [décision] [P1] drwil_com, priorité 2 : des critères et des preuves
  qui survivent à la clôture — `docs/intentions/criteres-et-preuves-durables.md`.
- [ ] [décision] [P1] drwil_com, priorité 3 : vérifier la barrière de
  fusion (protection absente, mal configurée, conforme) — section « Retour
  de drwil_com » de `docs/intentions/forge-dans-le-livrable.md`.
- [ ] [décision] drwil_com, à examiner ensuite : une acceptation humaine
  par critère — `docs/intentions/acceptation-par-critere.md`.
- [ ] [décision] drwil_com, à examiner ensuite : un cycle de vie des
  fiches sans contournement — `docs/intentions/cycle-de-vie-des-fiches.md`.
- [ ] [décision] drwil_com, en dernier : le reste du guide de démarrage
  (dépôt git existant avant `init` ; le reste est cadré en 0.6.3) —
  `docs/intentions/guide-de-demarrage.md`.
- [ ] [décision] Mener dès le premier chantier dans un sous-agent, pas
  seulement une file — `docs/intentions/sous-agent-des-le-premier-chantier.md`.
- [ ] [décision] Convoquer des personas d'agents (`agency-agents`) choisis par
  le cadrage d'un chantier — `docs/intentions/personas-convoques-par-le-cadrage.md`.

- [ ] [humain] [P3] Vérifier sur le web et le desktop que la note de fin
  de réponse s'affiche sous la réponse (terminal vérifié le 2026-10-17 ;
  limite du chantier du 2026-10-17) —
  `docs/intentions/identifiant-rattrape-avant-l-humain.md`.
- [ ] [décision] Une file menée par sous-agents avec les autres agents
  (Copilot CLI, Codex, Cursor, Gemini ; limite du chantier du 2026-10-18)
  — `docs/intentions/file-sous-agents-autres-outils.md`.
- [ ] [décision] Le budget de temps des contrôles au commit, calibré pour
  les machines Windows de la CI (1500 ms dépassé sans changement de code ;
  relevé le 2026-10-17) — `docs/intentions/budget-temps-windows.md`.
- [ ] [décision] `yarn init` laisse-t-il un projet neuf ? (non vérifié ;
  limite du chantier « `npm init -y` » du 2026-10-17) —
  `docs/intentions/projet-neuf-apres-yarn-init.md`.
- [ ] [décision] Le glossaire des identifiants injecté aussi chez les
  autres agents (Cursor, Copilot CLI, Gemini, Codex) —
  `docs/intentions/glossaire-autres-agents.md`.

- [x] [IA] [P1] La carte, le README et le changelog d'un projet dans la
  langue choisie (réglage `docLang`) — fait le 2026-10-16 (voir
  `docs/projects/journal.md`).

## Ensuite

- [ ] [IA] [P3] Couverture : tout le code livré mesuré (`--all`, hooks
  Claude, module front, cliquet ; recadré le 2026-10-16) —
  `docs/projects/adopter-seuil-couverture.md`.
- [ ] [décision] [P3] Couverture du paquet relevée à 100 % (release
  testée par mock, tranché le 2026-10-16) —
  `docs/intentions/couverture-paquet-100.md`.
- [ ] [décision] [P3] Tout code modifié arrive couvert à 100 % (couverture
  du diff, adoption en douceur ; proposé le 2026-10-16) —
  `docs/intentions/couverture-du-diff.md`.
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

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

Objectifs stabilisés par le demandeur le 2026-10-21 (base de la refonte
de la roadmap) : prouver la valeur par des chiffres avant de décider de
publier ou vendre ; cible : solo et équipe, avec un réglage équipe / solo ;
horizon : quelques jours ; contraintes à tenir ensemble : rigueur, fluidité,
coût, en visant la fabrique autonome.

## Plan d'action (2026-10-26)

Décidé avec le demandeur le 2026-10-26 ; **remplace les ordres précédents**
(section « Historique »). Deux voies : la **réalisation** des fiches cadrées,
une à la fois (elles partagent `.githooks/state.mjs`, `.githooks/state.test.mjs`
et `packages/drwil/test/cycle.test.mjs` ; seule `niveau-de-protection` touche un
autre code), et le **cadrage** par thème, entre deux chantiers. Les priorités
des fiches suivent cet ordre, pour que `/drwil-start` le propose tel quel.

1. **Réaliser les fiches cadrées**, dans l'ordre de la section suivante ; un
   chantier par session, le suivant après la fusion du précédent. Les quatre
   premières (plafond à 200 lignes, puis découpe de la CLI, des hooks de
   base, des modules et outils) sortent ensemble en 0.10.0 (décision du
   2026-10-27) ; le thème H (hooks d'agent et `AGENTS.md` courts, et le
   contrôle livré qui surveille la taille de tous les fichiers générés par
   drwil) y entre aussi, en tête de pile (décision du 2026-10-27).
2. **Cadrer par thème** (l'agent propose les réponses, le demandeur tranche
   en un sondage, une PR de cadrage par thème) : A. release allégée (tout de
   suite) ; B. protection, garanties, contournements (après
   `niveau-de-protection`) ; C. cible de couverture (après
   `verify-rejoue-les-echecs`) ; D. preuves et contrôles (après
   `attestations-sur-l-effet-et-couvre`) ; E. adoption et documentation,
   dont la montée de version sans perte pour le projet (CI extensible,
   données du projet hors prose du kit, alertes avant et après écrasement,
   détection de stack élargie, aide à alléger les fichiers de l'adoptant (après la 0.10.0) ; constatée sur drwil_dbox le 2026-10-26,
   donc en tête du thème ; ces intentions touchent `packages/drwil/src`
   et les gabarits, pas les fichiers partagés des fiches cadrées), puis le
   parcours fluide (worktree toujours proposé, attestation depuis le chat,
   ajout ou adoption d'un contrat par commande, jugé important ; demandés le 2026-10-27 : ils touchent le sondage de lancement et
   `drwil attest`, donc `.githooks/state.mjs` que les fiches cadrées
   partagent, d'où leur place après elles) ;
   F. fluidité et relecture, dont l'accueil de session (après
   `cycle-de-vie-des-fiches`) ;
   G. clôture, file et chantiers en parallèle (après
   `cycle-de-vie-des-fiches`, qui modifie déjà `.githooks/close.mjs`, et
   `next-attend-la-fusion`, voisine de la file) : la clôture d'une fiche
   permanente, la note « un lancement intercalé efface la file » de
   `docs/intentions/cloture-et-attestations.md`, le repositionnement après
   une clôture, les conflits d'index et de journal entre worktrees ;
   H. fichiers chargés courts : les hooks d'agent sous le plafond de 200
   lignes, un `AGENTS.md` court qui aiguille vers le détail, et un contrôle
   livré dans le paquet qui surveille la taille de tous les fichiers générés
   par drwil (tout de suite, en 0.10.0, demande du 2026-10-27 ; il touche `AGENTS.md` et
   `.claude/hooks/`, pas les fichiers partagés des fiches cadrées) —
   `docs/intentions/fichiers-charges-courts.md`.
3. **Grands sujets, ensuite** : catalogue et profils, autres outils (dont
   le sondage parallèle dans Copilot CLI et la consommation de tokens des
   autres outils), banc et fabrique (après le catalogue, décision du
   2026-10-26), produit.

**Versions visées (décidé avec le demandeur le 2026-10-28)** :

- **0.11.0** : la réalisation des sept fiches cadrées de la section suivante,
  une par session, dans l'ordre indiqué ; entre deux chantiers, le cadrage des
  thèmes C (cible de couverture) et D (preuves et contrôles).
- **0.12.0** : la fluidité de l'adoption (thèmes B, E, F et G), cadrée pendant
  la 0.11 : le premier commit du kit sous la barrière bloquante, le
  `judgeGuarantees` mort, la clôture d'une fiche permanente (qui laisse
  l'état en BUILD après une montée de version), les garanties, la montée de
  version sans perte, le worktree toujours proposé et l'attestation depuis le
  chat.

Ordre de la 0.12.0 (tag `(0.12.0, n)` sur chaque intention de « Intentions par
thème ») : 1 le premier commit du kit, 2 la clôture d'une fiche permanente,
3 le `judgeGuarantees` mort, 4 le contrôle du kit qui masque l'alerte, 5 les
garanties, la suite ; puis les thèmes E (montée de version sans perte,
worktree toujours proposé, attestation depuis le chat) et F, à cadrer pendant
la 0.11.

Une limite trouvée à une clôture rejoint l'intention de son thème, jamais un
doublon. Une intention qui attend une condition (chiffres du banc, essai réel
d'un outil) la dit dans son statut.

## Fiches cadrées, dans l'ordre de réalisation

- [ ] [IA] [P2] La fusion automatique s'enchaîne dans l'ordre par un outil
  (merge-auto), plus par une consigne ; ordre sauté deux fois le
  2026-10-28 (cadré le 2026-10-28, en tête de pile) —
  `docs/projects/fusion-auto-ordonnee.md`.
- [ ] [IA] [P2] Le sondage `/drwil-start` de Copilot CLI propose et lit un choix
  multiple (file de chantiers, parallèle), en tête de pile (cadré le 2026-10-28) —
  `docs/projects/sondage-copilot-choix-multiple.md`.
- [ ] [IA] [P2] Une fiche à plusieurs lots se réalise lot par lot, un sous-agent
  neuf par lot, une seule clôture (cadré le 2026-10-28 ; avant les fiches à
  lots de la 0.11.0) —
  `docs/projects/lots-en-sous-agents.md`.
- [ ] [IA] [P2] `docs/ia-first.md` en sections courtes autonomes, plafond des
  documents lus à la demande abaissé à 400 ou 500 lignes, `kitSizeLegacy`
  retiré (cadré le 2026-10-28 ; à affiner : trois décisions de forme à prendre,
  puis lancer juste après la fiche précédente) —
  `docs/projects/ia-first-en-sections-courtes.md`.
- [ ] [IA] [P2] Un cycle de vie des fiches sans contournement : registre en
  SCOPING, code livré, acceptation des critères, hooks déclarés au lancement, ligne d'index retirée
  (cadré le 2026-10-26, élargi le même jour) — `docs/projects/cycle-de-vie-des-fiches.md`.
- [ ] [IA] [P2] `next` n'enchaîne pas tant que la PR du chantier précédent
  n'est pas fusionnée (cadré le 2026-10-26) —
  `docs/projects/next-attend-la-fusion.md`.
- [ ] [IA] [P2] La réouverture dit ce qu'elle a annulé, et son cycle complet se
  joue aussi sous Windows (cadré le 2026-10-26) —
  `docs/projects/reouverture-dite-et-eprouvee.md`.
- [ ] [IA] [P3] Une attestation tombe quand ce qu'elle juge change, pas quand
  la forme d'un contrôle change ; `Couvre` déclaré pour les contrats attestés
  (cadré le 2026-10-26, chemins tranchés le même jour ; après la réouverture,
  pour une seule séance de réattestation) —
  `docs/projects/attestations-sur-l-effet-et-couvre.md`.
- [ ] [IA] [P3] Compléter le test unitaire de QUA-138 (retour en SCOPING
  après la fusion), en dernier : il teste les textes que les fiches
  précédentes modifient — `docs/projects/test-unitaire-fusion-automatique.md`.

En attente d'une décision (à affiner) ou d'un geste humain :

- [ ] [IA] [P3] Couverture : tout le code livré mesuré (`--all`, hooks
  Claude, module front, cliquet ; recadré le 2026-10-16 ; à affiner :
  attend la cible de `docs/intentions/couverture-paquet-100.md`) —
  `docs/projects/adopter-seuil-couverture.md`.
- [ ] [IA] [P3] Release : feu vert de publication enregistré par l'outil, recette
  qui signale un squash (cadré le 2026-10-26 ; à affiner : attend
  `docs/intentions/release-allegee.md`) —
  `docs/projects/release-feu-vert-et-squash.md`.
- [ ] [humain] [P3] Vérifier que Cursor et Copilot lisent les fichiers de renvoi —
  `docs/projects/suites-kit-portable.md` (point 2).

## Intentions par thème

### Fichiers chargés courts

Cadré le 2026-10-27 en trois fiches (livrées), puis le 2026-10-28 en une
quatrième (voir « Fiches cadrées », 0.11.0) :
`docs/projects/ia-first-en-sections-courtes.md`. Intention :
`docs/intentions/fichiers-charges-courts.md`.

### Preuves, contrôles, vitesse

- [ ] [décision] [P1] Préciser ce que prouvent l'e2e et l'attestation (revue
  externe du 2026-10-22) — `docs/intentions/e2e-et-attestation-precises.md`.
- [ ] [décision] [P1] Suivre la durée de la CI et le contexte relu, et trancher
  leurs calibrages (dont l'avertissement `[ia-first-warning]` et un `verify`
  en FAIL sans contrat en échec, repris le 2026-10-26) —
  `docs/intentions/suivi-ci-et-contexte.md`.
- [ ] [décision] Le pre-push connaît le commit local poussé, pas seulement la
  référence distante (reprise d'un verdict au pre-push, QUA-152) —
  `docs/intentions/pre-push-commit-pousse.md`.
- [ ] [décision] Comprendre l'échec intermittent de la couverture des hooks
  (QUA-004) vu deux fois sous charge parallèle, jamais reproduit seul —
  `docs/intentions/couverture-hooks-intermittente.md`.
- [ ] [décision] Surveiller qu'un contrôle ne lit que ses `paths` (reprise
  par contrôle, QUA-141) —
  `docs/intentions/reprise-par-controle-limites.md`.
- [ ] [décision] Les tests qui laissent des fichiers dans leur dossier
  temporaire se corrigent à la source (31 contrôles nommés par
  `run-checks` le 2026-10-25) —
  `docs/intentions/tests-qui-laissent-des-fichiers-temporaires.md`.
- [ ] [décision] [P3] La couverture à 100 %, le paquet et tout code modifié :
  une seule cible à trancher avec la fiche ci-dessus (release testée par
  mock, tranché le 2026-10-16) — `docs/intentions/couverture-paquet-100.md`.

### Protection, garanties, contournements

- [ ] [décision] [P1] (0.12.0, 1) Le premier commit du kit est refusé en SCOPING sous la
  barrière bloquante, et la recette d'adoption ne le dit pas —
  `docs/intentions/premier-commit-du-kit-sous-barriere-bloquante.md`.
- [ ] [décision] [P2] (0.12.0, 3) Un `judgeGuarantees` mort reste dans `packages/drwil/src/guarantees-verify.ts` —
  `docs/intentions/juge-des-garanties-en-double.md`.
- [ ] [décision] [P2] (0.12.0, 4) Le contrôle `taille-kit` déclaré à l'installation compte comme
  contrôle du projet et masque l'alerte « aucun contrôle du projet déclaré »,
  même en CI chez un projet neuf —
  `docs/intentions/controle-du-kit-masque-l-alerte-sans-controle.md`.
- [ ] [décision] [P2] (0.12.0, 5) Les garanties obligatoires, la suite (`doctor` sur le dépôt
  drwil compris), à cadrer avec ou juste après la fiche du niveau de
  protection — `docs/intentions/garanties-la-suite.md`.
- [ ] [décision] [P1] Les contournements encore ouverts : juger l'effet, pas
  le texte (garde shell, juge du banc), le clone superficiel,
  l'auto-élargissement du cadrage, les seuils d'un détour —
  `docs/intentions/contournements-restants.md`.
- [ ] [décision] [P1] drwil_com, priorité 3 : vérifier la barrière de
  fusion (protection absente, mal configurée, conforme) — section « Retour
  de drwil_com » de `docs/intentions/forge-dans-le-livrable.md`.

### Adoption, installation, documentation

- [ ] [décision] [P1] Un parcours d'installation et de chantier sans demande
  d'autorisation à chaque commande, avec le worktree toujours proposé,
  l'attestation depuis le chat et l'ajout ou l'adoption d'un contrat par
  commande (demandes des 2026-10-25 et 2026-10-27) —
  `docs/intentions/installation-fluide.md`.
- [ ] [décision] L'adoption et `init` sur un projet réel : code existant,
  couche d'un dossier apparu après l'installation, dépôt git existant avant
  `init` — `docs/intentions/adoption-et-init.md`.
- [ ] [décision] Une documentation qui reste juste : renvois, citations,
  index, doc visiteur — `docs/intentions/coherence-de-la-doc.md`.
- [ ] [décision] [P1] Un CI du kit que la mise à jour n'écrase pas : étape C++
  et job Windows perdus sur drwil_dbox le 2026-10-26 —
  `docs/intentions/ci-extensible-sans-perte.md`.
- [ ] [décision] [P1] Les données du projet (tableau des fiches) hors des
  fichiers de prose que le kit réécrit —
  `docs/intentions/donnees-du-projet-hors-prose-du-kit.md`.
- [ ] [décision] Alerter avant et après un écrasement (diff de `resolve-drift`,
  `doctor` sur stack vide ou `.bak`) —
  `docs/intentions/alertes-avant-et-apres-ecrasement.md`.
- [ ] [décision] La détection de stack reconnaît plus de technologies (C/C++,
  Swift, Elixir…) et signale une stack vide (constaté sur drwil_dbox le
  2026-10-26) — `docs/intentions/detection-de-stack-elargie.md`.
- [ ] [décision] [P3] Aider l'adoptant à alléger ses fichiers (outil de
  découpe, fiches d'allègement à l'adoption) — demande du 2026-10-27, après
  la 0.10.0 — `docs/intentions/alleger-les-fichiers-de-l-adoptant.md`.

### Release

- [ ] [décision] [P2] Alléger la release, puis outiller ce qui reste ; la
  fiche du feu vert de publication attend ses réponses —
  `docs/intentions/release-allegee.md`.

### Clôture, file et chantiers en parallèle

- [ ] [décision] Clôture, réouverture et attestations : cadrée en cinq fiches
  le 2026-10-26 ; reste la note « un lancement intercalé efface la file » —
  `docs/intentions/cloture-et-attestations.md`.
- [ ] [décision] Se repositionner après une clôture : nettoyer le worktree et
  les branches, revenir sur `master`, créer la branche de cadrage —
  `docs/intentions/nettoyage-des-worktrees.md`.
- [ ] [décision] Conflits d'index et de journal entre chantiers en parallèle —
  `docs/intentions/conflits-de-cloture-entre-worktrees.md`.
- [ ] [décision] Le sondage parallèle (plusieurs worktrees) vérifié dans
  Copilot CLI ; le sondage à une fiche l'est (2026-10-26) —
  `docs/intentions/sondage-worktree-copilot-cli.md`.
- [ ] [décision] [P1] (0.12.0, 2) La clôture en un geste reconnaît une fiche permanente
  (l'entretien courant, clos à la main pour les versions 0.8.0 et 0.9.0 ; sans
  cela l'état reste en BUILD après une montée de version et `/drwil-start` est refusé) —
  `docs/intentions/cloture-fiche-permanente.md`.

### Fluidité et relecture

- [ ] [décision] [P1] Fluidité sans perte de rigueur : restent le
  regroupement (PR, attestations) et qui décide chaque transition (agent ou
  humain), déclaré et affiché (v1:CTR-015, v1:GOV-002) —
  `docs/intentions/fluidite-sans-perte-de-rigueur.md`.
- [ ] [décision] [P1] Vue de relecture et relecture avant fusion, choisie
  au lancement : montrer à l'humain ce qui demande son jugement dans une PR
  (décisions, cadrage, règles, preuves, exceptions), et une question de plus
  dans le sondage (`drwil-review`), cadrées ensemble avec la protection de
  master — `docs/intentions/vue-de-relecture.md`.
- [ ] [décision] Un accueil drwil court à l'ouverture d'une session (où en
  est le projet, commandes utiles ; l'essentiel seulement, le détail à la
  demande ; demande du 2026-10-27) —
  `docs/intentions/accueil-drwil-a-l-ouverture.md`.

### Coût en tokens

- [ ] [décision] La consommation de tokens mesurée aussi pour les autres
  outils IA (Copilot CLI, Cursor, Codex, Gemini) —
  `docs/intentions/consommation-autres-outils.md`.

### Catalogue et profils (casse une compatibilité : avant la publication npm)

Questions du catalogue tranchées le 2026-10-13 (porte avant publication
reportée à la phase produit) ; reste à valider l'intention et à écrire le
critère de sortie de chaque fiche —
`docs/intentions/catalogue-cycle-de-vie.md`.

- [ ] [décision] [P1] Format du catalogue : JSON canonique, schéma
  versionné, statuts (+ NOT_APPLICABLE), sévérités BLOQUANT / MAJEUR /
  MINEUR avec échéance, mode de contrôle, Markdown généré, une quinzaine
  de contrats déjà tenus (v1:CTR-003, v1:CTR-010, v1:CTR-012) — fiche 1.
- [ ] [décision] [P1] Profils par risque du produit (LÉGER, STANDARD,
  RENFORCÉ, CRITIQUE ; DOGFOODING cumulable) : contrats applicables et
  sévérité choisis par profil (v1:CTR-014, v1:HOOK-006), hors garanties
  obligatoires de l'adoption (décidé le 2026-10-22) — fiche 2.
- [ ] [décision] [P1] Adoption ciblée : détection et questions à `init`,
  liste classée, `drwil contracts add <ID>` — fiche 3.

### Autres outils

- [ ] [décision] [P1] Codex, après la 0.6.7 (intention : à installer, rien
  d'essayé) — `docs/intentions/compat-codex.md`.
- [ ] [décision] [P1] Cursor, après la 0.6.7 (intention : mode de preuve à
  choisir) — `docs/intentions/compat-cursor.md`.
- [ ] [décision] Les autres outils au niveau de Claude Code (5 suites
  regroupées le 2026-10-25 dans l'intention mère) —
  `docs/intentions/compatibilite-des-outils.md`.

### Banc et fabrique (après le catalogue, décision du 2026-10-26)

Prérequis : la protection de master (faite le 2026-10-13) ; le banc mesure le
drwil qui fera tourner la fabrique, et la fabrique a besoin de ses chiffres.

- [ ] [décision] `verify` ne donne jamais PASS dans la copie du banc :
  contrats à attester, humain absent (limite du chantier « Mini-banc :
  copie « avec » adoptée » du 2026-10-23) —
  `docs/intentions/banc-verify-jamais-pass.md`.
- [ ] [décision] [P2] Campagne du mini-banc : essai réel en CI avec
  l'abonnement, puis 12 passages et leur rapport — `docs/intentions/campagne-mini-banc.md`.
- [ ] [décision] [P2] Fabrique autonome graduée par le risque (outillage,
  mutation, rôles séparés, une session par fiche, auto-fusion LOW),
  cadrée sur les chiffres du mini-banc et de la consommation —
  `docs/intentions/fabrique-autonome.md`.
- [ ] [décision] [P3] Banc complet avec / sans drwil (5 tâches), décidé
  sur les chiffres du mini-banc — `docs/intentions/bench-avec-sans-drwil.md`.

### Produit, quand tout est opérationnel

- [ ] [décision] [P2] Publication npm du kit, avec une porte avant
  `npm publish` (v1:HOOK-013, v1:REL-006, v1:PKG-010) ; tranche aussi la
  question 3 du catalogue, reportée ici le 2026-10-13 —
  `docs/intentions/packager-kit-ia-first.md`.
- [ ] [décision] [P2] Protection de la forge dans le livrable (ruleset,
  CODEOWNERS, vérification en CI, diagnostic, identité de l'agent guidée) —
  `docs/intentions/forge-dans-le-livrable.md`.
- [ ] [décision] [P2] Validation commerciale : des équipes veulent-elles
  utiliser et payer DRWIL ? — `docs/intentions/validation-commerciale.md`.
- [ ] [décision] [P3] Community Ready : fichiers et parcours pour qu'un
  contributeur externe puisse participer sans demander au mainteneur ;
  questions à trancher (langue, gabarit de PR, canal sécurité, contrats
  COM) — `docs/intentions/community-ready.md`.

## Historique

Ordres et vagues décidés avant le plan d'action du 2026-10-26, gardés pour
leurs décisions et leurs dates ; les cases ouvertes sont remontées plus haut.

### Ordre de réalisation (2026-10-11)

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
  démarrage réduit (`docs/intentions/adoption-et-init.md`, ex-« guide-de-demarrage »). Les six
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
  intention le 2026-10-19 (demande de l'humain) : le périmètre de la
  0.6.7 est donc ramené à trois outils (socle, Copilot CLI, Gemini CLI),
  puis la release (faite, journal du 2026-10-20).
- **Ordre des versions suivantes**, validé par le demandeur le 2026-10-19 :
  1. 0.6.7, la release (faite, journal du 2026-10-20).
  2. 0.6.8, Copilot CLI enchaîne les chantiers (fait, journal du
     2026-10-20) : décision de fusion au sondage, retour en SCOPING après la
     fusion, sous-agent dès le premier chantier ; reste la file pour les
     autres outils (`docs/intentions/compatibilite-des-outils.md`).
  3. 0.6.9, la fluidité de la clôture (faite, journal du 2026-10-21) :
     clôture guidée, message clair du critère humain, note à tout moment.
  4. Avant la 0.7.0 (demande du 2026-10-21), la cohérence de la
     documentation à la clôture (faite, journal du 2026-10-21)
     et la note de recette conservée dans le dépôt (faite, journal du
     2026-10-21).
  5. 0.7.0, la preuve qui dure (ci-dessous).
  6. 0.7.x, mesure et efficacité : consommation de Copilot CLI puis des
     autres outils (`docs/intentions/consommation-autres-outils.md`),
     fluidité sans perte de rigueur, vue de relecture, relecture avant
     fusion.
  7. 0.8, catalogue et adoption (P1) d'abord ; puis, en P2, Codex et Cursor,
     personas et application de suivi (abandonnés le 2026-10-25),
     chantiers en parallèle (abandonnés puis rouverts le même jour,
     `docs/projects/journal.md`),
     couche d'un nouveau dossier de code
     (`docs/intentions/adoption-et-init.md`),
     publication npm et protection de la forge.
- **Pendant la 0.6.3** : trancher les questions de l'attestation liée à
  son objet, pour que sa fiche technique soit prête à la sortie.
- **0.7.0** — la preuve qui dure : attestation liée à son objet (fait,
  journal du 2026-10-21), critères et
  preuves durables (fait, journal du 2026-10-21),
  barrière de fusion vérifiée (`docs/intentions/forge-dans-le-livrable.md`).

Valeur et effort sont des estimations de l'agent, tirées du code et d'un
seul pilote.

Les trois fiches du catalogue passent en `[P1]` pour que `/drwil-start`
les propose dans cet ordre.

### Vague 1 — hygiène et preuves : terminée le 2026-10-11

Faite dans l'ordre : la règle `git -c` recalibrée, SEC-006 outillé, la
carte du dépôt, la consigne de fusion automatique, lint, formatage et
versions de Node (voir `docs/projects/journal.md`). Le README a été
repris le 2026-10-12.

### Vague 2 — rendre les décisions humaines prouvables, relever les preuves

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

### Vague 3 — mesurer avant de construire

Fait : consommation de tokens par chantier, lue dans les journaux de
session (`node .githooks/consumption.mjs`, journal du 2026-10-11) ; livrée
à tout projet et consignée à la clôture (QUA-042, journal du 2026-10-16).

### Vague 4 — restructurations, protégées par les filets, décidées sur les chiffres

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

### Vague 5 — catalogue et profils (ce qui casse une compatibilité)

Questions du catalogue tranchées le 2026-10-13 (porte avant publication
reportée à la vague 7) ; reste à valider l'intention et à écrire le
critère de sortie de chaque fiche —
`docs/intentions/catalogue-cycle-de-vie.md`.

### Vague 6 — la fabrique, en pilote dans ce dépôt

Prérequis : la protection de master (vague 2), reportée le 2026-10-11 :
aucune fusion autonome sans elle. Le mini-banc y a été déplacé le
2026-10-12 (demandeur) : il mesure le drwil restructuré qui fera tourner la
fabrique, et c'est la décision de la fabrique qui a besoin de ses chiffres.

### Vague 7 — le produit, quand tout est opérationnel

### Retours d'expérience

Limites relevées en cours de chantier, consignées en intention le
2026-10-15 (chantier « capitaliser les non-régressions ») ; les recadrer est
une décision du demandeur.

- [x] [IA] [P1] 0.6.7, 1 sur 3 : compatibilité des agents, le socle
  commun (banc, règle « intention ou demande », en-têtes YAML stricts,
  matrice) — fait, journal du 2026-10-19.
- [x] [IA] [P1] 0.6.7, 2 sur 3 : Copilot CLI tenu — fait, journal du
  2026-10-19.
- [x] [IA] [P1] 0.6.7, 3 sur 3 : Gemini CLI tenu — fait, journal du
  2026-10-19.
- [x] [IA] [P1] 0.6.8 : Copilot CLI enchaîne les chantiers — fait, journal
  du 2026-10-20.
- [x] [IA] [P1] Release 0.6.9, la fluidité de la clôture — fait, journal
  du 2026-10-21.

### Fait

- [x] [IA] [P1] La carte, le README et le changelog d'un projet dans la
  langue choisie (réglage `docLang`) — fait le 2026-10-16 (voir
  `docs/projects/journal.md`).

### Ordres précédents (2026-10-23 et 2026-10-26, avant le plan d'action)

Ordre de réalisation (2026-10-23), porté par les priorités ci-dessous
(même priorité : ordre des chemins) : 1. la barrière de périmètre
jugeant une fusion sur sa résolution (fait le 2026-10-23, voir
`docs/projects/journal.md`) ;
2. CODEOWNERS protégeant le registre sous son nom actuel (fait le
2026-10-24, voir `docs/projects/journal.md`) ;
3. la réouverture d'un chantier dont la PR révèle un défaut (fait le
2026-10-24, voir `docs/projects/journal.md`) ; 4. les contournements restants fermés ou assumés (fait le
2026-10-24, voir `docs/projects/journal.md`) ;
5. `docs/projects/journal.md` (son niveau « contrôles CI
actifs » s'appuie sur le 4).

Ordre des fiches cadrées, proposé au rangement du 2026-10-26 : plusieurs
touchent les mêmes fichiers (`.githooks/state.mjs` et
`.githooks/state-texts.mjs` du gabarit pour cinq d'entre elles,
`packages/drwil/src/evidence.ts` pour trois, `packages/drwil/src/verify.ts`
pour deux) ; elles
s'enchaînent, jamais en parallèle : 1. `verify-rejoue-les-echecs` ;
2. `attestations-sur-l-effet-et-couvre` ; 3. `cycle-de-vie-des-fiches` ;
4. `next-attend-la-fusion` ; 5. `reouverture-dite-et-eprouvee` ;
6. `test-unitaire-fusion-automatique` (il teste un texte que les
précédentes modifient). `niveau-de-protection` touche un autre code et
peut s'intercaler ; `release-feu-vert-et-squash` attend
`docs/intentions/release-allegee.md`.

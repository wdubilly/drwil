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
   `retour-scoping-branche-sondage`, voisine de la file) : la clôture d'une fiche
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
  une par session, dans l'ordre indiqué (en tête de pile, décidé le 2026-11-02 : `parite-des-outils`), puis, décidé le 2026-10-30, les fiches de
  correctifs vus à l'installation de `drwil_walk` (`cloture-sur-projet-neuf`, `installation-depot-neuf`,
  `adoption-fluide-projet-neuf`, `perimetre-visible`, `attente-commandes-longues`, `signaler-un-defaut-du-kit`) ; entre deux chantiers, le cadrage des
  thèmes C (cible de couverture) et D (preuves et contrôles).
- **0.12.0** : la fluidité de l'adoption (thèmes B, E, F et G), cadrée pendant
  la 0.11 : le premier commit du kit sous la barrière bloquante, le
  `judgeGuarantees` mort, la clôture d'une fiche permanente (qui laisse
  l'état en BUILD après une montée de version), les garanties, la montée de
  version sans perte, le worktree toujours proposé et l'attestation depuis le
  chat.

Ordre de la 0.12.0 (tag `(0.12.0, n)` sur chaque intention de « Intentions par
thème »), décidé le 2026-11-08 après la montée de drwil_walk en 0.11.0 : la montée de version
passe en tête, car elle rétrograde et écrase des fichiers du projet ; elle absorbe les données du
projet hors prose du kit, le CI que la mise à jour n'écrase pas et l'alerte avant et après
écrasement. 1 la montée de version sûre (passée en 0.11.1 le 2026-11-09, réalisée et fusionnée), 2 le premier commit du kit, 3 la clôture d'une fiche
permanente, 4 le `judgeGuarantees` mort, 5 le contrôle du kit qui masque l'alerte, 6 les
garanties, la suite ; puis les thèmes E (worktree toujours proposé, attestation depuis le chat) et F,
à cadrer pendant la 0.11.

Une limite trouvée à une clôture rejoint l'intention de son thème, jamais un
doublon. Une intention qui attend une condition (chiffres du banc, essai réel
d'un outil) la dit dans son statut.

## Feuille de route par version (2026-11-09)

Étiquette `(version)` sur chaque ligne ouverte ; sans étiquette = plus tard. Remplace « Versions visées » pour ce qui reste.

- **0.11.1** : publier « Unreleased » tel quel (montée de version sûre, contrôles lents en tranches) pour patcher drwil_walk.
- **0.11.2, optimisation des tests** (décidée le 2026-11-11 ; chaque sujet est son propre chantier, une session chacun, la release les regroupe). **Ordre à respecter** (il suit celui de la section « Fiches cadrées » ci-dessous) : 1 contrôles rejoués, 2 cache de verdicts en CI, 3 un seul run de couverture, 4 tranches dès le départ, 5 tests du kit découpés par thème, 6 preuves fiables, 7 temps des contrôles journalisé, 8 doublon des tests des hooks. Les chantiers sont lancés l'un après l'autre, le suivant après la fusion du précédent. Contraintes : le 3 avant le 4 (`doctor` et `guarantees` partagés) ; le 1 avant le 8 (module engine-selftest) ; le 6 avant le 7 (`run-checks-verdicts`).
- **0.12.0, gouvernance crédible, et la campagne du mini-banc** (critères de décision écrits le 2026-11-09 dans `docs/intentions/campagne-mini-banc.md`, à insérer au protocole ; essai réel, budget et 12 passages : gestes humains) : attestation authentifiée, contrôle sauté dit « non exécuté », contournements
  restants, clôture sans CI verte, pre-push, contrats à aligner, premier commit du kit, garanties ; le découpage des
  contrôles lents dès le départ ; les trois fiches reportées (hook commit-msg, gitleaks, ordre du sondage) ; petites hygiènes.
- **0.13.0, adoption, clôture et parallèle** : `init` sur projet réel, stack élargie, contrat modifiable par commande,
  worktrees et clôture, accueil de session, relecture avant fusion, CI éprouvée en réel (GitHub, GitLab, `merge-auto`).
- **0.14.0, mesurer** : coût en tokens, tests de mutation, catalogue et profils, publication npm.
- **Plus tard** : fabrique autonome, banc complet, validation commerciale, Community Ready, autres outils, forge du livrable.

## Fiches cadrées, dans l'ordre de réalisation

- [ ] [IA] [P0] (0.11.2) La couverture de `closedBriefPatterns` ne dépend plus de l'historique de la branche : le
  test importe le module réel, la CI de toute PR sans fiche supprimée repasse (cadré le 2026-11-12, urgent) —
  `docs/projects/couverture-de-closedbriefpatterns-en-ci.md`.
- [ ] [IA] [P0] (0.11.2) La fusion automatique et le nettoyage des branches fonctionnent sur GitLab : merge-auto et
  close-branches parlent `glab` (cadré le 2026-11-12, urgent, signalé par un adoptant GitLab) —
  `docs/projects/support-gitlab-merge-auto.md`.
- [ ] [IA] [P0] (0.11.2) Le lancement dit pourquoi il est refusé, arbre sale compris (cadré le 2026-11-12) —
  `docs/projects/lancement-refuse-dit-pourquoi.md`.
- [ ] [IA] [P0] (0.11.2) `drwil init` marque [IA] ce qu'un agent peut faire (cadré le 2026-11-12) —
  `docs/projects/init-marque-ia-ce-qui-est-faisable.md`.
- [ ] [IA] [P0] (0.11.2) Un chantier se mène dans la session principale, sans sous-agent (cadré le 2026-11-12) —
  `docs/projects/fin-des-sous-agents-de-chantier.md`.
- [ ] [IA] [P0] (0.11.2) La fusion automatique est le comportement par défaut, sans sondage, après le support GitLab
  (cadré le 2026-11-12) — `docs/projects/fusion-automatique-par-defaut.md`.
- [ ] [IA] [P0] (0.11.2) Une fiche P0 passe d'abord une analyse d'urgence (cadré le 2026-11-12) —
  `docs/projects/analyse-d-urgence-des-fiches.md`.
- [ ] [IA] [P0] (0.11.2) La consommation de Copilot CLI est mesurée comme celle de Claude Code (cadré le 2026-11-12) —
  `docs/projects/consommation-copilot-cli.md`.
- [ ] [IA] [P0] (0.11.2) Une relecture critique légère avant la clôture, sans frein au full auto (cadré le 2026-11-12) —
  `docs/projects/relecture-critique-avant-cloture.md`.


- [ ] [IA] [P0] (0.11.2) Le cache de verdicts de la CI est de nouveau sauvegardé à chaque fusion : le push sauté ne
  sauvegardait plus depuis le 2026-11-08 ; prêt, D1 à D3 tranchées (cadré le 2026-11-11) —
  `docs/projects/cache-des-verdicts-de-ci-retabli.md`.
- [ ] [IA] [P1] (0.11.2) Un seul run de tests pour le seuil de couverture et la couverture du diff : contrôle unique
  `coverage-diff-<couche>`, fusion des projets existants, avertissement de `doctor` ; prêt, D1 à D5 tranchées (cadré le
  2026-11-11) — `docs/projects/couverture-un-seul-run-de-tests.md`.
- [ ] [IA] [P1] (0.11.2) Un contrôle lent est découpé en tranches dès sa déclaration chez tout adoptant : table des
  outils e2e, déclaré par `guarantees` et signalé par `drwil doctor` ; prêt, décisions D1 à D6 tranchées (cadré le
  2026-11-09) — `docs/projects/controles-lents-decoupes-des-le-depart.md`.
- [ ] [IA] [P1] (0.11.2) Le plus gros fichier de tests du kit (68 s sur 213 s) est découpé par thème pour être joué en
  parallèle ; prêt, D1 à D3 tranchées (cadré le 2026-11-11) — `docs/projects/tests-du-kit-decoupes-par-theme.md`.
- [ ] [IA] [P1] (0.11.2) Les rejeux d'une clôture sont mesurés et le pre-push juge le commit réellement poussé ; prêt,
  D1 à D3 tranchées (cadré le 2026-11-11) — `docs/projects/preuves-fiables-rejeux-mesures.md`.
- [ ] [IA] [P1] (0.11.2) Le temps passé dans les contrôles d'un chantier est journalisé à la clôture, dans
  `.drwil/usage.jsonl`, et livré aux projets ; prêt, D1 à D3 tranchées (cadré le 2026-11-11) —
  `docs/projects/temps-des-controles-journalise.md`.
- [ ] [IA] [P1] (0.11.2) Les tests des hooks ne sont plus joués deux fois en CI (`checks-self-test` et
  `couverture-hooks`) ; prêt, D1 à D4 tranchées (cadré le 2026-11-11) —
  `docs/projects/doublon-des-tests-des-hooks-en-ci.md`.
- [ ] [IA] [P1] (0.12.0) Retirer le hook commit-msg et son refus « Co-Authored-By » (cadré le
  2026-11-06) — `docs/projects/retirer-le-hook-commit-msg.md`.
- [ ] [IA] [P2] (0.12.0) Les tests de run-checks passent sans gitleaks, grâce à un faux gitleaks (cadré
  le 2026-11-06) — `docs/projects/tests-de-run-checks-sans-gitleaks.md`.
- [ ] [IA] [P2] (0.12.0) L'ordre du sondage /drwil-start fonctionne chez l'adoptant, un ordre non lu se
  signale (cadré le 2026-11-06) — `docs/projects/ordre-du-sondage-chez-l-adoptant.md`.
- [ ] [décision] [P2] Retirer `drwil-progress`, maintenant que `drwil serve` est à parité (notée le 2026-11-08) —
  `docs/intentions/retrait-de-drwil-progress.md`.
- [ ] [décision] [P2] Documenter `drwil serve` dans le README du paquet (notée le 2026-11-08) —
  `docs/intentions/drwil-serve-readme-du-paquet.md`.
- [ ] [décision] [P2] Détecter la forge d'après l'hôte d'`origin`, pas d'après toute son adresse (notée le
  2026-11-08) — `docs/intentions/forge-detectee-sur-l-hote.md`.
- [ ] [décision] [P3] Reporter dans le document de compatibilité ce que chaque outil montre de l'accueil de session
  (notée le 2026-11-08) — `docs/intentions/releve-accueil-par-outil.md`.


En attente d'une décision (à affiner) ou d'un geste humain :

- [ ] [IA] [P3] Release : feu vert de publication enregistré par l'outil, recette
  qui signale un squash (cadré le 2026-10-26 ; à lancer après
  `docs/projects/journal.md`) —
  `docs/projects/release-feu-vert-et-squash.md`.
- [ ] [humain] [P3] Vérifier que Cursor et Copilot lisent les fichiers de renvoi —
  `docs/projects/suites-kit-portable.md` (point 2).

## Intentions par thème

### Parité des outils

- [ ] [humain] [P1] Sonder les quatre outils (lot 1 non fait) et dater le tableau de parité ; banc et file parallèle à
  décider — `docs/intentions/parite-des-outils-suites.md`.
- [ ] [humain] [P2] Essais réels de l'attestation depuis la conversation, cinq outils, au fil des développements du
  demandeur — `docs/intentions/attestation-chat-essais-reels.md`.
- [ ] [décision] [P3] Les formes PowerShell des hooks de repli jouées en CI —
  `docs/intentions/formes-powershell-des-hooks-non-jouees-en-ci.md`.
- [ ] [décision] [P3] Un message de repli pour les hooks de Gemini sous Windows —
  `docs/intentions/gemini-sous-windows-repli-node.md`.

### Fichiers chargés courts

Cadré le 2026-10-27 en trois fiches (livrées), puis le 2026-10-28 en une
quatrième (voir « Fiches cadrées », 0.11.0) :
`docs/projects/journal.md`. Intention :
`docs/intentions/fichiers-charges-courts.md`.

### Preuves, contrôles, vitesse

- [ ] [décision] [P2] (0.12.0) Le corps d'une PR suit `.github/pull_request_template.md`, contrôlé par une machine
  (note du 2026-10-27, écart sur la PR #273) — `docs/intentions/corps-de-pr-conforme-au-modele.md`.
- [ ] [décision] [P3] (0.13.0) `pr-watch` montre la CI en temps réel : jobs, étapes et durées, GitHub et GitLab (note du
  2026-11-07) — `docs/intentions/pr-watch-en-temps-reel.md`.

- [ ] [décision] (0.13.0) La CI rapide éprouvée en réel (mesure d'une PR de doc, preuve de CI de la branche
  principale sur une vraie fusion, reprise GitLab par `CI_JOB_TOKEN`) et la preuve de CI de la
  branche principale hors GitHub — `docs/intentions/ci-rapide-epreuves-reelles.md`.
- [ ] [décision] (0.13.0) La fusion automatique ordonnée (`merge-auto`) éprouvée sur une
  vraie PR en retard sur la branche principale —
  `docs/intentions/merge-auto-eprouve-en-reel.md`.
- [ ] [décision] [P3] `start` vers un worktree prouvé dans un vrai terminal, pas
  un terminal simulé (`QUA-248`) — `docs/intentions/start-worktree-en-vrai-terminal.md`.
- [ ] [décision] [P3] Le contrôle des await de premier niveau : `import()` calculés
  et points d'entrée encore lancés par un await (`QUA-249`) —
  `docs/intentions/await-premier-niveau-suites.md`.
- [ ] [décision] [P1] (0.12.0) Une identité forte pour l'attestation (commits
  signés, revue GitHub authentifiée), les niveaux de garantie étant documentés
  (`QUA-197`) ; montée de P3 en P1 le 2026-11-09 : l'analyse externe y voit la
  faiblesse principale (une attestation se fabrique) —
  `docs/intentions/e2e-et-attestation-precises.md`.
- [ ] [décision] [P1] (0.12.0) Les sondages posés sous Copilot CLI (`drwil-start`, `drwil-scope`, attestation) sont lus par le hook :
  réponse sans effet constatée les 2026-11-08 et 2026-11-09, cause à reproduire (notes regroupées le 2026-11-09) —
  `docs/intentions/sondages-lus-sous-copilot-cli.md`.
- [ ] [décision] [P1] (0.12.0) Un contrôle exigé sauté (job de la forge, branche principale déjà prouvée) se dit
  « non exécuté » au lieu d'être rapporté réussi (analyse externe du 2026-11-09) —
  `docs/intentions/controles-sautes-dits-non-executes.md`.
- [ ] [décision] [P2] (0.14.0) Des tests de mutation sur les contrats de sécurité et d'attestation, et la relecture
  humaine exigée en nombre sur la forge (analyse externe du 2026-11-09) —
  `docs/intentions/tests-de-mutation-et-relecture-exigee.md`.
- [ ] [décision] [P1] Suivre la durée de la CI et le contexte relu, et trancher
  leurs calibrages (dont l'avertissement `[ia-first-warning]` et un `verify`
  en FAIL sans contrat en échec, repris le 2026-10-26) —
  `docs/intentions/suivi-ci-et-contexte.md`.
- [ ] [décision] (0.13.0) La lecture de la CI d'une MR GitLab (QUA-262) et la CI GitLab du
  gabarit (QUA-263), éprouvées en réel —
  `docs/intentions/gitlab-ci-de-la-mr-essai-reel.md`.
- [ ] [décision] (0.12.0) Sortir de CLOSING refusé en dur sans CI verte sur les contrôles
  confiés à la CI (QUA-262) — `docs/intentions/cloture-refusee-sans-ci-verte.md`.
- [ ] [décision] (0.12.0) Aligner QUA-196 et la couverture du diff sur les contrôles
  confiés à la CI — `docs/intentions/contrats-a-aligner-apres-controles-en-ci.md`.
- [ ] [décision] (0.12.0) Comprendre l'échec intermittent de la couverture des hooks
  (QUA-004) vu deux fois sous charge parallèle, jamais reproduit seul —
  `docs/intentions/couverture-hooks-intermittente.md`.
- [ ] [décision] (0.11.2) Surveiller qu'un contrôle ne lit que ses `paths` (reprise
  par contrôle, QUA-141) —
  `docs/intentions/reprise-par-controle-limites.md`.
- [ ] [décision] (0.12.0) Les tests qui laissent des fichiers dans leur dossier
  temporaire se corrigent à la source (31 contrôles nommés par
  `run-checks` le 2026-10-25) —
  `docs/intentions/tests-qui-laissent-des-fichiers-temporaires.md`.
- [ ] [décision] [P3] (0.14.0) La couverture à 100 %, le paquet et tout code modifié :
  une seule cible à trancher avec la fiche ci-dessus (release testée par
  mock, tranché le 2026-10-16) — `docs/intentions/couverture-paquet-100.md`.
- [ ] [décision] [P3] (0.13.0) Lancer un contrôle lent au commit seulement si le chantier
  touche un chemin critique — `docs/intentions/controle-lent-chemin-critique.md`.

### Protection, garanties, contournements

- [ ] [décision] [P1] (0.12.0, 2) Le premier commit du kit est refusé en SCOPING sous la
  barrière bloquante, et la recette d'adoption ne le dit pas —
  `docs/intentions/premier-commit-du-kit-sous-barriere-bloquante.md`.
- [ ] [décision] [P2] (0.12.0, 5) Le contrôle `taille-kit` déclaré à l'installation compte comme
  contrôle du projet et masque l'alerte « aucun contrôle du projet déclaré »,
  même en CI chez un projet neuf —
  `docs/intentions/controle-du-kit-masque-l-alerte-sans-controle.md`.
- [ ] [décision] [P2] (0.12.0, 6) Les garanties obligatoires, la suite (`doctor` sur le dépôt
  drwil compris), à cadrer avec ou juste après la fiche du niveau de
  protection — `docs/intentions/garanties-la-suite.md`.
- [ ] [décision] [P1] (0.12.0) Les contournements encore ouverts : juger l'effet, pas
  le texte (garde shell, juge du banc), le clone superficiel,
  l'auto-élargissement du cadrage, les seuils d'un détour —
  `docs/intentions/contournements-restants.md`.
- [ ] [décision] [P1] drwil_com, priorité 3 : vérifier la barrière de
  fusion (protection absente, mal configurée, conforme) — section « Retour
  de drwil_com » de `docs/intentions/forge-dans-le-livrable.md`.

### Adoption, installation, documentation

- [ ] [décision] [P1] (0.11.1) Un `init` intelligent : une seule commande qui monte un projet d'une version
  à la suivante, ne rétrograde rien, conserve les données du projet et se commite sur la branche kit ;
  absorbe les trois intentions ci-dessous marquées « absorbée » ; constaté sur drwil_walk le 2026-11-08 ;
  deux chantiers réalisés, relatés dans `docs/projects/journal.md` (refus de version et CI du projet ; fichiers
  modifiés et retrait de `resolve-drift`) —
  `docs/intentions/montee-de-version-sure.md`.
- [ ] [décision] [P1] (0.13.0) Un parcours d'installation et de chantier sans demande
  d'autorisation à chaque commande : reste le réexamen du « ask » sur
  `git push`, `merge` et `rebase` (demande du 2026-10-25) —
  `docs/intentions/installation-fluide.md`.
- [ ] [décision] (0.13.0) Modifier ou retirer un contrat par commande, geste humain
  (limite du chantier commande-de-contrat, 2026-11-05) —
  `docs/intentions/modifier-ou-retirer-un-contrat.md`.
- [ ] [décision] (0.13.0) L'adoption et `init` sur un projet réel : code existant,
  couche d'un dossier apparu après l'installation, dépôt git existant avant
  `init` — `docs/intentions/adoption-et-init.md`.
- [ ] [décision] (0.13.0) Une documentation qui reste juste : renvois, citations,
  index, doc visiteur — `docs/intentions/coherence-de-la-doc.md`.
- [ ] [décision] (0.12.0) Un écart déclaré entre le gabarit et sa copie ne couvre que
  ce qu'il déclare (`miroirs-gabarit`) —
  `docs/intentions/miroirs-ecart-declare-trop-large.md`.
- [ ] [décision] (0.13.0) La détection de stack reconnaît plus de technologies (C/C++,
  Swift, Elixir…) et signale une stack vide (constaté sur drwil_dbox le
  2026-10-26) — `docs/intentions/detection-de-stack-elargie.md`.
- [ ] [décision] [P3] Aider l'adoptant à alléger ses fichiers (outil de
  découpe, fiches d'allègement à l'adoption) — demande du 2026-10-27, après
  la 0.10.0 — `docs/intentions/alleger-les-fichiers-de-l-adoptant.md`.

### Release

- [ ] [décision] [P3] `docs/recettes/README.md` dit encore que la note « sans
  verdict » arrive par la PR, alors qu'en `solo` elle est le corps de la
  release — `docs/intentions/recettes-readme-note-sans-verdict.md`.
- [ ] [décision] [P3] (0.12.0) Déclarer les copies `.githooks/` du module de release
  dans `scopeMirrors` — `docs/intentions/copies-create-release-dans-scope-mirrors.md`.

### Clôture, file et chantiers en parallèle

- [ ] [décision] [P2] (0.12.0) Clôture, réouverture et reprise : la barrière de périmètre nomme chaque fichier refusé, la
  réouverture rend l'intention retirée, `resume` et les faux positifs de la barrière de réouverture (4 notes
  regroupées le 2026-11-09) — `docs/intentions/cloture-reouverture-et-reprise-defauts.md`.

- [ ] [décision] (0.13.0) Clôture, réouverture et attestations : cadrée en cinq fiches
  le 2026-10-26 ; reste la note « un lancement intercalé efface la file » —
  `docs/intentions/cloture-et-attestations.md`.
- [ ] [décision] (0.13.0) Se repositionner après une clôture : nettoyer le worktree et
  les branches, revenir sur `master`, créer la branche de cadrage —
  `docs/intentions/nettoyage-des-worktrees.md`.
- [ ] [décision] (0.13.0) Conflits d'index et de journal entre chantiers en parallèle —
  `docs/intentions/conflits-de-cloture-entre-worktrees.md`.
- [ ] [décision] (0.13.0) Le sondage parallèle (plusieurs worktrees) vérifié dans
  Copilot CLI ; le sondage à une fiche l'est (2026-10-26) —
  `docs/intentions/sondage-worktree-copilot-cli.md`.
- [ ] [décision] L'enchaînement des lots (un sous-agent neuf par lot) éprouvé sur
  une vraie fiche à lots, consommation mesurée —
  `docs/intentions/essai-reel-lots-en-sous-agents.md`.
- [ ] [décision] [P3] La clôture en un geste reconnaît une fiche permanente
  (reportée le 2026-11-05 : une fiche jetable par montée de version, close par
  `node .githooks/close.mjs` ; à reprendre si un projet adoptant en a besoin) —
  `docs/intentions/cloture-fiche-permanente.md`.
- [ ] [décision] (0.12.0) Le commentaire de `merge_cancelled` dans `.githooks/state-validate.mjs` dit encore
  l'ancienne règle de QUA-181 —
  `docs/intentions/commentaire-merge-cancelled-a-jour.md`.
- [ ] [décision] (0.12.0) Le hook qui ajoute `Drwil-Brief` fait, sur un message vide, un commit dont le
  trailer est le sujet — `docs/intentions/trailer-sur-message-vide.md`.

### Fluidité et relecture

- [ ] [décision] [P1] (0.13.0) Fluidité sans perte de rigueur : restent le
  regroupement (PR, attestations) et qui décide chaque transition (agent ou
  humain), déclaré et affiché (v1:CTR-015, v1:GOV-002) —
  `docs/intentions/fluidite-sans-perte-de-rigueur.md`.
- [ ] [décision] [P1] (0.13.0) Vue de relecture et relecture avant fusion, choisie
  au lancement : montrer à l'humain ce qui demande son jugement dans une PR
  (décisions, cadrage, règles, preuves, exceptions), et une question de plus
  dans le sondage (`drwil-review`), cadrées ensemble avec la protection de
  master — `docs/intentions/vue-de-relecture.md`.
- [ ] [décision] (0.13.0) Un accueil drwil court à l'ouverture d'une session (où en
  est le projet, commandes utiles ; l'essentiel seulement, le détail à la
  demande ; demande du 2026-10-27) —
  `docs/intentions/accueil-drwil-a-l-ouverture.md`.

### Coût en tokens

- [ ] [décision] (0.14.0) La consommation de tokens mesurée aussi pour les autres
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

- [ ] [décision] (0.13.0) Suites de l'attente outillée des commandes longues : Windows, garde de commande, double lancement simultané —
  `docs/intentions/attente-commandes-longues-suites.md`.
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

- [ ] [décision] (0.14.0) `verify` ne donne jamais PASS dans la copie du banc :
  contrats à attester, humain absent (limite du chantier « Mini-banc :
  copie « avec » adoptée » du 2026-10-23) —
  `docs/intentions/banc-verify-jamais-pass.md`.
- [ ] [décision] [P2] (0.12.0) Campagne du mini-banc : essai réel en CI avec
  l'abonnement, puis 12 passages et leur rapport ; critères de décision écrits le 2026-11-09 (re-datation du protocole et de son test, au chantier) —
  `docs/intentions/campagne-mini-banc.md`.
- [ ] [décision] [P2] Fabrique autonome graduée par le risque (outillage,
  mutation, rôles séparés, une session par fiche, auto-fusion LOW),
  cadrée sur les chiffres du mini-banc et de la consommation —
  `docs/intentions/fabrique-autonome.md`.
- [ ] [décision] [P3] Banc complet avec / sans drwil (5 tâches), décidé
  sur les chiffres du mini-banc — `docs/intentions/bench-avec-sans-drwil.md`.

### Produit, quand tout est opérationnel

- [ ] [décision] [P2] (0.14.0) Publication npm du kit, avec une porte avant
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
de `docs/projects/journal.md`) ; non-régression continue ;
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
4. `retour-scoping-branche-sondage` (ex-`next-attend-la-fusion`) ; 5. `reouverture-dite-et-eprouvee` ;
6. `test-unitaire-fusion-automatique` (il teste un texte que les
précédentes modifient). `niveau-de-protection` touche un autre code et
peut s'intercaler ; `release-feu-vert-et-squash` attendait la release allégée,
livrée le 2026-10-30 (journal), qui l'a gardée.

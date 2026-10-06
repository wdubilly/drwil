# Projet : drwil V0.2 — gouvernance exécutable

**Risque** : HIGH

**Statut** : cadré le 2026-10-05 — tous les lots [IA] livrés sur la branche (DRWIL-001 à 005, 010 à 013, 020, 021, 031 ; protocole de DRWIL-022), en attente de fusion ; restent DRWIL-022 (mesures, humain) et DRWIL-030 (décision).

<!-- cadrage
fichiers:
  - packages/drwil/bin/drwil.js
  - packages/drwil/src/index.ts
  - .githooks/run-checks.mjs
  - .githooks/contrats.mjs
  - packages/drwil/templates/common/base/.githooks/contrats.mjs
  - .githooks/moteur.mjs
  - packages/drwil/templates/common/base/.githooks/moteur.mjs
  - packages/drwil/src/verify.ts
  - packages/drwil/src/doctor.ts
  - packages/drwil/src/attest.ts
  - .githooks/risque.mjs
  - packages/drwil/templates/common/base/.githooks/risque.mjs
  - packages/drwil/bin/drwil.js
  - packages/drwil/test/kit.test.mjs
  - packages/drwil/templates/common/base/.githooks/run-checks.mjs
-->

(bloc `cadrage` provisoire : CLI, générateur et moteur de contrôles, seuls
fichiers de code dont on sait déjà qu'ils seront touchés. Il n'est pas
rempli par anticipation : chaque lot y ajoute les fichiers qu'il touche
réellement, avec ses tests.)

## 1. Besoin

Faire évoluer drwil d'un kit de gouvernance pour agents IA vers un système
où les règles importantes d'un projet sont **déclarées, vérifiables et
exécutables**. Proposition de valeur : *drwil makes AI coding rules
executable* — un agent lit les règles, drwil vérifie mécaniquement qu'elles
sont respectées.

Boucle centrale : `RULE → PROOF → VERIFY → PASS / FAIL`, étendue en
`DECLARE → PROVE → VERIFY → ENFORCE → EVIDENCE`. L'objectif n'est pas
d'ajouter des fonctionnalités mais de rendre le cœur existant plus simple,
observable et automatisable.

Résultat attendu : sur un projet neuf, `npx drwil apply` puis
`drwil verify` donne l'état de la gouvernance (contrats, contexte IA, CI ;
`GOVERNANCE: PASS/FAIL`), aussi en JSON (`drwil verify --json`).

Principes :
- **P1** — `AGENTS.md` dit *comment travailler* ; les contrats disent *ce
  qui doit être vrai* ; `verify` dit *si c'est vrai*.
- **P2** — une affirmation importante a une preuve exécutée.
- **P3** — l'enforcement est mécanique, indépendant de l'agent.
- **P4** — la cérémonie est proportionnelle au risque.

Décision structurante : ne pas faire de drwil un recueil de toutes les
bonnes pratiques pour agents, mais un système qui transforme les règles
importantes d'un projet en propriétés vérifiables.

## 2. Hors périmètre

Dashboard complet, serveur distant, SaaS, permissions complexes,
orchestration autonome d'agents, remplacement des outils CI, marketplace de
contrats, support d'un grand nombre de nouveaux agents. Possibles après la
V0.2. Aucun fichier de contrat secondaire (ADR-001).

## 3. Contraintes

- Existant à réutiliser, pas à dupliquer : `docs/contrats.md` porte déjà un
  champ « Preuve » par contrat ; `.githooks/run-checks.mjs` exécute déjà
  les preuves (socle + `.drwil/ia-first.json` → `checks`) avec trois
  issues (échec / OK / non exécuté, QUA-013) ; la CLI a `init`, `apply`,
  `uninstall`, `resoudre-derive` (`packages/drwil/bin/drwil.js`).
- QUA-018 : chaque lot dit s'il vise le dépôt, le livrable, ou les deux.
- QUA-019 : `verify` ne doit offrir aucun moyen de sauter un contrat
  bloquant sans que ça se voie.
- SEC-007 : une évidence (DRWIL-013) ne doit jamais contenir de secret.
- Aucune opération destructive silencieuse (`apply` reste non destructif).
- Contrats faciles à modifier par un humain (retour extérieur du
  2026-10-05) : motive ADR-001.

## 4. Décisions

- 2026-10-05 : backlog V0.2 posé par le demandeur. [décision utilisateur]
- 2026-10-05 : codes de sortie de `verify` limités à 0/1/2, `MANUAL`
  renvoie 1 et le JSON le distingue de FAIL ; pas de severity en P0 (tout
  contrat bloquant). [décision utilisateur]
- 2026-10-05 — **Preuve d'un contrat (DRWIL-001)** : le champ
  `**Contrôle**` référence un identifiant de contrôle connu du moteur (la
  commande reste à un seul endroit, ADR-003) ; un identifiant inconnu est
  une erreur de configuration (ERROR), jamais un contrat vérifié. La partie
  humaine se déclare dans `**Manuel**`. [décision utilisateur]
- 2026-10-05 — **Verdict (DRWIL-003)** : identifiant `secrets-fichiers`
  conservé (pas de renommage en `secrets`) ; priorité FAIL > ERROR > MANUAL
  > PASS ; **Raison** reste informative, non obligatoire en P0 (seules une
  exigence et une preuve déclarée le sont) ; `verify` est le gate : seul
  PASS valide un travail, MANUAL n'est jamais une réussite différée ;
  aucune intégration agent, hook ou CI dans ce lot. [décision utilisateur]
- 2026-10-06 — **ADR-005 — Attestation humaine (DRWIL-013, suite)** :
  demandée par le demandeur ; conception choisie par l'agent, à valider.
  `drwil attest <ID>` atteste la partie humaine d'un contrat MANUAL dont la
  partie automatisée réussit (jamais PASS, FAIL, ERROR ou non applicable).
  Confirmation : terminal interactif et saisie de l'identifiant, aucun
  `--yes` (un agent ou un script ne peut pas attester). Stockage :
  .drwil/evidence/attestations, **versionné** (le reste de
  .drwil/evidence est hors git) pour être relu en revue et vu par la CI.
  Validité : empreinte SHA-256 du texte de la section du contrat et de la
  définition des contrôles cités (`run`, `cwd`) ; si l'un change,
  l'attestation est obsolète. Le commit est enregistré pour la traçabilité,
  pas comme critère de validité : modifier le code sous le périmètre du
  contrat ne périme pas l'attestation (limite assumée). Acteur : `git config
  user.name`, marqué déclaratif ; pas d'e-mail. Note caviardée, 500
  caractères max. Statut `ATTESTED` distinct de `PASS`, satisfait le
  contrat ; verdict global `PASS` (exit 0) avec le nombre d'obligations
  attestées affiché ; seules les attestations de contrats bloquants pèsent.
  JSON v1 étendu sans rupture (`contracts.attested`, `results[].status`
  `attested`, `results[].attestable`, `results[].attestation`).
- 2026-10-05 — **Format (DRWIL-001/002)** : le gabarit passe au format
  sections (`## ID — titre` + champs), comme le dépôt ; le lecteur reste
  compatible avec les contrats en tableau ; un contrat historique sans
  `Contrôle` est `MANUAL`, un `Contrôle` déclaré mais inconnu est une
  erreur de configuration. [décision utilisateur]
- 2026-10-05 — **ADR-001 — Stockage des contrats** : pour la V0.2,
  `docs/contrats.md` reste la source canonique des contrats. Les
  métadonnées nécessaires à `drwil verify` sont exprimées sous forme de
  champs structurés minimaux. Aucun fichier de contrat secondaire n'est
  introduit. Décision réévaluable si les besoins de structuration dépassent
  les capacités raisonnables du Markdown. [décision utilisateur]
- 2026-10-05 — **ADR-002 — Contrats partiellement vérifiables par un
  humain** : un contrat dont la preuve est partiellement automatisable
  reste un contrat. `drwil verify` l'affiche avec le statut `MANUAL`. Les
  assertions automatisables sont exécutées et leurs résultats affichés
  séparément. Un contrat `MANUAL` n'est jamais compté comme PASS mécanique.
  Un état global PASS n'est obtenu que lorsque tous les contrats bloquants
  sont entièrement vérifiés. À inscrire explicitement dans le contrat de
  comportement de `verify` (DRWIL-003). [décision utilisateur]
- 2026-10-05 — **ADR-003 — Moteur de vérification partagé** : `drwil
  verify` et les hooks git utilisent le même moteur de contrôles. Les hooks
  restent autonomes et ne dépendent pas de l'installation de drwil.
  `.githooks/run-checks.mjs` demeure un adaptateur git ; il ne constitue pas une
  seconde implémentation de la gouvernance. [décision utilisateur]
- 2026-10-05 — **ADR-004 — Niveaux de risque et traçabilité** : LOW ne
  dispense pas de traçabilité. Les travaux LOW sont rattachés à
  `docs/projets/entretien-courant.md` et ne nécessitent pas de fiche de
  chantier dédiée. MEDIUM et HIGH imposent un niveau de cadrage supérieur.
  QUA-016 reste applicable à tous les travaux ; le niveau de risque
  détermine la cérémonie requise. [décision utilisateur]

## 5. Points à trancher

- [décision] **Publication npm (DRWIL-030)** : recouvre l'intention
  `docs/intentions/packager-kit-ia-first.md`, en attente, dont l'audit du
  2026-10-04 constate que le paquet ne fonctionne pas en l'état. Fusionner
  les deux, et garder l'ordre « après P0/P1 » ? (pas bloquant avant P3)
- [décision] **Benchmark (DRWIL-022)** : réutiliser `.drwil/usage.jsonl`
  (`docs/recettes/suivre-consommation-par-lot.md`) pour les tokens ? (pas
  bloquant avant P2)

## 6. Lots

Ordre recommandé : 001 → 002 → 003 → 004 → 005 → 010 → 011 → 012 → 013 →
020/021 → 022 → 030. Critère de sortie de chaque lot : ses critères
d'acceptation, couverts par des tests. Chaque lot vise le dépôt et le
gabarit, sauf mention contraire (QUA-018).

### P0 — Contrat → preuve → vérification

- **DRWIL-001 — Modèle de contrat** [IA] : champs structurés minimaux dans
  `docs/contrats.md` (ADR-001), en plus des champs existants (Règle,
  Périmètre, Source de vérité, Preuve, Raison) : **Contrôle** (identifiant(s)
  de contrôle du moteur), **Manuel** (partie humaine), **Scope** seulement
  si un besoin réel apparaît. Pas de severity en
  P0 : tout contrat est bloquant (DRWIL-020 ajoutera `warning` et
  `advisory`). Validation, erreurs explicites. Le lot reste petit : des
  champs, pas un mini-langage en Markdown. Contenu : module de lecture et
  de validation sans dépendance (`.githooks/contrats.mjs`), ses tests,
  champs posés sur les contrats du dépôt, `id` des contrôles du projet
  (`.drwil/ia-first.json` → `checks`). Le branchement dans
  `.githooks/check-docs.mjs` et le passage du gabarit aux sections relèvent
  de DRWIL-002.
- **DRWIL-002 — Lecture du registre** [IA] : extraction des contrats
  depuis `docs/contrats.md` (aucun dossier de contrats séparé, ADR-001) ;
  validation, détection des doublons et des contrats mal formés,
  compatibilité avec les contrats existants et avec `.githooks/check-docs.mjs`
  (QUA-011).
- **DRWIL-003 — `drwil verify`, gate de validation du travail** [IA] :
  pas un simple audit — un travail n'est vérifié par drwil que si `verify`
  rend PASS ; FAIL : à corriger ; MANUAL : pas encore validé, jamais une
  réussite différée ; ERROR : verdict non établi. Le lot fournit la
  primitive ; l'enforcement dans le workflow agent viendra ensuite. Chaîne intention (**Raison**) → exigence
  (**Règle**) → contrôle → preuve → verdict. Indépendant de tout agent
  (aucune intégration spécifique dans ce lot). Moteur unique (ADR-003) :
  `.githooks/moteur.mjs`, utilisé par `.githooks/run-checks.mjs` (adaptateur
  git) et par `verify`, qui charge la copie installée dans le projet ; les
  hooks ne dépendent jamais de drwil. Statuts : PASS, FAIL, ERROR (contrôle
  inconnu, exigence ou preuve absente, outil indisponible), `MANUAL`
  (ADR-002 : jamais compté comme PASS ; partie automatisée affichée à
  part ; contrat historique sans contrôle). Tout contrat est bloquant.
  Priorité déterministe (contrat et verdict global) : FAIL > ERROR >
  MANUAL > PASS, fixée par un test.
  Codes de sortie : **0** `GOVERNANCE: PASS` ; **1** `GOVERNANCE: FAIL` ou
  `MANUAL REVIEW REQUIRED` ; **2** `VERIFY ERROR`. Le JSON (DRWIL-004)
  distinguera FAIL et MANUAL.
- **DRWIL-004 — `verify --json`** [IA] : format stable, aucune sortie
  humaine parasite, mêmes codes de sortie, exploitable par script.
- **DRWIL-005 — Pas de divergence silencieuse** [IA] : `docs/contrats.md`
  reste canonique (ADR-001) ; la vue générée prévue initialement est
  abandonnée. Ce lot devient : un champ structuré mal formé ou un contrat
  sans preuve déclarée est signalé par `verify` et par `.githooks/check-docs.mjs`.

### P1 — Diagnostic et adoption

- **DRWIL-010 — `drwil doctor`** [IA] : installation, manifest,
  `AGENTS.md`, intégrations IA, contrats, preuves, hooks git, CI, outils
  requis ; `doctor --json`.
- **DRWIL-011 — `apply` = audit + installation** [IA] : détection des
  outils et protections existants, aperçu des changements avant écriture,
  aucune écriture destructive, compatible avec le mécanisme d'empreinte
  existant.
- **DRWIL-012 — Niveaux de risque** [IA] : LOW, MEDIUM, HIGH selon
  ADR-004 (LOW rattaché à `docs/projets/entretien-courant.md`, QUA-016
  toujours actif ; MEDIUM et HIGH : cadrage croissant, HIGH avec fiche,
  décisions, contrats concernés, preuves) ; niveau explicite ou détectable,
  forçable vers le haut ; doc claire.
- **DRWIL-013 — Évidences** [IA] : `RULE → PROOF → EVIDENCE` ; sortie,
  statut, horodatage, commit si disponible, résumé lisible, aucune fuite de
  secret (SEC-007).

### P2 — Passage à l'échelle

- **DRWIL-020 — Severity** [IA] : ajoute `warning` et `advisory` aux
  contrats, tous bloquants jusque-là ; statut global différencié.
- **DRWIL-021 — API CLI JSON cohérente** [IA] : `--json` au minimum sur
  `verify`, `doctor`, `contracts`.
- **DRWIL-022 — Benchmark avec/sans drwil** [IA|humain] : tokens,
  itérations, temps, corrections humaines, régressions, reprises après
  interruption, erreurs détectées ; reproductible, mesuré honnêtement (ne
  pas chercher un chiffre favorable).

### P3 — Distribution

- **DRWIL-030 — Publication npm** [décision] : seulement après P0/P1 ;
  `npx drwil apply` fonctionne sur un dépôt externe sans préparation (voir
  section 5).
- **DRWIL-031 — Exemple public de référence** [IA] : petit projet avec
  `AGENTS.md`, `docs/contrats.md` structuré, CI, hooks ; comprendre drwil
  en moins de 5 minutes.

### Définition de fini (V0.2)

`drwil verify` existe ; contrats structurés dans `docs/contrats.md` ;
chaque contrat possède une preuve déclarée ; `verify` exécute sa partie
automatisable et produit PASS, FAIL, ERROR ou `MANUAL` selon ce qui peut
effectivement être établi (ADR-002) ;
codes de sortie fiables ; `--json` disponible ; `drwil doctor` existe ;
`apply` fonctionne comme audit + installation ; aucune opération
destructive silencieuse ; tests couvrant les nouveaux comportements ; doc
expliquant `RULE → PROOF → VERIFY` ; projet neuf initialisable facilement ;
projet existant adoptable sans migration douloureuse ; benchmark initial
réalisé.

## 7. Reprise

- **Dernier état** (2026-10-05) : DRWIL-001 et DRWIL-003 livrés sur la
  branche. DRWIL-001 : `.githooks/contrats.mjs` (lecture sections +
  tableau ; validation : doublon, contrôle inconnu, Contrôle vide, Règle ou
  preuve absente), champs posés sur les 11 contrats du dépôt. DRWIL-003 :
  moteur extrait dans `.githooks/moteur.mjs` (run-checks.mjs devient
  l'adaptateur git, sortie inchangée), `drwil verify` (`packages/drwil/src/verify.ts`,
  commande CLI), tests PASS/FAIL/MANUAL/ERROR (dont outil indisponible →
  ERROR, non applicable → MANUAL, exit 1 via la CLI, priorité), doc (`docs/ia-first.md` du
  gabarit, section 5 ; README du paquet). `verify` analyse tout
  l'historique pour les secrets (option `complet` du moteur), sinon SEC-007
  serait « prouvé » sans rien regarder. Écarts révélés : SEC-006 sans audit
  déclaré ; QUA-016 passe en « avertissement » malgré des fichiers hors
  cadrage ; `controles-autotest` n'est cité par aucun contrat.
  DRWIL-002/005 (2026-10-05, en autonomie) : `.githooks/check-docs.mjs`
  valide les contrats avec le même lecteur que `verify` (contrôle inconnu,
  Règle ou preuve absente refusés au commit) ; registre du gabarit (fr/en)
  passé au format sections avec Contrôle/Manuel ; recette d'adoption
  alignée.
  DRWIL-004/010/021 (2026-10-06, en autonomie) : `verify --json` (format
  stable version 1, mêmes codes de sortie, sortie brute des contrôles
  exclue), `drwil doctor [--json]` (diagnostic sans exécution : config,
  manifeste, AGENTS.md, intégrations, registre, preuves, hooks, CI, outils ;
  0 sain / 1 problème / 2 pas un projet drwil), `drwil contracts [--json]`.
  Sur ce dépôt, doctor relève : manifeste absent, aucun outil IA déclaré.
  DRWIL-011 (2026-10-06, en autonomie) : `apply` audite le dépôt (stack,
  outils IA présents, protections existantes) et affiche l'aperçu exact des
  fichiers ajoutés et conservés avant d'écrire ; `apply --dry-run` s'arrête
  à l'aperçu. L'aperçu passe par le même chemin que l'installation (mode
  simulation de `writeOut`) : il ne peut pas diverger. `apply` reste non
  interactif (pas de confirmation demandée, pour les scripts et la CI).
  DRWIL-012 (2026-10-06, en autonomie) : `.githooks/risque.mjs`, branché
  dans `.githooks/check-docs.mjs`. Champ `**Risque** : LOW|MEDIUM|HIGH` dans la
  fiche ; un cadrage qui touche `.githooks/`, la CI ou `.drwil/` impose HIGH
  (forçable vers le haut seulement) ; HIGH exige Décisions + contrat cité ;
  sans champ, simple avertissement (compatibilité). Fiche de mécanique du
  kit exclue (livrée partout, pas un chantier). Modèle de fiche et
  `docs/ia-first.md` du gabarit (section 7) documentés. Sur ce dépôt, 3
  fiches historiques reçoivent l'avertissement : à compléter à leur
  prochaine reprise, pas réécrites en silence.
  DRWIL-013 (2026-10-06, en autonomie) : `drwil verify --evidence` écrit
  `.drwil/evidence/verify-<horodatage>.json` (hors git) : verdict,
  horodatage, commit et arbre modifié ou non, résumé par contrôle (5
  dernières lignes de sortie, caviardées : clés AWS, jetons GitHub/OpenAI/
  Slack, clés privées, `password=…`, chaînes longues). Pas de validation
  humaine enregistrable : un MANUAL reste MANUAL (ADR-002) ; à décider
  séparément si on veut une attestation humaine.
  DRWIL-020 (2026-10-06, en autonomie) : champ `**Sévérité**` facultatif
  (`bloquant` par défaut, `avertissement`, `indicatif` ; synonymes anglais) ;
  seuls les bloquants décident du gate, les autres sont exécutés et
  affichés ; un registre mal formé reste ERROR quelle que soit la sévérité ;
  JSON `bySeverity`. Choix fait seul : un `avertissement` en FAIL ne change
  pas le code de sortie (sinon il serait bloquant).
  DRWIL-031 (2026-10-06, en autonomie) : exemple en 5 minutes dans le README
  du paquet (init → contrôle déclaré → contrat → travail → verify PASS du
  contrat → casser → FAIL), rejoué tel quel par un test : il ne peut pas
  vieillir en silence. Ce test a révélé un faux PASS antérieur à la V0.2 :
  sous un `node --test` parent, un contrôle de projet `node --test` était
  sauté en silence (NODE_TEST_CONTEXT hérité) ; corrigé dans le moteur pour
  tous les contrôles.
  DRWIL-022 (2026-10-06) : protocole posé (`docs/benchmark-protocole.md`),
  aucune mesure : l'exécution demande de vraies sessions d'agent observées.
  Bilan de la définition de fini : verify, contrats structurés, preuve
  déclarée par contrat, codes de sortie, `--json`, doctor, apply audit +
  installation, aucune opération destructive silencieuse, tests, doc
  RULE → PROOF → VERIFY, projet neuf (exemple testé), projet existant
  (apply non destructif + registre tableau toujours lu) : faits ; benchmark
  initial : **non réalisé** (protocole seulement).
  DRWIL-013 suite (2026-10-06) : `drwil attest` et statut ATTESTED (voir
  ADR-005) ; tests : MANUAL → ATTESTED, verify après attestation, refus,
  contrat inconnu, obsolescence (contrat ou preuve modifiés), contrat PASS,
  sévérités, attestations multiples, contournements (CLI sans terminal,
  attestation forgée, échec postérieur, non applicable), données sensibles.
- **Travail non commité** : DRWIL-003.
- **Prochaine étape** : [humain] relire et fusionner la PR #34 ; [humain] exécuter le protocole de benchmark ; [décision] DRWIL-030 (publication npm, recoupe `docs/intentions/packager-kit-ia-first.md`) et attestation humaine des contrats MANUAL (sinon aucun dépôt ne peut atteindre PASS).

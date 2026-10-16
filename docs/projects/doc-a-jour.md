# Projet : une documentation à jour pour la 0.6.0, et qui le reste

**Statut** : cadré le 2026-10-16.
**Risque** : HIGH
**Maturité** : prêt

<!-- scope
files:
  - packages/drwil/CHANGELOG.md
  - packages/drwil/README.md
  - packages/drwil/templates/common/base/INSTALL.md
  - packages/drwil/templates/common/base/docs/recipes/adopt-the-kit.md
  - packages/drwil/templates/common/base/docs/recipes/working-with-branches.md
  - packages/drwil/templates/common/base/docs/recipes/create-a-release.md
  - packages/drwil/templates/common/base/.githooks/state-texts.mjs
  - packages/drwil/templates/common/base/.githooks/check-architecture.mjs
  - packages/drwil/templates/common/base/.githooks/engine.mjs
  - packages/drwil/templates/common/base/.githooks/contracts.mjs
  - packages/drwil/templates/common/base/docs/contracts.md
  - packages/drwil/templates/common/base/docs/projects/kit-mechanics.md
  - packages/drwil/templates/common/base/docs/ia-first.md
  - packages/drwil/templates/common/base/AGENTS.md
  - README.md
  - INSTALL.md
  - docs/architecture.md
  - docs/recipes/adopt-the-kit.md
  - docs/recipes/working-with-branches.md
  - docs/recipes/create-a-release.md
  - .githooks/check-architecture.test.mjs
  - .githooks/engine.test.mjs
  - .githooks/contracts.test.mjs
  - .githooks/run-checks.test.mjs
  - .githooks/state.test.mjs
  - packages/drwil/test/kit.test.mjs
  - AGENTS.md
  - docs/contracts.md
  - .drwil/ia-first.json
-->

(cadrage : la documentation du livrable (paquet, gabarit) et du dépôt, le
rappel de clôture, et le contrôle de la carte livré dans le moteur, avec
ce qu'un nouveau contrôle du moteur entraîne : socle des contrôles connus,
registre livré, fiche mécanique, projet de test de `run-checks` ; les copies du gabarit sont couvertes par `scopeMirrors`
(QUA-035), les copies avec écart citées à part.)

## 1. Besoin

Demandé le 2026-10-16, avant la release 0.6.0 et le premier essai sur un
vrai projet. Toute la documentation qu'un nouvel utilisateur lit date du
2026-10-13 au plus tard, alors qu'une quinzaine de chantiers ont changé le
livrable depuis :

- le changelog du paquet (`packages/drwil/CHANGELOG.md`, livré dans le
  tarball) s'arrête à la 0.5.1 ;
- les README (dépôt, 1 124 lignes ; paquet, 661 lignes) ne parlent ni des
  critères obligatoires, ni du bilan des règles métier, ni de l'attestation
  version 2, ni du cadrage complet ;
- la carte (`docs/architecture.md`, datée du 2026-10-11) ignore
  `packages/drwil/src/criteria.ts`, `packages/drwil/src/rules.ts`,
  `packages/drwil/src/evidence.ts`, `.githooks/check-contract-tests.mjs`,
  `outils/verifier-tests-contrats.mjs` ;
- `INSTALL.md` et la recette d'adoption sont les premières pages suivies
  par un nouvel utilisateur.

Aucune règle ne les tenait à jour : la règle écrite d'`AGENTS.md` (« doc
mise à jour dans le même commit ») n'a pas suffi.

## Critères d'acceptation

(contrats créés par ce chantier, avec leur champ Origine : QUA-040, outillé ; QUA-041, à part humaine.)

- Livré à tout projet : à la clôture d'un chantier qui change ce que voit
  l'utilisateur, son commit de clôture met à jour le README et ajoute sa
  ligne à la section « Unreleased » du changelog, pour un projet qui a ces
  fichiers ; s'il change la structure (dossier ou module, couche, pile), il
  met à jour la carte `docs/architecture.md` (recette et rappel CLOSING) ;
  la release renomme la section en numéro de version (recette de release)
  — `QUA-040`
- Livré à tout projet : drwil entretient la carte du client, fichier du
  projet que `init` ne réécrit jamais ; à l'adoption d'un projet existant,
  `/drwil-adopt` la construit à partir du code réel (dossiers, pile,
  couches) au lieu du squelette de l'installation — `QUA-040`
- Livré à tout projet : un contrôle du moteur signale un dossier de code
  que la carte `docs/architecture.md` ne cite pas, et son message donne la
  ligne à compléter (le chemin ; le rôle reste à écrire par l'agent) ; un réglage exige les
  fichiers plutôt que les dossiers, sur des chemins choisis ; ce dépôt
  l'exige pour `packages/drwil/src/`, `.githooks/` (hors tests) et
  `outils/` (hors tests) — `QUA-040`
- Rattrapage : le changelog couvre tout depuis la 0.5.1 ; les README
  (dépôt et paquet), `INSTALL.md`, la recette d'adoption et la carte
  décrivent le livrable tel qu'il est, en partant du parcours d'un nouvel
  utilisateur (projet neuf ou existant, premier chantier, non-régression
  métier) [humain] — `QUA-041`

## 2. Hors périmètre

- La release 0.6.0 elle-même (tag, tarball, note) : geste qui suit ce
  chantier, par le module de release.
- Un contrôle automatique du README (sa justesse reste humaine) ou du
  changelog (non retenu le 2026-10-16).
- La traduction de la documentation.

## 3. Contraintes

- À réaliser en dernier avant la 0.6.0, après les fiches
  « glossaire des identifiants » et « projet neuf » (journal),
  pour décrire leur résultat ; la règle « Unreleased » s'applique dès
  leurs clôtures (la ligne est ajoutée à la main d'ici là).
- Une information, une source : le README du dépôt et celui du paquet ne
  se répètent pas ; le détail vit dans `docs/`, les README y renvoient.
- Le contrôle de la carte est un contrôle du moteur, comme `contract-tests`
  (QUA-029) : nouvelle exigence, bloquante si `newRequirements` l'impose,
  avertissement sinon ; sans `docs/architecture.md`, non applicable.
- `.githooks/check-docs.mjs` est à 398 lignes (QUA-001) : le contrôle vit
  dans son propre script.
- Contrats à citer : QUA-011 (doc jamais fausse), QUA-018 (dépôt vs
  livrable), QUA-036 (la clôture boucle les intentions, même moment).

## 4. Décisions

Tranchées par le demandeur le 2026-10-16 (sondages) :

- Changelog : section « Unreleased » à chaque clôture ; la release la
  renomme.
- README : mis à jour et resserrés, en partant du parcours d'un nouvel
  utilisateur, sans se répéter.
- Ordre : en dernier, avant la 0.6.0.
- drwil entretient la carte du client (demandeur, 2026-10-16) : à
  l'adoption (construite depuis le code), à chaque clôture qui change la
  structure, et en continu par le contrôle ; le contenu reste écrit par
  l'agent, drwil donne le moment, la liste de ce qui manque et la place.
- Architecture et README sont des fonctionnalités du livrable, pas
  seulement de ce dépôt : contrôle de la carte livré, par dossier par
  défaut et par fichier sur réglage ; README et changelog tenus à la
  clôture (étape et rappel), le cadrage d'un projet neuf écrivant un
  premier README et la carte (journal, « Un projet neuf commence par son
  cadrage global »).
- `INSTALL.md` et la recette d'adoption font partie du rattrapage.

## 5. Points à trancher

Aucun.

## 6. Increments

- **Lot 1 — la règle** [IA] : README, section « Unreleased » et carte à
  la clôture (recette et rappel CLOSING), étape de release ; étape
  d'adoption « construire la carte depuis le code » ; contrôle de la
  carte dans le moteur (script à part, socle des contrôles connus, contrat
  du registre livré, fiche mécanique) ; ce dépôt règle « fichiers » sur
  ses dossiers de code. Critère de sortie : tests (rappel CLOSING en
  français et en anglais ; carte : dossier cité, oublié, réglage
  « fichiers », tests ignorés, carte absente ; bloquant ou avertissement).
- **Lot 2 — le rattrapage** [IA puis humain] : changelog depuis la 0.5.1,
  README, `INSTALL.md`, recette d'adoption, carte ; contrat créé. Critère
  de sortie : contrôles verts ; relecture et attestation humaines de la
  justesse du contenu (`drwil attest`).

## 7. Reprise

- **Dernier état** (2026-10-16) : fiche cadrée ; aucun code écrit.
- **Travail non commité** : aucun.
- **Prochaine étape** : [humain] lancer après les fiches du glossaire et
  du projet neuf (`/drwil-start`).

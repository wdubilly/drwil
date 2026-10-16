# Projet : un identifiant cité à l'humain vient avec ce qu'il désigne

**Statut** : cadré le 2026-10-16.
**Risque** : HIGH
**Maturité** : prêt

<!-- scope
files:
  - packages/drwil/templates/common/base/.githooks/glossary.mjs
  - packages/drwil/templates/common/base/.githooks/run-checks.mjs
  - packages/drwil/templates/common/base/.githooks/check-contract-tests.mjs
  - packages/drwil/templates/common/base/docs/projects/kit-mechanics.md
  - packages/drwil/templates/common/base/AGENTS.md
  - packages/drwil/templates/common/base/docs/ia-first.md
  - packages/drwil/templates/common/tools/claude/.claude/hooks/id-glossary.mjs
  - packages/drwil/templates/common/tools/claude/.claude/settings.json
  - packages/drwil/templates/common/tools/copilot/.github/copilot-instructions.md
  - packages/drwil/templates/common/tools/cursor/.cursor/rules/ia-first.mdc
  - packages/drwil/src/verify.ts
  - packages/drwil/src/verdict.ts
  - packages/drwil/src/agent.ts
  - .githooks/glossary.test.mjs
  - .githooks/run-checks.test.mjs
  - .githooks/check-contract-tests.test.mjs
  - packages/drwil/test/kit.test.mjs
  - packages/drwil/test/cycle.test.mjs
  - AGENTS.md
  - docs/contracts.md
  - .drwil/ia-first.json
-->

(cadrage : les fichiers du gabarit couvrent leurs copies du dépôt par le
réglage `scopeMirrors` (QUA-035) ; un nouveau fichier de `.githooks/` entre
dans le cadrage de la fiche mécanique du kit ; `AGENTS.md` du dépôt est
une copie avec écart, citée à part ; ce dépôt n'installe pas l'outillage
Copilot ni Cursor, modifiés dans le gabarit seulement.)

## 1. Besoin

Demandé le 2026-10-16 : un identifiant (« QUA-015 », « catalogue:QUA-004 »,
« lot 3 ») cité seul à l'humain ne lui dit rien. La règle existe déjà
(`AGENTS.md`, « Références lisibles ») mais l'agent l'applique mal : le
2026-10-16 encore, des comptes rendus citaient « QUA-036 » ou « QUA-032 »
sans dire ce qu'ils désignent. Une consigne écrite ne suffit pas : le
libellé doit être sous les yeux de l'agent quand l'identifiant entre dans
son contexte, **quel que soit l'agent** (drwil est agnostique de l'outil).

## Critères d'acceptation

(contrat créé par ce chantier, avec son champ Origine : QUA-039.)

- Une seule source, glossary.mjs (nouveau, dans `.githooks/`), repère dans un texte les
  identifiants de contrat du registre, les lignes du catalogue et les lots
  et points numérotés de la fiche active, et rend leurs libellés ; une
  commande (`node .githooks/glossary.mjs "<texte>"`) les donne à tout
  agent — `QUA-039`
- Les sorties de drwil qui citent un identifiant de contrat le font suivre
  de son libellé (`drwil verify` en sortie humaine et agent,
  `.githooks/run-checks.mjs`, `.githooks/check-contract-tests.mjs`) : tout agent lit le
  libellé sans rien faire — `QUA-039`
- `AGENTS.md` et les instructions livrées à Copilot et à Cursor disent de
  citer chaque identifiant avec son libellé et donnent la commande —
  `QUA-039`
- Avec Claude Code, après chaque outil dont la sortie cite des
  identifiants connus, un hook injecte leur libellé et le rappel de la
  règle ; rien si la sortie n'en cite aucun ; jamais bloquant, jamais de
  session cassée — `QUA-039`

## 2. Hors périmètre

- Les hooks des autres outils (Cursor, Copilot CLI, Gemini CLI, Codex) :
  leurs formats sont à vérifier outil par outil ; à consigner en intention
  à la clôture (QUA-036), chacun deviendra un adaptateur du même module.
- Un contrôle de fin de réponse qui ferait reformuler un message contenant
  un identifiant nu (non retenu le 2026-10-16 : un tour de plus à chaque
  oubli).
- `.githooks/check-docs.mjs` (398 lignes, plafond 400 de QUA-001) : ses
  messages citent des contrats du kit en texte fixe ; inchangés.
- Les lots et points d'une fiche qui n'est pas active (sans contexte
  fiable).

## 3. Contraintes

- Livrable et dépôt ; aucun effet pour un projet sans registre.
- Libellés lus dans le registre, le catalogue et la fiche, jamais recopiés
  (QUA-011, doc jamais fausse) ; un identifiant déjà suivi de son libellé
  n'est pas annoté une seconde fois.
- `drwil verify` charge le module du projet (comme le moteur et le lecteur
  de contrats) : un projet qui ne l'a pas encore garde ses sorties
  actuelles.
- Sobriété en tokens : un libellé court par identifiant, au plus une
  quinzaine par sortie injectée.
- Contrats à citer : QUA-011, QUA-016 (rappel de cadrage, même famille de
  hooks), QUA-018 (dépôt vs livrable).

## 4. Décisions

Tranchées par le demandeur le 2026-10-16 (sondages) :

- Mécanisme : glossaire injecté, jamais bloquant ; pas de contrôle de fin
  de réponse.
- Périmètre : livrable et dépôt, **multi-agent** en trois couches : à la
  source (sorties de drwil), une commande pour tous (AGENTS.md, Copilot,
  Cursor), un hook là où l'agent en a (Claude Code d'abord, les autres
  après vérification de leur format).
- Identifiants : contrats du registre, lignes du catalogue, lots et points
  de la fiche active.

## 5. Points à trancher

Aucun.

## 6. Increments

- **Lot 1 — glossaire et commande** [IA] : glossary.mjs (nouveau, dans `.githooks/`)
  (repérage, libellés, annotation d'un texte, commande). Critère de
  sortie : tests (registre, catalogue, fiche active, déjà annoté, rien de
  connu, registre absent ; français et anglais).
- **Lot 2 — à la source** [IA] : sorties de `drwil verify` (humaine et
  agent), `.githooks/run-checks.mjs` et `.githooks/check-contract-tests.mjs` annotées. Critère
  de sortie : tests de ces sorties.
- **Lot 3 — instructions** [IA] : `AGENTS.md` (gabarit et dépôt),
  instructions Copilot et Cursor du gabarit. Critère de sortie : test
  d'installation.
- **Lot 4 — hook Claude Code** [IA] : id-glossary.mjs (nouveau, dans `.claude/hooks/`)
  (PostToolUse, tout outil), branché dans `.claude/settings.json` ; fiche
  mécanique et doc livrée ; contrat créé. Critère de sortie : test
  d'installation (hook livré, branché, sortie sur une entrée type) ;
  `drwil verify` évalue chaque critère prouvé.

## 7. Reprise

- **Dernier état** (2026-10-16) : réalisé. Écart au lot 4 : le hook ne
  suit pas « tout outil » mais ceux qui font entrer du texte (shell,
  lectures, recherches) ; après une édition, il renvoyait à l'agent les
  libellés de ce qu'il venait d'écrire.
- **Travail non commité** : aucun.
- **Prochaine étape** : [humain] lancer le chantier (`/drwil-start`).

# Projet : hooks indépendants du PATH du shell

**Statut** : cadré le 2026-11-02.
**Risque** : HIGH
**Maturité** : prêt
**Intention** : `docs/intentions/hooks-sans-dependance-au-shell.md`

<!-- scope
files:
  - packages/drwil/templates/common/tools/claude/.claude/settings.json
  - packages/drwil/templates/common/tools/gemini/.gemini/settings.json
  - packages/drwil/templates/common/tools/copilot/.github/hooks/drwil.json
  - packages/drwil/templates/common/tools/gemini/.gemini/hooks/drwil-node.sh
  - packages/drwil/src/config.ts
  - packages/drwil/src/render.ts
  - packages/drwil/src/render-gemini.ts
  - .gemini/settings.json
  - .gemini/hooks/drwil-node.sh
  - packages/drwil/test/claude-hooks.test.mjs
  - packages/drwil/test/kit.test.mjs
  - .githooks/engine.test.mjs
  - INSTALL.md
  - packages/drwil/CHANGELOG.md
  - docs/contracts.md
  - docs/contracts-catalog.md
  - docs/projects/kit-mechanics.md
  - .drwil/ia-first.json
  - docs/architecture.md
-->

## 1. Besoin

Avec un gestionnaire de versions comme fnm, `node` n'existe que dans un dossier propre au shell qui l'a
initialisé. Un assistant lancé depuis un autre shell, ou resté ouvert après la fermeture du premier, exécute
les hooks du kit sans `node` : code 127, « hook errored », sans cause ni piste. Le même défaut rend les tests
du moteur (`.githooks/engine.test.mjs`) rouges en local : ils passent un environnement réduit sans `PATH` à un
contrôle dont la commande est `node`, et la CI ne le voit pas parce que `node` est dans `/usr/bin` sur ses
machines. Un développeur sous fnm est alors bloqué par le pre-commit et le pre-push, qui rejouent ces tests.

## Critères d'acceptation

- Un hook d'assistant lancé sans `node` dans le `PATH` dit en clair que `node` est introuvable et quoi faire,
  au lieu d'un 127 muet, pour tous les assistants livrés (Claude Code, Copilot, Gemini) — `QUA-215`
- Ce message ne change ni le refus ni le format de sortie des hooks quand `node` est présent : le fail-closed
  des gardes de Claude Code est conservé (QUA-019), et les hooks de Copilot ne bloquent toujours jamais
  (QUA-065) — `QUA-216`
- Les tests du moteur passent sans `node` dans le `PATH` système, donc sous fnm : aucun ne suppose un `node`
  dans `/usr/bin` — `QUA-217`
- Le prérequis (`node` dans le `PATH` du processus de l'assistant) et le piège fnm sont décrits dans
  `INSTALL.md` — [humain] — `QUA-218`

## Contrats modifiés

Aucun contrat existant ne change : QUA-044 et QUA-065 restent vrais.

- `.githooks/engine.test.mjs` — les tests QUA-208, 209 et 210 gardent le `PATH` hérité dans l'environnement réduit, et le test QUA-217 est ajouté (validé par le demandeur le 2026-11-02 : « les tests du moteur sont corrigés dans ce chantier »)

## 2. Hors périmètre

- Affaiblir le fail-closed des hooks (QUA-019 : pas de contournement).
- Écrire le chemin absolu de `node` à l'installation, ou le chercher en repli (`fnm default`,
  `~/.local/bin`) : décision du 2026-11-02, le message lisible suffit pour ce chantier.
- Gérer nvm, asdf ou un autre gestionnaire au-delà du message générique.
- Alléger les contrôles lents du pre-commit et du pre-push (`runAt` du tarball, par exemple) : sujet à part.

## 3. Contraintes

- Un fichier livré s'édite dans le gabarit (`packages/drwil/templates/`) seulement ; `npm run
  installer-depot` rafraîchit la copie du dépôt dans le même commit (contrôle `miroirs-gabarit`).
- Le kit est testé sur Linux, macOS et Windows : une commande `sh` dans un réglage d'assistant ne doit pas
  casser Windows. À prouver sur la matrice de CI avant d'annoncer.
- QUA-044 : les points d'entrée des hooks restent lancés par leur chemin réel (liens symboliques compris).
- Hooks git (`.githooks/pre-commit`) : ils testent déjà `command -v node` avec un message lisible, hors
  périmètre.
- Doc visiteur en anglais pour `INSTALL.md` et `packages/drwil/CHANGELOG.md`.

## 4. Décisions

Tranchées par le demandeur le 2026-11-02 :
- Périmètre : tous les hooks d'assistants que le kit livre, Gemini compris.
- Résolution : message lisible seulement (détecter l'absence de `node`, dire quoi faire), sans chemin absolu
  ni repli automatique.
- Les tests du moteur sont corrigés dans ce chantier (environnement réduit sans `PATH`).

## 5. Points à trancher

- [IA] Forme de la commande de repli dans chaque réglage (un test `command -v node` avant l'appel, avec sortie
  sur stderr et le code que chaque assistant lit comme un refus ou comme un simple avertissement) : à fixer au
  lot 1 après lecture de la doc de chaque assistant ; en cas de doute sur un code de sortie, ne pas bloquer
  davantage qu'aujourd'hui.
- [IA] Chaque test du moteur qui passe un `env` réduit : lister ceux qui échouent sans `node` système avant de
  les corriger (QUA-208, 209, 210 et le test des contrôles eux-mêmes sont connus ; d'autres, dont QUA-126, 140
  et 152, sont à vérifier).

## 6. Increments

- **Lot 1 — tests du moteur sans node système** [IA] : reproduire avec un `PATH` sans `node` système, corriger
  chaque test qui suppose `/usr/bin/node`. Critère de sortie : `node .githooks/run-checks.mjs` passe sur une
  machine sous fnm sans lien dans `/usr/local/bin`, sauf l'audit des dépendances si le réseau est coupé.
- **Lot 2 — message de repli des hooks livrés** [IA] : réglages Claude Code, Copilot et Gemini du gabarit,
  tests (hook lancé avec un `PATH` vidé, message lisible, sortie inchangée quand `node` est là), copie du
  dépôt rafraîchie. Critère de sortie : les tests du paquet passent sur la matrice de CI (Linux, macOS,
  Windows).
- **Lot 3 — documentation** [IA] : `INSTALL.md` et changelog en anglais, `docs/projects/kit-mechanics.md`,
  contrats et catalogue. Critère de sortie : `node .githooks/check-docs.mjs` sans erreur.

## 7. Reprise

- **Dernier état** (2026-11-02) : lot 2 fait. Les commandes de hook de Claude Code (12) et de Copilot (champs
  `bash` et `powershell`, 2) testent `node` avant de l'appeler et disent quoi faire (QUA-215) ; sans `node`,
  codes 2 pour les `PreToolUse` de Claude, 1 pour ses autres hooks, 0 pour Copilot (QUA-216). Gemini (option 3 du
  demandeur) : hors Windows, `init` écrit des commandes qui passent par le lanceur `.gemini/hooks/drwil-node.sh`
  (`sh`, code 2 pour `BeforeTool`, 1 pour les autres, même message que Claude) ; sous Windows la commande reste
  `node …` sans repli (pas de forme unique sûre bash/PowerShell). Limite : réglage versionné, une équipe mixte
  garde la forme du système qui a lancé `init` (voir QUA-215). Lot 1 : tests QUA-208, 209 et 210
  de `.githooks/engine.test.mjs` corrigés, 794 tests verts sans lien `node` dans `/usr/local/bin`.
  Lot 3 : `INSTALL.md`, changelog, `docs/projects/kit-mechanics.md` écrits ; contrats QUA-217 (tests du moteur
  rejoués avec un `PATH` sans `node` système) et QUA-218 (`Manuel`, `INSTALL.md`, attesté par l'humain).
  Intentions créées pour les limites : Gemini sous Windows, formes PowerShell non jouées en CI, tests de
  `run-checks` qui exigent `gitleaks`.
- **Travail non commité** : aucun une fois le lot 3 commité.
- **Prochaine étape** : l'humain atteste QUA-218 (`drwil attest QUA-218`), puis `verify`, clôture et PR.

# Projet : un identifiant cité sans libellé est complété sous la réponse de l'agent

**Statut** : cadré le 2026-10-17.
**Intention** : `docs/intentions/identifiant-rattrape-avant-l-humain.md`
**Risque** : HIGH
**Maturité** : prêt

<!-- scope
files:
  - packages/drwil/templates/common/tools/claude/.claude/hooks/reply-glossary.mjs
  - .claude/hooks/reply-glossary.mjs
  - packages/drwil/templates/common/tools/claude/.claude/hooks/id-glossary.mjs
  - .claude/hooks/id-glossary.mjs
  - packages/drwil/templates/common/tools/claude/.claude/settings.json
  - .claude/settings.json
  - packages/drwil/templates/common/base/.githooks/glossary.mjs
  - .githooks/glossary.mjs
  - .githooks/glossary.test.mjs
  - packages/drwil/templates/common/base/gitignore
  - .gitignore
  - packages/drwil/templates/common/base/docs/ia-first.md
  - docs/ia-first.md
  - packages/drwil/test/kit.test.mjs
  - docs/contracts.md
  - .drwil/ia-first.json
  - packages/drwil/CHANGELOG.md
  - README.md
  - packages/drwil/README.md
-->

(cadrage : le nouveau hook de fin de réponse, le rappel actuel et le
glossaire — gabarit, copies du dépôt, tests —, la déclaration des hooks,
le `.gitignore` (mémoire du rappel), la doc du kit, le registre (QUA-039
évolue), le réglage des contrôles, changelog et README.)

## 1. Besoin

Constaté par le demandeur le 2026-10-17 : QUA-039 (un identifiant cité à
l'humain vient avec ce qu'il désigne) est tenu par les sorties de drwil,
pas par les réponses de l'agent (« OPT-6 à OPT-8 », « scénario S6 » écrits
nus). Trois causes (intention d'origine) : le hook ne relit que ce que
l'agent lit, jamais sa réponse ; le glossaire ignore des identifiants de
travail ; le rappel injecté après chaque outil fait trop de bruit pour
être lu.

Vérifié le 2026-10-17 dans la documentation des hooks Claude Code : un
hook de fin de réponse (`Stop`) reçoit le texte de la réponse
(`last_assistant_message`) et peut afficher un message à l'utilisateur
(`systemMessage`) sans faire repartir le modèle ; la réponse est déjà
affichée quand il tourne : il complète, il ne réécrit pas.

## Critères d'acceptation

- Quand une réponse de l'agent cite un identifiant connu sans glose (ni
  parenthèse, ni « — », ni « : » qui le suit sur la même ligne, ni
  mention libellée plus haut dans la réponse), un hook de fin de réponse
  affiche sous la réponse « ID — libellé » pour chacun ; une réponse sans
  identifiant nu n'affiche rien ; jamais bloquant, jamais d'erreur
  visible — `QUA-039`
- Le glossaire connaît aussi les opportunités `OPT-N` de la découverte de
  valeur et les repères qu'une intention ou une fiche déclare dans une
  section « Repères » (une ligne `- \`ID\` — libellé` par repère) —
  `QUA-039`
- Le rappel après chaque outil ne cite un identifiant qu'une fois par
  session — `QUA-039`
- Le changelog (« Unreleased ») dit le changement et, pour un projet déjà
  installé, que `npx drwil resolve-drift` déclare le nouveau hook dans
  `.claude/settings.json` — `QUA-040`

## Contrats modifiés

- `QUA-039` — ancien critère : « Avec Claude Code, un hook injecte les
  libellés après chaque outil qui en cite, sans jamais bloquer » ; le
  glossaire lit les contrats, le catalogue et les lots et points de la
  fiche active — raison : la règle n'était pas tenue par les réponses de
  l'agent ; s'y ajoutent la note de fin de réponse, les sources `OPT-N` et
  « Repères », et un rappel limité à une fois par identifiant et par
  session ; rien n'est retiré (validé le 2026-10-17 par le demandeur,
  réponses au sondage de cadrage).

## 2. Hors périmètre

- Les autres agents (Cursor, Copilot CLI, Gemini, Codex) :
  `docs/intentions/glossaire-autres-agents.md`.
- La mise à jour automatique de `.claude/settings.json` à `init`
  (intention `docs/intentions/maj-prose-non-modifiee.md`) : en 0.6.3, un
  projet installé passe par `resolve-drift`.
- Réécrire ou bloquer la réponse de l'agent (écarté par le demandeur :
  une note affichée, pas de correction par l'agent).

## 3. Contraintes

- Le hook de fin de réponse ne coûte pas de tokens au modèle : il passe
  par `systemMessage`, pas par `additionalContext` (à vérifier au lot 1 ;
  sinon le dire avant de continuer).
- Jamais bloquant : une erreur du hook ne s'affiche pas et ne bloque pas.
- À tester dans le terminal ; l'affichage dans l'app web et desktop est
  non documenté : le noter comme limite s'il n'est pas vérifié.

## 4. Décisions

- 2026-10-17 (demandeur, sondage) : note affichée par le hook plutôt
  que correction par l'agent ; « libellé » = glose qui suit l'ID ou
  mention libellée plus haut ; sources ajoutées : `OPT-N` et repères
  déclarés ; rappel réduit à une fois par identifiant et par session.
- Proposé par l'agent (non contesté) : projets installés par
  `resolve-drift` en 0.6.3 ; convention des repères = section
  « Repères » ; mémoire du rappel dans un fichier local ignoré par git,
  comme `.drwil/reminder.json` (si présent).

## 5. Lots

- **Lot 1** : vérifier le format de sortie du hook `Stop` sur un hook
  minimal (affichage, coût) ; hook de fin de réponse, déclaration dans
  les réglages, tests.
- **Lot 2** : glossaire (sources `OPT-N` et « Repères »), rappel réduit,
  tests ; QUA-039, doc du kit, changelog, README ; PR.

## 6. Reprise

- **Dernier état** (2026-10-17) : cadré ; rien de commencé.

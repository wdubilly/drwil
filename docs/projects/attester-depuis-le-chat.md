# Projet : attester une preuve humaine depuis la conversation

**Statut** : en cours le 2026-11-03 ; réalisation faite, jugement humain restant.
**Risque** : HIGH
**Maturité** : prêt
**Intention** : `docs/intentions/installation-fluide.md`

<!-- scope
files:
  - packages/drwil/src/attest.ts
  - packages/drwil/src/cli-attest.ts
  - packages/drwil/src/cli-texts.ts
  - packages/drwil/src/index.ts
  - packages/drwil/src/evidence.ts
  - README.md
  - packages/drwil/README.md
  - .claude/hooks/prompt-hook.mjs
  - .claude/hooks/start-poll.mjs
  - .claude/hooks/attest-poll.mjs
  - packages/drwil/templates/common/tools/claude/.claude/hooks/prompt-hook.mjs
  - packages/drwil/templates/common/tools/claude/.claude/hooks/start-poll.mjs
  - packages/drwil/templates/common/tools/claude/.claude/hooks/attest-poll.mjs
  - packages/drwil/test/claude-hooks.test.mjs
  - packages/drwil/test/cycle.test.mjs
  - docs/recipes/adopt-the-kit.md
  - packages/drwil/templates/common/base/docs/recipes/adopt-the-kit.md
  - packages/drwil/CHANGELOG.md
  - docs/contracts.md
  - docs/contracts-catalog.md
  - docs/projects/kit-mechanics.md
  - .drwil/ia-first.json
-->

## 1. Besoin

Attester une preuve humaine par `npx drwil attest` dans un terminal est pénible : le demandeur veut pouvoir le
faire directement dans la conversation avec l'agent (demande du 2026-10-27). L'attestation reste un geste
humain : un agent n'exécute jamais `drwil attest` et n'écrit jamais d'attestation. Décision du 2026-10-30 : un
sondage dont la réponse est lue par un hook, sur le modèle du lancement d'un chantier.

## Critères d'acceptation

- L'agent peut ouvrir un sondage d'attestation pour un contrat manuel ; la réponse de l'humain, lue par un
  hook, enregistre l'attestation — `QUA-235`
- Le sondage affiche le critère du contrat, ce que l'agent a essayé et les fichiers couverts dont la
  modification ferait tomber l'attestation — `QUA-032`
- Une réponse écrite par l'agent, un sondage sans réponse ou refusé n'enregistre jamais d'attestation —
  `QUA-235`
- L'attestation faite dans le chat est liée au texte et à la preuve du contrat comme celle du terminal,
  compatible avec la couverture et `--renew` — `QUA-081`
- Le sondage est lisible et ne demande que le jugement utile — [humain] — `QUA-236`

## 2. Hors périmètre

- La commande `drwil attest` du terminal : inchangée, elle reste la voie de repli.
- Une identité forte de l'attestation (commits signés, revue authentifiée) : intention à part,
  `docs/intentions/e2e-et-attestation-precises.md`.
- Les autres outils que Claude Code (Copilot CLI) : leur sondage suit le contrat de compatibilité des outils.

## 3. Contraintes

- Le gabarit est la seule source ; la copie du dépôt suit (`scopeMirrors`).
- QUA-019 (pas de contournement) : aucun réglage ne permet à l'agent de remplir la réponse ; le hook refuse un
  sondage portant une réponse remplie, une valeur par défaut ou une recommandation, comme celui du lancement.
- L'attestation ne coûte que le jugement demandé (QUA-032) ; elle tombe quand un fichier couvert change
  (QUA-081).
- Chevauche le sondage de lancement (`.claude/hooks/start-poll.mjs`) : à lancer après
  `docs/projects/journal.md`.

## 4. Décisions

Tranchées par le demandeur le 2026-10-30 :

- Un sondage lu par un hook (plutôt que `! npx drwil attest` dans la session).
- Le sondage affiche le critère, l'essai et les fichiers couverts (plutôt que le critère seul).

## 5. Points à trancher

- [IA, fixé le 2026-11-03] Le hook n'accepte que `AskUserQuestion` de Claude Code :
  préparation avant affichage, réponse exclusivement dans `tool_response.answers`, corrélation par
  `session_id` et `tool_use_id`, préparation consommée une seule fois. La date, la session et l'appel
  sont conservés dans la provenance ; cette traçabilité n'est pas une identité forte. Le résumé et les
  empreintes sont revérifiés après la réponse : une preuve changée exige un nouveau sondage.

## 6. Increments

- **Lot 1 — attestation lue par un hook** [IA] : hook, `packages/drwil/src/attest.ts`, tests (réponse humaine,
  réponse remplie par l'agent, refus), recette. Critère de sortie : un sondage répondu par l'humain enregistre
  l'attestation, une réponse écrite par l'agent est refusée.

## 7. Reprise

- **Dernier état** (2026-11-03) : lot unique réalisé sur la branche
  `workstream/attester-depuis-le-chat`, arrêté avant clôture sur le jugement humain de QUA-236
  (le sondage d'attestation ne demande que le jugement utile). Aucune attestation réelle créée par
  l'agent, aucun sondage réel soumis, aucun `state accept` ni lancement du chantier suivant.
- **Travail non commité** : aucun après le commit de réalisation.
- **Contrôles** :
  - `npm run build --silent` : code 0.
  - `node --test --test-name-pattern="QUA-235|QUA-032|QUA-081|QUA-083|QUA-205" packages/drwil/test/cycle.test.mjs packages/drwil/test/claude-hooks.test.mjs` :
    9 tests passés, 0 échec ; réponse humaine fictive, réponse agent refusée, défaut, recommandation,
    refus humain, absence de réponse, rejeu, corrélation, expiration, preuve changée, contrôle devenu
    rouge, renouvellement et terminal inchangé.
  - `npm run test:claude:coverage` : code 0, lignes 97,91 %, branches 89,75 %.
  - `npm run installer-depot --silent` : code 0, copies installées depuis le gabarit.
  - Contrôle des plafonds à 200 lignes sur les sources et les hooks : code 0 après module dédié.
  - Sous-agent `drwil-checks`, `node .githooks/run-checks.mjs` : code 0, 52 avertissements,
    229 contrôles rejoués, 3 repris.
  - Sous-agent `drwil-checks`, `node packages/drwil/bin/drwil.js verify --agent` : code 1,
    `Verdict: GOVERNANCE: MANUAL REVIEW REQUIRED (exit 1)` ; 206 PASS, 21 ATTESTED,
    0 FAIL, 0 ERROR, 1 MANUAL : QUA-236 uniquement. Ce verdict n'est pas une validation.
- **Protocole attendu de la principale** : présenter à l'humain le sondage fictif du test QUA-235
  dans `packages/drwil/test/claude-hooks.test.mjs` (APP-009, règle fictive, lisibilité fictive,
  essai fictif, fichier src/objet.js, choix Attester/Refuser) et
  `docs/recipes/adopt-the-kit.md`, section « Human attestation in the conversation ».
  L'humain juge la lisibilité et l'absence de choix suggéré ; s'il confirme, lui seul exécute
  `node packages/drwil/bin/drwil.js attest QUA-236` dans son terminal interactif, ou répond
  au sondage Claude Code ouvert par la principale suivant la recette. Aucun agent n'exécute cette
  commande ni ne répond au sondage. Ensuite seulement, contrôles complets avec évidence sur HEAD,
  journal et clôture, push/PR, fusion automatique autorisée. Une divergence d'acceptation éventuelle
  doit aussi être traitée par l'humain, jamais acceptée par l'agent.
- **Extension de périmètre** : `packages/drwil/src/index.ts` exporte la préparation en lecture seule
  utilisée par la CLI et le hook ; `packages/drwil/src/evidence.ts` décrit la provenance optionnelle sans
  changer le jugement des attestations existantes ; `README.md` et `packages/drwil/README.md` corrigent
  l'affirmation « terminal uniquement » et documentent la nouvelle commande publique.
- **Extension de périmètre, taille** : le contrôle de taille refuse l'ajout du sondage dans les deux hooks
  existants (266 et 202 lignes, plafond 200). Le nouveau module
  packages/drwil/templates/common/tools/claude/.claude/hooks/attest-poll.mjs et sa copie
  .claude/hooks/attest-poll.mjs (tous deux à créer) regroupent uniquement la nouvelle logique ; aucun parcours existant n'est
  restructuré. Les tests de régression et du nouveau sondage passent avant ce déplacement (9/9).
- **Limites** : identité toujours déclarative (intention existante
  `docs/intentions/e2e-et-attestation-precises.md`), autres assistants non testés pour ce sondage ;
  hook nécessitant le paquet drwil local, repli terminal documenté. L'intention
  `docs/intentions/installation-fluide.md` reste à actualiser à la clôture.
- **Documentation rencontrée** : quatre références ambiguës dans `packages/drwil/README.md`,
  signalées par `close.mjs --check`, ont été précisées : chemin du contrôle et noms de fichiers
  d'exemples non présentés comme des références du dépôt. Le contrôle ne les signale plus.

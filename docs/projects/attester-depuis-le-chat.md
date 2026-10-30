# Projet : attester une preuve humaine depuis la conversation

**Statut** : cadré le 2026-10-30.
**Risque** : HIGH
**Maturité** : prêt
**Intention** : `docs/intentions/installation-fluide.md`

<!-- scope
files:
  - packages/drwil/src/attest.ts
  - packages/drwil/src/cli-attest.ts
  - packages/drwil/src/cli-texts.ts
  - .claude/hooks/prompt-hook.mjs
  - .claude/hooks/start-poll.mjs
  - packages/drwil/templates/common/tools/claude/.claude/hooks/prompt-hook.mjs
  - packages/drwil/templates/common/tools/claude/.claude/hooks/start-poll.mjs
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
  hook, enregistre l'attestation — contrat à créer
- Le sondage affiche le critère du contrat, ce que l'agent a essayé et les fichiers couverts dont la
  modification ferait tomber l'attestation — `QUA-032`
- Une réponse écrite par l'agent, un sondage sans réponse ou refusé n'enregistre jamais d'attestation —
  contrat à créer
- L'attestation faite dans le chat est liée au texte et à la preuve du contrat comme celle du terminal,
  compatible avec la couverture et `--renew` — `QUA-081`
- Le sondage est lisible et ne demande que le jugement utile — [humain] — contrat à créer

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
  `docs/projects/adoption-fluide-projet-neuf.md`.

## 4. Décisions

Tranchées par le demandeur le 2026-10-30 :

- Un sondage lu par un hook (plutôt que `! npx drwil attest` dans la session).
- Le sondage affiche le critère, l'essai et les fichiers couverts (plutôt que le critère seul).

## 5. Points à trancher

- [IA] Preuve de l'origine humaine côté hook : que le hook enregistre-t-il (date, identité de session) pour
  distinguer l'attestation d'une réponse écrite par l'agent ? À fixer au lot 1 avec des tests sur une réponse
  falsifiée.

## 6. Increments

- **Lot 1 — attestation lue par un hook** [IA] : hook, `packages/drwil/src/attest.ts`, tests (réponse humaine,
  réponse remplie par l'agent, refus), recette. Critère de sortie : un sondage répondu par l'humain enregistre
  l'attestation, une réponse écrite par l'agent est refusée.

## 7. Reprise

- **Dernier état** (2026-10-30) : cadré, aucun code.
- **Travail non commité** : aucun.
- **Prochaine étape** : [décision] lancer par `/drwil-start`, après `adoption-fluide-projet-neuf`.

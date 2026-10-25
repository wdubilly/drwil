# Projet : un hook modifié se déclare avant la clôture, et le retour en SCOPING attend la CI

**Statut** : cadré le 2026-10-25.
**Risque** : HIGH
**Maturité** : prêt
**Intention** : `docs/intentions/hooks-declares-et-scoping-apres-ci.md`

<!-- scope
files:
  - packages/drwil/templates/common/base/.githooks/base-checks.mjs
  - .githooks/base-checks.mjs
  - .githooks/base-checks.test.mjs
  - packages/drwil/templates/common/base/.githooks/close.mjs
  - .githooks/close.mjs
  - .githooks/close.test.mjs
  - packages/drwil/templates/common/base/.githooks/state-texts.mjs
  - .githooks/state-texts.mjs
  - .githooks/state.test.mjs
  - packages/drwil/templates/common/tools/claude/.claude/skills/start-a-workstream/SKILL.md
  - .claude/skills/start-a-workstream/SKILL.md
  - packages/drwil/test/cycle.test.mjs
  - docs/contracts.md
  - .drwil/ia-first.json
  - packages/drwil/CHANGELOG.md
  - docs/intentions/hooks-declares-et-scoping-apres-ci.md
  - docs/projects/pending.md
  - docs/projects/journal.md
-->

## 1. Besoin

Deux trous de procédure, rencontrés ensemble sur la PR #232, troisième
occurrence connue (après la PR #220) :

1. Un fichier de `.githooks/` modifié par la branche et non déclaré dans
   « Contrats modifiés » n'est signalé qu'en CI, par le rejeu QUA-113 (sur
   une PR, la CI rejoue les contrôles avec les hooks de la branche
   principale), qui remet sa version de `master` et fait échouer les
   contrôles.
2. La procédure de fusion automatique fait revenir en SCOPING dès la
   fusion programmée, avant la fin de la CI ; une CI rouge ensuite ne peut
   plus rouvrir le chantier, `reopen` (QUA-116, réouverture d'un chantier
   clos dont la PR révèle un défaut) n'étant permis qu'en CLOSING.

À mener avant les trois chantiers `verify` de « Ensuite », qui modifient
tous des hooks sans les déclarer.

## Critères d'acceptation

(contrats à créer au lancement, avec leur champ **Origine** ; ID à
attribuer à ce moment-là dans le registre.)

- `node .githooks/close.mjs` (clôture, `--check` et passage de BUILD à
  EVIDENCE) signale chaque fichier de `.githooks/` modifié par la branche
  et absent des « Contrats modifiés » de ses fiches, nomme la puce à
  écrire et rappelle qu'elle demande le oui du demandeur ; la clôture est
  refusée tant qu'il en reste ; sans branche principale lisible, le signal
  est « non exécuté » et le dit, jamais un succès — `QUA-137`
- Avec la fusion automatique, le retour en SCOPING n'a lieu qu'une fois la
  PR fusionnée, suivie par `node .githooks/pr-watch.mjs` (30 minutes au
  plus) ; CI rouge : l'état reste en CLOSING et `reopen` s'applique ; délai
  dépassé : rester en CLOSING et le signaler — `QUA-138`

## Contrats modifiés

- `.githooks/base-checks.mjs` — hook gardé à sa version de PR au rejeu par
  la branche principale (QUA-113) : il expose la liste des hooks modifiés
  non déclarés, lue par la clôture (validé par le demandeur le 2026-10-25)
- `.githooks/close.mjs` — hook gardé à sa version de PR au rejeu : il
  signale les hooks non déclarés et refuse la clôture (validé par le
  demandeur le 2026-10-25)
- `.githooks/state-texts.mjs` — hook gardé à sa version de PR au rejeu : la
  procédure de fusion automatique attend la fusion avant SCOPING (validé
  par le demandeur le 2026-10-25)

## 2. Hors périmètre

- Un signal au pre-push : la clôture suffit (point de décision 1) ; à
  reprendre si un chantier pousse un hook non déclaré avant sa clôture.
- `reopen` depuis SCOPING : écarté (décision 2).
- Le budget de temps sous Windows et le test de durée fragile de QUA-136
  (chaque contrôle consigne sa durée) :
  `docs/intentions/suivi-ci-et-contexte.md`.

## 3. Contraintes

- `.githooks/close.mjs` est à 398 lignes pour un plafond de 400 (QUA-001,
  fichier de code plafonné) : la logique vit dans `.githooks/base-checks.mjs`
  (`declarations` y est déjà), `.githooks/close.mjs` ne fait que l'appeler depuis
  `closingReport` ; découper `.githooks/close.mjs` si l'appel ne tient pas.
- `.githooks/base-checks.mjs` reste autonome (modules Node seuls) : la CI
  lance la copie de la branche principale.
- Même règle que le rejeu : un fichier de test (suffixe « .test.mjs ») suit
  la déclaration de son module ; une fiche supprimée se lit à sa version
  d'avant suppression.

## 4. Décisions

(validées par le demandeur le 2026-10-25)

1. Le signal des hooks non déclarés est donné par `.githooks/close.mjs` (`--check`,
   passage de BUILD à EVIDENCE) et refuse la clôture ; pas de pre-push.
2. Avec la fusion automatique, le retour en SCOPING attend la fusion,
   suivie par `gh` (30 minutes au plus, comme la file de chantiers) ;
   `reopen` reste réservé à CLOSING.
3. Le signal nomme les hooks à déclarer et rappelle que la déclaration est
   un oui du demandeur, comme QUA-117 (un correctif de réouverture qui
   change les règles du jeu attend le oui de l'humain).

## 5. Points à trancher

- Aucun : tout est tranché.

## 6. Increments

- **Lot 1 — hooks non déclarés signalés** [IA] : `undeclaredHooks` dans `.githooks/base-checks.mjs` (fichiers de `.githooks/` modifiés par `base..HEAD` moins les déclarés), appelé par `closingReport` de `.githooks/close.mjs` ; clôture refusée, signal à `--check` ; tests sur de vrais dépôts git temporaires (hook déclaré, non déclaré, test qui suit son module, fiche supprimée, base introuvable) ; contrat et son contrôle `tests-qua-<id>`. Critère de sortie : `node .githooks/run-checks.mjs` OK.
- **Lot 2 — SCOPING après la fusion** [IA] : texte `autoMerge` de `.githooks/state-texts.mjs` (français et anglais) et skill de lancement : programmer, vérifier, suivre par `.githooks/pr-watch.mjs` jusqu'à « fusionnée », puis SCOPING ; rouge : `reopen` ; tests du texte (`.githooks/state.test.mjs`, `packages/drwil/test/cycle.test.mjs`) ; contrat et son contrôle ; ligne « Unreleased » du changelog. Critère de sortie : `node .githooks/run-checks.mjs` OK, `drwil verify --agent` PASS.

## 7. Reprise

- **Dernier état** (2026-10-25) : cadré, prêt à lancer.
- **Travail non commité** : aucun.
- **Prochaine étape** : [humain] lancer le chantier (`/drwil-start`).

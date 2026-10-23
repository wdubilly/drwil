# Projet : les contournements restants sont fermés ou assumés

**Statut** : cadré le 2026-10-23.
**Risque** : HIGH
**Maturité** : prêt
**Intention** : `docs/intentions/contournements-a-completer.md`

<!-- scope
files:
  - packages/drwil/templates/common/ci/github/.github/workflows/ia-first.yml
  - packages/drwil/templates/common/ci/gitlab/.gitlab-ci.yml
  - packages/drwil/templates/common/base/.githooks/run-checks.mjs
  - packages/drwil/templates/common/base/.githooks/base-checks.mjs
  - .githooks/base-checks.test.mjs
  - .github/workflows/ia-first.yml
  - .github/scripts/workflows-yaml.test.mjs
  - packages/drwil/templates/common/tools/claude/.claude/hooks/bash-guard.mjs
  - .claude/hooks/bash-guard.test.mjs
  - packages/drwil/test/cycle.test.mjs
  - packages/drwil/test/kit.test.mjs
  - packages/drwil/src/guarantees-forge.ts
  - packages/drwil/src/guarantees.ts
  - packages/drwil/src/doctor.ts
  - packages/drwil/templates/common/base/docs/projects/kit-mechanics.md
  - docs/projects/kit-mechanics.md
  - docs/architecture.md
  - packages/drwil/test/guarantees.test.mjs
  - .github/scripts/verifier-ruleset.mjs
  - docs/contracts.md
  - .drwil/ia-first.json
  - packages/drwil/CHANGELOG.md
-->

(Les copies installées, `.githooks/` et `.claude/`, sont couvertes par
`scopeMirrors` ; `.github/workflows/ia-first.yml` du dépôt n'est pas une
copie et s'édite à part. Élargi le 2026-10-24 à `packages/drwil/src/guarantees.ts`
et `packages/drwil/src/doctor.ts` : le « non vérifié » de `bypass_actors` doit s'afficher dans
`drwil guarantees` et `drwil doctor`, critère 3 ; puis à la fiche de la
mécanique du kit (gabarit et dépôt) et à la carte : le nouveau hook
`.githooks/base-checks.mjs` doit y être cité, sinon les contrôles de
cadrage et de carte le refusent.)

## 1. Besoin

Démontrer que les règles existantes résistent à un contournement avant
d'en ajouter. L'inventaire du 2026-10-22 (intention) en laisse trois
ouverts :

- **Hooks modifiés dans la PR elle-même** : la CI exécute les scripts de la
  branche contrôlée, donc une PR qui affaiblit `.githooks/run-checks.mjs`
  ou retire un contrôle se valide elle-même. Dans ce dépôt, seule la
  relecture d'un code owner la protège ; un projet adopté n'a pas de
  CODEOWNERS.
- **`git config core.hooksPath` et formes voisines en local** : les
  permissions de Claude Code refusent déjà `git *--no-verify*` et
  `git -c *`, mais pas `git config core.hooksPath …`, `--unset`, les
  variables `GIT_CONFIG_*`, ni une commande enfouie dans `bash -c "…"` ; la
  garde shell (`packages/drwil/templates/common/tools/claude/.claude/hooks/bash-guard.mjs`) ne les voit pas. La CI les rattrape.
- **`bypass_actors` non comparé en CI** : le jeton de la CI n'est pas
  administrateur.

## Critères d'acceptation

(contrats créés au lancement, avec leur champ **Origine**.)

- Sur une PR, la CI rejoue aussi les contrôles avec le code des hooks de la
  branche principale (sa `.githooks/`) et la liste de contrôles de la PR :
  une PR qui affaiblit un hook échoue ; un contrôle retiré de
  `.drwil/ia-first.json` fait échouer la CI, sauf s'il est déclaré dans
  « Contrats modifiés » de la fiche du chantier, validé par le demandeur ;
  prouvé par un scénario de contournement dans un vrai dépôt — `QUA-113`
- La garde shell de Claude Code refuse à l'agent, sans demander, toute
  commande qui saute les hooks ou écrit, supprime ou surcharge
  `core.hooksPath` (`--no-verify`, `commit -n`, `-c core.hooksPath=`,
  `git config core.hooksPath`, `--unset`, `GIT_CONFIG_*`), y compris dans
  une commande composée ou un `sh -c` ; une simple lecture du réglage
  passe — `QUA-114`
- `bypass_actors` reste non comparé en CI, limite écrite : `drwil
  guarantees` et `doctor` le vérifient avec le jeton de l'humain quand il
  est administrateur, et le disent « non vérifié » sinon — `QUA-115`

## Contrats modifiés

(aucun prévu ; si le lot 1 doit changer QUA-095, CI verte sans
contournement administrateur et CI qui rejoue le hook, le chantier
s'arrête et le demande.)

## 2. Hors périmètre

- Un jeton administrateur en CI (écarté au cadrage : un secret puissant de
  plus).
- Le clone superficiel (la CI fait `fetch-depth: 0`, dans ce dépôt comme
  dans le gabarit) et l'agent qui élargit lui-même son cadrage (voulu,
  visible en relecture) : restent dans l'intention.
- Une relecture humaine exigée sur `.githooks/` (écartée au cadrage, au
  profit du rejeu par la branche principale).

## 3. Contraintes

- Livré à tout projet, GitHub et GitLab ; ce dépôt a sa propre CI, mise à
  jour dans le même chantier.
- Le rejeu par la branche principale lit ses hooks par Git
  (`git show <base>:.githooks/…` dans un dossier temporaire), jamais par
  un second clone réseau ; base introuvable (premier push, branche
  orpheline) : « non exécuté », jamais un succès (QUA-013, un contrôle non
  exécuté n'est pas passé).
- Limite assumée : une PR qui corrige un défaut d'un hook est jugée par le
  hook de la branche principale encore fautif ; le chantier l'écrit, et si
  ce défaut fait échouer la CI, la correction passe par « Contrats
  modifiés ».
- La garde shell passe de « demander » à « refuser » pour cette seule
  famille ; les autres risques gardent la demande (décision du
  demandeur). Les tests du kit qui ont besoin de `core.hooksPath` le font
  dans leur propre processus, jamais par une commande de l'agent.
- La détection réutilise la logique de lecture ou d'écriture déjà écrite
  pour le juge du banc (`ecritHooks`, `outils/banc-juge.mjs`), en l'adaptant
  au gabarit, sans dépendance du livrable vers `outils/`.

## 4. Décisions

- 2026-10-23 — Hooks modifiés dans la PR : la CI rejoue les contrôles de la
  branche principale, scripts de la branche principale et liste de
  contrôles de la PR, un contrôle retiré passant par « Contrats modifiés »
  (demandeur).
- 2026-10-23 — `bypass_actors` : limite documentée, pas de jeton
  administrateur en CI (demandeur).
- 2026-10-23 — Garde shell : refus, pas demande d'accord (demandeur).

## 5. Points à trancher

(aucun)

## 6. Increments

- **Lot 1 — rejeu par la branche principale** [IA] : base-checks.mjs (nouveau),
  job ajouté aux deux CI du gabarit et à celle du dépôt ; tests (hook
  affaibli, contrôle retiré non déclaré, contrôle retiré déclaré, base
  introuvable) et scénario dans `packages/drwil/test/cycle.test.mjs`.
- **Lot 2 — garde shell et `bypass_actors`** [IA] : refus dans
  la garde shell et ses tests ; « non vérifié » de `bypass_actors` dans
  `packages/drwil/src/guarantees-forge.ts` ; contrats au registre et contrôles
  `tests-qua-<id>` déclarés ; ligne « Unreleased » du changelog. Critère de
  sortie : `node .githooks/run-checks.mjs` OK, `drwil verify --agent` PASS.

## 7. Reprise

- **Dernier état** (2026-10-23) : cadré.
- **Travail non commité** : aucun.
- **Prochaine étape** : [humain] lancer le chantier (`/drwil-start`).

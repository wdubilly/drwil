# Projet : une recette par version, pour une équipe hors dépôt

**Statut** : cadré le 2026-10-18.
**Risque** : HIGH
**Maturité** : prêt
**Intention** : `docs/intentions/fiche-de-recette.md`

<!-- scope
files:
  - packages/drwil/templates/common/optional/create-release/acceptance-sheet.mjs
  - .githooks/acceptance-sheet.mjs
  - .githooks/acceptance-sheet.test.mjs
  - packages/drwil/templates/common/optional/create-release/release-verdict.mjs
  - .githooks/release-verdict.mjs
  - .githooks/release-verdict.test.mjs
  - packages/drwil/templates/common/optional/create-release/promote-release.mjs
  - .githooks/promote-release.mjs
  - .githooks/promote-release.test.mjs
  - packages/drwil/templates/common/optional/create-release/create-release.mjs
  - .githooks/create-release.mjs
  - .githooks/create-release.test.mjs
  - packages/drwil/templates/common/optional/create-release/README.md
  - packages/drwil/templates/common/base/docs/recipes/create-a-release.md
  - docs/recipes/create-a-release.md
  - packages/drwil/templates/common/tools/claude/.claude/skills/create-a-release/SKILL.md
  - .claude/skills/create-a-release/SKILL.md
  - packages/drwil/templates/common/base/docs/recipes/corriger-un-defaut.md
  - docs/recipes/corriger-un-defaut.md
  - packages/drwil/templates/common/base/AGENTS.md
  - AGENTS.md
  - README.md
  - packages/drwil/README.md
  - packages/drwil/test/kit.test.mjs
  - docs/architecture.md
  - docs/contracts.md
  - .drwil/ia-first.json
  - outils/miroirs.json
  - packages/drwil/CHANGELOG.md
  - packages/drwil/templates/common/base/docs/projects/kit-mechanics.md
  - docs/projects/kit-mechanics.md
-->

(cadrage : dans le module de release, la génération de la fiche
(acceptance-sheet.mjs), le verdict humain (release-verdict.mjs) et la
promotion (promote-release.mjs), à créer, et le script de release qui
publie la candidate — gabarit et copies du dépôt, avec leurs tests propres
au dépôt — ; le README du module ; la recette et la skill de release, la
recette « corriger un défaut » pour le tri des réserves et des refus ;
`AGENTS.md` (le verdict est un geste humain) ; le lien vers la dernière
version validée dans les README ; la carte, le registre, les contrôles, les
miroirs et le changelog ; les fiches de mécanique du kit, gabarit et
dépôt, pour que les nouveaux scripts du module restent dans un cadrage —
élargi le 2026-10-19 : sans elles, un projet qui active le module ne peut
pas commiter ses scripts.)

## 1. Besoin

Proposé le 2026-10-18 par le demandeur
(`docs/intentions/fiche-de-recette.md`) : une équipe de recette, qui ne
lit pas le dépôt, valide chaque version. Elle doit savoir en quelques
minutes ce qu'elle a à valider, et ce que la non-régression automatique a
déjà prouvé, pour ne pas tout retester. Précisé le même jour : son
approbation, éventuellement avec réserves, conditionne la publication ;
elle teste donc le tarball avant la release définitive.

## Critères d'acceptation

- Une version candidate est publiée en pré-release GitHub (par exemple
  `v0.6.5-rc.1`), avec son tarball et une fiche de recette en Markdown
  générée (jamais écrite à la main) du dernier tag définitif à la
  candidate, lisible sans Git — contrat à créer
- En tête de la fiche, « à valider » : chaque point dit quoi regarder et
  comment — critères `[humain]`, attestations à refaire, ce qui n'a pas
  été essayé en réel, limites connues — et porte un identifiant stable
  (version et numéro de point) et le lien vers la PR de son chantier
  (retrouvée par le trailer `Drwil-Brief` des commits) ; en dessous, la
  non-régression : verdict de `drwil verify`, nombre de contrats prouvés
  par un test, leurs ID et libellés, OS testés par la CI, et l'empreinte
  du tarball — contrat à créer
- Une commande humaine enregistre le verdict de recette sur la candidate :
  approuvée, approuvée avec réserves (chaque réserve citée par
  l'identifiant de son point) ou refusée (chaque point refusé cité) ; un
  agent ne l'exécute jamais ; le verdict garde qui l'a donné et quand —
  contrat à créer
- La promotion refuse une candidate sans verdict, ou refusée ; approuvée,
  avec ou sans réserves, elle crée la release définitive sur le même
  commit avec le même tarball (même empreinte), les réserves listées dans
  la note de release ; chaque réserve et chaque refus devient une issue,
  que la recette « corriger un défaut » dit comment ranger : défaut à
  corriger (une régression) ou intention (un manque) — contrat à créer
- Les README pointent vers la dernière version validée par un lien fixe
  (`releases/latest`), qui ne montre jamais une pré-release : aucun commit
  à chaque version — contrat à créer
- Livré à tout projet avec le module de release ; `--dry-run` montre la
  fiche et ce que ferait la promotion sans rien publier — contrat à créer

## 2. Hors périmètre

- Une version HTML de la fiche : plus tard, depuis la même source.
- La vue de relecture d'une PR (`docs/intentions/vue-de-relecture.md`) et
  l'acceptation critère par critère
  (`docs/intentions/acceptation-par-critere.md`).
- La publication sur le registre npm.

## 3. Contraintes

- Livré à tout projet (QUA-018, dépôt ou livrable : décidé par le
  demandeur le 2026-10-18) : on édite le gabarit, puis
  `npm run installer-depot` ; jamais une copie installée.
- Le module de release reste optionnel et ne modifie aucun fichier suivi
  (QUA-017, pas de travail direct sur la branche principale) : fiche et
  verdict vivent sur la release GitHub, jamais dans un commit.
- Ne cite que des sources existantes (journal, trailers, `drwil verify
  --evidence`, registre des contrats) ; aucune donnée nominative au-delà
  de l'identité GitHub de qui donne le verdict.
- Hooks à 100 % de couverture (QUA-004) ; fichiers de code sous 400 lignes
  (QUA-001) : génération, verdict et promotion sont des fichiers à part,
  pas des ajouts à `.githooks/create-release.mjs`.

## 4. Décisions

- **2026-10-18 — Générée, jamais écrite à la main ; une par version**
  (recommandation de l'agent dans l'intention, cadrée par le demandeur).
- **2026-10-18 — Markdown joint à la release** (demandeur, sur
  recommandation de l'agent) : GitHub l'affiche sans outil.
- **2026-10-18 — Une issue par point refusé ou réservé** (demandeur, sur
  recommandation de l'agent) : l'agent la range ensuite en défaut à
  corriger ou en intention.
- **2026-10-18 — Livrée à tout projet** (demandeur, contre la
  recommandation de l'agent d'éprouver d'abord dans ce dépôt) ; avec le
  module de release, qui reste optionnel (agent).
- **2026-10-18 — Approbation avant publication** (demandeur) : candidate
  en pré-release, verdict, puis promotion du même tarball.
- **2026-10-18 — Verdict par une commande humaine** (demandeur, contre la
  recommandation de l'agent d'un formulaire d'issue), comme `drwil
  attest` ; enregistré sur la release GitHub, pour ne rien commiter
  (agent).
- **2026-10-18 — Approuvée avec réserves = promue** (demandeur, sur
  recommandation de l'agent), réserves listées.
- **2026-10-18 — README : lien fixe `releases/latest`** (demandeur, sur
  recommandation de l'agent).
- Contrats concernés : des contrats créés (candidate et fiche, verdict,
  promotion, lien), QUA-018 (dépôt ou livrable), QUA-017 (pas de travail
  direct sur la branche principale), QUA-004 et QUA-001.

## 5. Points à trancher

Aucun.

## 6. Increments

- **Lot 1 — la fiche** [IA] : « à valider » et non-régression, depuis le
  dernier tag définitif ; `--dry-run`.
- **Lot 2 — la candidate** [IA] : pré-release avec tarball et fiche.
- **Lot 3 — le verdict** [IA] : commande humaine, enregistrée sur la
  candidate ; `AGENTS.md`.
- **Lot 4 — la promotion** [IA] : release définitive du même tarball,
  réserves dans la note, issues ; tri dans la recette « corriger un
  défaut » ; lien `releases/latest` dans les README.
  Critère de sortie de chaque lot : `node .githooks/run-checks.mjs` vert ;
  du chantier : `drwil verify --agent` en `GOVERNANCE: PASS`. Éprouvé en
  réel sur la release 0.6.5.

## 7. Reprise

- **Dernier état** (2026-10-18) : cadré, rien de construit.
- **Travail non commité** : aucun.
- **Prochaine étape** : [humain] lancer le chantier (`/drwil-start`),
  avant la release 0.6.5.

# Projet : fusion autorisée au lancement — un seul geste humain par chantier

**Statut** : cadré le 2026-10-10 — décisions prises ; lot 0 [humain], puis lot 1 à lancer.
**Risque** : HIGH

<!-- cadrage
fichiers:
  - .githooks/etat.mjs
  - .githooks/etat.test.mjs
  - packages/drwil/templates/common/base/.githooks/etat.mjs
  - packages/drwil/templates/common/base/.githooks/etat.test.mjs
  - .claude/hooks/saisie-drwil.mjs
  - packages/drwil/templates/common/tools/claude/.claude/hooks/saisie-drwil.mjs
  - .claude/skills/lancer-un-chantier/SKILL.md
  - packages/drwil/templates/fr/tools/claude/.claude/skills/lancer-un-chantier/SKILL.md
  - packages/drwil/templates/en/tools/claude/.claude/skills/start-a-chantier/SKILL.md
  - packages/drwil/templates/fr/base/docs/ia-first.md
  - packages/drwil/templates/en/base/docs/ia-first.md
  - docs/recettes/travailler-en-branche.md
  - packages/drwil/templates/fr/base/docs/recettes/travailler-en-branche.md
  - packages/drwil/templates/en/base/docs/recipes/working-with-branches.md
  - packages/drwil/test/kit.test.mjs
-->

(cadrage : l'état de gouvernance, le hook qui lit le sondage, le skill de
lancement, la doctrine et la recette de branche, côté dépôt et côté
gabarit — QUA-018 (périmètre explicite : dépôt drwil vs livrable
gabarit).)

## 1. Besoin

Demande du 2026-10-10 : se passer du geste humain de fusion. Constat du
même jour :

- l'agent fusionne déjà avec le jeton `gh` du mainteneur ; le geste humain
  se réduit à dire « oui » une fois la CI verte, sans relecture réelle ;
- le ruleset de `master` (`docs/projets/proteger-master.md`) garantit
  déjà une PR, des checks verts et une branche à jour ;
- la doctrine fait pourtant de la fusion **la** décision d'acceptation
  humaine (section « Lancer et clore » de
  `packages/drwil/templates/fr/base/docs/ia-first.md`).

Voie intermédiaire, avant la fabrique autonome
(`docs/intentions/fabrique-autonome.md`) : **déplacer la décision
d'acceptation au lancement**. En lançant, l'humain peut autoriser à
l'avance la fusion du chantier ; l'agent programme alors la fusion
automatique de GitHub (`gh pr merge --auto`), qui ne fusionne qu'une fois
les checks exigés passés. Un seul geste humain par chantier au lieu de
deux ; la décision reste humaine, prise avant le travail.

## 2. Hors périmètre

- L'autonomie sans décision humaine (fabrique autonome : identité de
  l'agent, CODEOWNERS en revue obligatoire, `verify` en CI, mutation).
- Tout contournement du ruleset : la fusion automatique attend les mêmes
  checks qu'une fusion manuelle.

## 3. Contraintes

- La décision doit être **humaine et non simulable** : même exigence que
  le lancement (réponse au sondage lue par un hook, jamais pré-remplie).
- Réglage du dépôt : « Allow auto-merge » est **désactivé** aujourd'hui
  (`allow_auto_merge=false`) ; geste humain dans les réglages GitHub.
- La CI rejoue `.githooks/run-checks.mjs` et les tests du kit, **pas**
  `drwil verify` : l'évidence de verify reste locale (exigée pour clore).
- Limite connue : tant que l'agent partage l'identité du mainteneur, rien
  ne l'empêche techniquement de fusionner sans autorisation ; la garantie
  reste comportementale (consigne), comme aujourd'hui.

## 4. Décisions

- **2026-10-10 — Voie intermédiaire d'abord** : déplacer la décision de
  fusion au lancement, avant toute autonomie complète. [décision
  utilisateur]
- **2026-10-10 — Autorisation dans le sondage** (point 5) : seconde
  question du sondage de lancement, réponse lue par le hook et enregistrée
  dans l'état local (que l'agent ne peut pas écrire). [décision
  utilisateur]
- **2026-10-10 — Condition : verify PASS** (point 5) : CI verte (ruleset)
  et évidence de verify PASS ou ATTESTED, comme pour clore ; tous niveaux
  de risque, HIGH compris. [décision utilisateur]
- **2026-10-10 — En CLOTURE** (point 5) : l'agent programme
  `gh pr merge --auto` après verify et le push de la clôture. [décision
  utilisateur]
- **2026-10-10 — Suppression automatique des branches** (point 5) :
  « Automatically delete head branches » activé au lot 0. [décision
  utilisateur]

## Contrats concernés

- **QUA-019** — Pas de contournement : la fusion automatique passe par le
  ruleset, jamais à côté.
- **QUA-017** — Pas de travail direct sur la branche principale : seule
  une PR verte atterrit sur `master`.

## 5. Points à trancher

- ~~Les quatre points~~ — tranchés le 2026-10-10 (voir « Décisions »).

## 6. Lots

- **Lot 0 — réglages du dépôt** [humain] : activer « Allow auto-merge » et
  « Automatically delete head branches ». Critère de sortie :
  `gh api repos/wdubilly/drwil` répond `allow_auto_merge=true` et
  `delete_branch_on_merge=true`.
- **Lot 1 — autorisation au lancement** [IA] : question du sondage,
  lecture par le hook, champ dans l'état ; consigne du skill et de la
  règle CLOTURE (programmer `gh pr merge --auto` seulement si autorisé) ;
  doctrine et recette à jour. Critère de sortie : tests (autorisation
  enregistrée seulement par la réponse humaine ; sondage pré-rempli
  refusé ; sans autorisation, consigne inchangée) ; contrôles et CI verts.
- **Lot 2 — essai réel** [humain + IA] : un chantier lancé avec
  autorisation va jusqu'à la fusion sans second geste. Critère de sortie :
  PR fusionnée par GitHub après CI verte, sans intervention.

## 7. Reprise

- **Dernier état** (2026-10-10) : fiche cadrée, rien de réalisé.
- **Travail non commité** : aucun.
- **Prochaine étape** : [humain] lot 0 ; puis `/drwil-lancer`.

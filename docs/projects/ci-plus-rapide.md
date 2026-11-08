# Projet : une CI plus rapide, pour le dépôt et pour l'adoptant

**Statut** : cadré le 2026-11-08.
**Risque** : HIGH
**Maturité** : à affiner
**Intention** : `docs/intentions/suivi-ci-et-contexte.md`

<!-- scope
files:
  - .github/workflows/ia-first.yml
  - .github/scripts/workflows-yaml.test.mjs
  - packages/drwil/templates/common/ci/github/.github/workflows/ia-first.yml
  - packages/drwil/templates/common/ci/gitlab/.gitlab-ci.yml
  - .githooks/base-checks.mjs
  - .githooks/base-checks.test.mjs
  - .githooks/run-checks.mjs
  - .githooks/run-checks.test.mjs
  - .githooks/run-checks-verdicts.mjs
  - .githooks/engine.mjs
  - outils/miroirs.mjs
  - packages/drwil/test/kit.test.mjs
  - docs/contracts.md
  - .drwil/ia-first.json
  - docs/projects/ci-plus-rapide.md
  - docs/projects/pending.md
  - docs/projects/journal.md
-->

## 1. Besoin

Le job `checks` met 6 à 7 minutes sur un push (mesures du 2026-11-08 : 367 à 441 s), et **12 à 15 minutes sur
une PR de code** (733 à 891 s). Presque tout ce temps est dans `node .githooks/run-checks.mjs` (356 à 430 s) ;
l'installation, le checkout et gitleaks sont négligeables, sauf quand le téléchargement de gitleaks échoue (504 du
2026-11-08, CI rouge deux fois sans rapport avec le code).

Cinq causes (quatre mesurées ou relevées, une à mesurer) :

1. **Double passage sur une PR de code** : le rejeu avec les hooks de la branche principale (QUA-113,
   `.githooks/base-checks.mjs`) refait toute la passe, sans reprendre aucun verdict (QUA-250 ne vaut que pour le premier
   passage).
2. **Le push sur la branche principale rejoue tout**, alors que la PR vient de prouver le même arbre.
3. **`run-checks` lui-même est lent** : « drwil: build + tests + seuil de couverture » 206 s, « tests des contrôles
   eux-mêmes » 92 s, « hooks de gouvernance : tests + couverture » 79 s ; en local `miroirs-gabarit` rejoue le banc
   (34 s) déjà couvert par `tests-qua-101` à `109` (note du 2026-11-08, « Accélérer run-checks »).
4. **Installations répétées, à mesurer** : le contrôle `tarball` (`outils/tester-tarball.mjs`) fait `npm pack` puis
   `npm install` depuis le registre dans un projet vierge à chaque passe, et le banc (`outils/banc-run.mjs`) fait de
   même ; le premier `npm ci` du job, lui, est négligeable (mesuré). Le lot 1 chiffre ces installations et dit
   lesquelles se reprennent par cache ou par empreinte (QUA-141).5. **Un lancement de test par contrat** (QUA-033) : les 238 contrôles `tests-qua-*` relancent chacun
   `node --test --test-name-pattern` sur les gros fichiers de test (`packages/drwil/test/kit.test.mjs` 66 fois,
   `.githooks/state.test.mjs` 29 fois…), soit 491 s de temps cumulé (relevé local, en parallèle sur 8 cœurs), alors que les
   suites complètes (couverture, `checks-self-test`) rejouent déjà ces mêmes tests. Leurs `paths` (`packages/drwil/**`,
   `.githooks/**`) font aussi qu'un changement de code les invalide presque tous, donc la reprise (QUA-141, QUA-250)
   sert peu sur une PR de code. Piste : une seule exécution par fichier, avec un reporter qui donne le verdict par ID de
   contrat.

Ce qui est livré à l'adoptant (les CI du gabarit GitHub et GitLab, `.githooks/base-checks.mjs`, `.githooks/run-checks.mjs`, le moteur)
doit en bénéficier : un projet adopté paie aujourd'hui le même double passage, le même 504 de gitleaks, et n'a pas le
parallélisme (`parallel`) par défaut.

## Critères d'acceptation

- Sur une PR, le rejeu avec les hooks de la branche principale reprend le verdict de chaque contrôle dont les hooks et
  l'empreinte sont identiques à ceux déjà joués : une PR de code ne paie plus deux passes complètes, et un hook affaibli
  reste refusé — contrat à créer
- Un push sur la branche principale dont l'arbre est celui d'une PR verte ne rejoue pas les contrôles et le dit ; dans
  tout autre cas il rejoue tout, et le suivi de la CI de la branche principale (QUA-251) reste exact — contrat à créer
- Les plus gros contrôles de `run-checks` sont plus rapides sans perdre une preuve : la durée du job `checks` sur une
  PR de code passe sous la cible de la section 4, mesurée avant et après — contrat à créer
- Le téléchargement de gitleaks se remet de ses échecs passagers (nouvelles tentatives, y compris sur une erreur HTTP,
  et cache de l'archive vérifiée par son empreinte) dans les trois CI : celle du dépôt, celle du gabarit GitHub et
  celle du gabarit GitLab — contrat à créer
- Un projet adopté reçoit ces gains : les CI du gabarit portent les mêmes mécanismes, et un projet d'essai installé
  depuis le paquet le prouve — contrat à créer

## Contrats modifiés

Aucun à ce stade ; QUA-033 (« un contrôle par règle »), QUA-250 (« le push sur la branche principale rejoue tout ») et QUA-113 (« rejoue les contrôles »)
seront probablement touchés : une puce, validée par le demandeur, sera ajoutée avant le lancement.

## 2. Hors périmètre

- Contrôle lent seulement sur les chemins touchés (`docs/intentions/controle-lent-chemin-critique.md`) : intention à part.
- Découper le job `checks` en plusieurs jobs (`ciJob`) : il renommerait les checks exigés par le ruleset de `master`.
- La matrice des OS (QUA-045, QUA-268) : déjà faite.
- Cache de compilation : à mesurer d'abord, à noter en intention s'il pèse.

## 3. Contraintes

- QUA-018 : on édite le gabarit puis `npm run installer-depot` ; ce qui est propre au dépôt (`miroirs-gabarit`, le
  ruleset) reste hors livrable et le dit.
- Aucune preuve perdue : un contrôle repris l'est sur une empreinte identique (QUA-141), jamais sur une supposition ;
  la barrière QUA-113 doit continuer à refuser un hook affaibli (scénario de contournement existant).
- Un changement de CI, de barrière ou de hook attend le oui du demandeur à la déclaration « Contrats modifiés » ; les
  noms de checks exigés par le ruleset (`checks`, `kit-tests (<os>)`) ne changent pas.
- Avant/après mesurés par l'API REST des runs (`started_at`/`completed_at` par étape), consignés dans la fiche.

## 4. Décisions

- 2026-11-08 : un seul chantier regroupe `run-checks`, le rejeu QUA-113, le push sur `master` et gitleaks ; tout ce
  qui se livre doit profiter à l'adoptant.
- 2026-11-08 : le gabarit active `parallel` par défaut chez l'adoptant.
- 2026-11-08 : push sur la branche principale — saut total des contrôles quand l'arbre est identique à celui d'une
  PR verte ; le job rapporte quand même « succès » sous son nom exigé et dit pourquoi, pour que la CI de la
  branche principale reste « verte » aux yeux de QUA-251.
- 2026-11-08 : parallélisme limité à la moitié des cœurs, deux au moins (comportement actuel du moteur).
- 2026-11-08 : cible de durée non fixée par le demandeur ; l'agent propose, après la mesure du lot 1, au moins
  la moitié du temps actuel d'une PR de code (visée : 8 min au plus), à confirmer par le demandeur.

## 5. Points à trancher

- [décision] Confirmer la cible de durée (visée 8 min au plus) après la mesure du lot 1.
- [décision] Comment établir « arbre identique à celui d'une PR verte » au push : empreinte de l'arbre Git
  (`git rev-parse HEAD^{tree}`) lue dans la preuve de la dernière CI de PR verte ? À trancher au lot 3, avec le
  risque d'un merge qui change l'arbre (PR non à jour avec `master`) : alors tout est rejoué.

## 6. Increments

- **Lot 1 — mesure et gitleaks** [IA] : durée par contrôle en CI, notée dans la fiche ; gitleaks avec nouvelles
  tentatives et cache dans les trois CI. Critère de sortie : tests des workflows verts, `GOVERNANCE: PASS`.
- **Lot 2 — rejeu QUA-113 avec reprise** [IA] : verdicts repris dans `.githooks/base-checks.mjs`, scénario de contournement
  inchangé. Critère de sortie : PR de code d'essai sous la cible, hook affaibli toujours refusé.
- **Lot 3 — push sur la branche principale** [IA] : saut du rejeu sur arbre déjà prouvé, filet QUA-251 intact.
- **Lot 4 — `run-checks` plus rapide** [IA] : un lancement par fichier de test au lieu d'un par contrat (QUA-033,
  règle enseignée à l'adoptant par QUA-030, donc livrée avec lui), `miroirs-gabarit` (42 s) allégé, `checks-self-test` (77 s) examiné (même double emploi avec les tests des hooks ?), tests lents parallélisés, fichiers
  temporaires nettoyés. Critère de sortie : durée sous la cible, couverture inchangée (QUA-004).

## 7. Reprise

- **Dernier état** (2026-11-08) : cadré, mesures faites, décisions prises (section 4), rien de réalisé.
- **Prochaine étape** : [décision] commiter le cadrage, puis lancer le chantier.

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
  - packages/drwil/templates/common/base/.githooks/base-checks.mjs
  - .githooks/base-checks.test.mjs
  - .githooks/run-checks.mjs
  - .githooks/run-checks.test.mjs
  - .githooks/run-checks-verdicts.mjs
  - .githooks/engine.mjs
  - outils/miroirs.mjs
  - packages/drwil/test/kit.test.mjs
  - docs/contracts.md
  - .drwil/ia-first.json
  - packages/drwil/templates/common/base/.githooks/engine.mjs
  - packages/drwil/templates/common/base/.githooks/run-checks.mjs
  - .githooks/engine.test.mjs
  - outils/tests-par-fichier.mjs
  - outils/tests-par-fichier.test.mjs
  - docs/architecture.md
  - docs/projects/ci-plus-rapide.md
  - docs/projects/pending.md
  - docs/projects/journal.md
  - .github/workflows/banc.yml
  - outils/banc.test.mjs
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
doit en bénéficier : un projet adopté paie aujourd'hui le même double passage et le même 504 de gitleaks.

## Critères d'acceptation

- Sur une PR, le rejeu avec les hooks de la branche principale reprend le verdict de chaque contrôle dont les hooks et
  l'empreinte sont identiques à ceux déjà joués : une PR de code ne paie plus deux passes complètes, et un hook affaibli
  reste refusé — `QUA-113`
- Un push sur la branche principale dont l'arbre est celui d'une PR verte ne rejoue pas les contrôles et le dit ; dans
  tout autre cas il rejoue tout, et le suivi de la CI de la branche principale (QUA-251) reste exact — `QUA-250`
- Le téléchargement de gitleaks se remet de ses échecs passagers (nouvelles tentatives, y compris sur une erreur HTTP,
  et cache de l'archive vérifiée par son empreinte) dans les trois CI : celle du dépôt, celle du gabarit GitHub et
  celle du gabarit GitLab — `QUA-269`
- Un projet adopté reçoit ces gains : les CI du gabarit portent les mêmes mécanismes, et un projet d'essai installé
  depuis le paquet le prouve — `QUA-270`

## Contrats modifiés

- `QUA-033` — ancien critère : chaque contrat qui cite des tests a son propre contrôle `tests-<id>`, qui rejoue les
  fichiers de son champ Tests filtrés par son ID — raison : un seul lancement par fichier de test, avec un verdict par
  ID de contrat, pour ne plus payer 238 lancements (lot 4) (validé par le demandeur le 2026-11-08)
- `QUA-250` — ancien critère : le push sur la branche principale rejoue tout et seul écrit les verdicts — raison : un
  push dont l'arbre est celui d'une PR verte saute le rejeu et le dit (lot 3) ; au lot 1, la preuve « aucun cache »
  du gabarit GitLab devient « aucun cache des verdicts » (l'archive de gitleaks, vérifiée par sa somme, est cachée)
  (validé par le demandeur le 2026-11-08)
- `QUA-109` — ancien critère : l'étape gitleaks du banc télécharge et vérifie l'archive à chaque passe — raison : l'archive est
  cachée sous la version épinglée (clé sans hash), la somme restant vérifiée à chaque passe ; étape identique à celle du job
  `checks` de la CI du dépôt (limite hors cadre du lot 1, « Handle now » de l'humain le 2026-11-08)
- `QUA-113` — ancien critère : la CI rejoue toute la passe avec les hooks de la branche principale — raison : le rejeu
  reprend le verdict de chaque contrôle dont les hooks et l'empreinte sont identiques, un hook affaibli restant refusé
  (lot 2) (validé par le demandeur le 2026-11-08)
- `QUA-136` — ancien critère : le classement des durées par contrôle n'est écrit qu'en fin de fichier de détail
  (`.drwil/evidence/run-checks.log` (si présent)) — raison : en CI ce fichier ne survit pas au job, le classement complet est aussi dans
  la sortie, avant le résumé (limite hors cadre du lot 1, « Traiter maintenant » de l'humain le 2026-11-08) (validé par le demandeur le 2026-11-08)
- `.githooks/base-checks.mjs` — reprise des verdicts au rejeu par la branche principale, un hook affaibli restant refusé (lot 2, QUA-113) (validé par le demandeur le 2026-11-08)
- `.githooks/base-checks.test.mjs` — tests de la reprise des verdicts au rejeu et des branches que la couverture ne voyait pas (lot 2, QUA-113) (validé par le demandeur le 2026-11-08)
- `.githooks/engine.mjs` — le moteur pose l'identifiant de passe qui partage les résultats par fichier de test (lot 4, QUA-033) (validé par le demandeur le 2026-11-08)
- `.githooks/engine.test.mjs` — tests du moteur et de la voie partagée de `checks-self-test` (lot 4, QUA-033) (validé par le demandeur le 2026-11-08)
- `.githooks/run-checks.mjs` — lanceur par fichier de test (lot 4, QUA-033) et classement complet des durées par contrôle en CI (limite 1, QUA-136) (validé par le demandeur le 2026-11-08)
- `.githooks/run-checks.test.mjs` — tests du lanceur par fichier et du classement des durées en CI (lot 4, QUA-033 ; limite 1, QUA-136) (validé par le demandeur le 2026-11-08)

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
- 2026-11-08 : push sur la branche principale — saut total des contrôles quand l'arbre est identique à celui d'une
  PR verte ; le job rapporte quand même « succès » sous son nom exigé et dit pourquoi, pour que la CI de la
  branche principale reste « verte » aux yeux de QUA-251.
- 2026-11-08 : parallélisme limité à la moitié des cœurs, deux au moins (comportement actuel du moteur).
- 2026-11-08 : la cible de durée du job `checks` sur une PR de code est un **objectif suivi** (visée : 8 min au
  plus), jamais un seuil : aucun contrôle ne fait échouer la CI sur la durée (décision du demandeur, par sondage).
- 2026-11-08 : « arbre identique à celui d'une PR verte » (lot 3) s'établit par l'empreinte `git rev-parse HEAD^{tree}`
  lue dans la preuve de la dernière CI de PR verte (décision du demandeur, par sondage) ; si le merge change l'arbre
  (PR non à jour), tout est rejoué.

## 5. Points à trancher

- ~~Cible de durée~~ : tranché le 2026-11-08, objectif suivi de 8 min, jamais un seuil (section 4).
- ~~Arbre identique à celui d'une PR verte~~ : tranché le 2026-11-08, empreinte `git rev-parse HEAD^{tree}` lue dans la
  preuve de la dernière CI de PR verte (section 4).

## Mesures du lot 1 (2026-11-08, API REST des runs, étapes du job `checks`)

| Run | Événement | `npm ci` | `run-checks` | Rejeu QUA-113 | Gitleaks |
|---|---|---|---|---|---|
| 42470247549 | push `master` | 2 s | 369 s | 0 s (saut) | < 1 s |
| 42465180967 | PR de code | 3 s | 437 s | 441 s | < 1 s |
| 42426518816 | PR de code | — | 435 s | 439 s | < 1 s |

Hors `run-checks` et rejeu, chaque étape dure moins de 3 s : checkout, installation et gitleaks sont négligeables
quand le téléchargement réussit. La CI ne donne que les trois contrôles les plus lents de la passe (le détail par
contrôle reste dans `.drwil/evidence/run-checks.log` (si présent), non conservé en CI) : « drwil: build + tests + seuil de
couverture » 172 à 224 s, « tests des contrôles eux-mêmes » 80 à 98 s, « hooks de gouvernance : tests + couverture »
67 à 81 s. Une PR de code paie donc deux passes complètes (~880 s) ; objectif suivi : 8 min (480 s), jamais un seuil.
Les installations du contrôle `tarball` et du banc (cause 4) ne sont pas ventilées en CI : chiffrage reporté au
lot 4, avec l'accès au détail par contrôle.

## 6. Increments

- **Lot 1 — mesure et gitleaks** [IA] : durée par contrôle en CI, notée dans la fiche ; gitleaks avec nouvelles
  tentatives et cache dans les trois CI. Critère de sortie : tests des workflows verts, `GOVERNANCE: PASS`.
- **Lot 2 — rejeu QUA-113 avec reprise** [IA] : verdicts repris dans `.githooks/base-checks.mjs`, scénario de contournement
  inchangé. Critère de sortie : durée d'une PR de code d'essai mesurée, hook affaibli toujours refusé.
- **Lot 3 — push sur la branche principale** [IA] : saut du rejeu sur arbre déjà prouvé, filet QUA-251 intact.
- **Lot 4 — `run-checks` plus rapide** [IA] : un lancement par fichier de test au lieu d'un par contrat (QUA-033,
  règle enseignée à l'adoptant par QUA-030, donc livrée avec lui), `miroirs-gabarit` (42 s) allégé, `checks-self-test` (77 s) examiné (même double emploi avec les tests des hooks ?), tests lents parallélisés, fichiers
  temporaires nettoyés. Critère de sortie : durée mesurée avant et après (objectif suivi de la section 4), couverture inchangée (QUA-004).

## 7. Reprise

- **Dernier état** (2026-11-08) : lot 1 fait. Gitleaks : nouvelles tentatives (`--retry 5 --retry-all-errors`) et cache
  de l'archive sous sa version épinglée (somme vérifiée à chaque passe) dans les trois CI ; tests des workflows verts ; mesures
  consignées ci-dessus. Décisions ouvertes tranchées (section 4), puce « Contrats modifiés » ajoutée.
- **Limites hors cadre du lot 1 : traitées** (2026-11-08, « Handle now » de l'humain au sondage `drwil-limite`, commit séparé) :
  (1) en CI, `run-checks` affiche le classement complet des durées par contrôle dans sa sortie, avant le résumé (hors CI,
  inchangé : trois plus lents au résumé, classement au détail) — gabarit `packages/drwil/templates/common/base/.githooks/run-checks.mjs`
  (QUA-018, puis `npm run installer-depot`), miroir `.githooks/run-checks.mjs`, test `.githooks/run-checks.test.mjs` ; contrat QUA-136
  précisé ; (2) l'archive gitleaks est cachée (`actions/cache@v6`, clé `gitleaks-8.21.2-linux-x64`, somme vérifiée à chaque passe)
  dans le job `checks` et dans `.github/workflows/banc.yml`, étape d'installation identique (QUA-109, `outils/banc.test.mjs` compare
  aussi le cache) ; contrat QUA-109 mis à jour. **Chemins ajoutés au bloc `scope`** (QUA-214) : `.github/workflows/banc.yml` et
  `outils/banc.test.mjs` (cache de l'étape identique exigée par QUA-109) ; le gabarit de `run-checks` y était déjà (lot 4).
  Gain du cache non mesuré (la CI seule le dit).
- **Limite hors cadre du lot 1 (2)** : *(traitée, voir ci-dessus)* le job `checks` du dépôt ne cachait pas l'archive : son étape gitleaks doit rester
  identique à celle de `.github/workflows/banc.yml` (test QUA-109, `outils/banc.test.mjs`), tous deux alors absents du bloc `scope`.
- **Limite hors cadre du lot 1** : *(traitée, voir ci-dessus)* la durée par contrôle en CI exigeait d'afficher le classement complet dans la sortie
  de `run-checks` (en CI), donc de modifier le gabarit `packages/drwil/templates/common/base/.githooks/run-checks.mjs`
  (source de `.githooks/run-checks.mjs`, QUA-018).
- **Lot 2 fait** (2026-11-08) : le rejeu QUA-113 demande la reprise (`DRWIL_CI_REUSE=1`) des verdicts que la première
  passe de la PR vient de laisser ; un contrôle « ok » dont l'empreinte propre est identique sous les hooks de la base
  est repris, les autres rejoués (un hook affaibli lu par un contrôle change son empreinte : refusé comme avant).
  Quand la pose change le moteur de `run-checks` (modules importés depuis `.githooks/run-checks.mjs` de la base,
  suivis par Git), rien n'est repris (`--tout-rejouer`) : ce moteur écrit les verdicts. Contrats QUA-113 et QUA-250 mis à jour.
  Chemin ajouté au bloc `scope` : `packages/drwil/templates/common/base/.githooks/base-checks.mjs`, source du hook
  (QUA-018 : on édite le gabarit puis `npm run installer-depot`). Gain réel à mesurer sur la prochaine PR de code
  (critère « durée d'une PR d'essai mesurée » : non mesuré ici, la CI seule le dit).
- **Lot 3 fait** (2026-11-08) : sur GitHub (CI du dépôt et du gabarit), le job `checks` d'une PR dépose en dernière étape
  l'artefact `arbre-prouve` (`proven-tree` dans le gabarit), l'empreinte `git rev-parse HEAD^{tree}` qu'il vient de jouer ;
  un push sur la branche principale la lit dans le run `pull_request` vert le plus récent de la tête de la PR qui contient
  son commit et, si l'arbre est identique, saute installation, gitleaks et `run-checks` en le disant (`::notice::`) ; sinon
  (aucune PR, run non vert, artefact absent ou expiré, arbre différent) tout est rejoué. Le job reste « succès » sous son nom
  exigé : QUA-251 et `alert-if-ci-broken` inchangés. Contrat QUA-250 mis à jour ; test des workflows ajouté. Aucun chemin
  ajouté au bloc `scope`. Gain réel à mesurer au premier push sur `master` après la fusion (la CI seule le dit ; l'artefact
  n'existe qu'à partir de la première PR portant ce workflow).
- **GitLab, non fait au lot 3** (dans le cadre, mais non prouvable ici) : la CI GitLab du gabarit rejoue tout sur la branche
  principale. Retrouver le pipeline de la MR fusionnée et lire son artefact passe par des API (pipelines, jobs) que le jeton
  de job n'ouvre pas partout, et rien ici ne les essaie : sauter sans preuve violerait QUA-013. Le contrat le dit ; à
  reprendre quand un GitLab d'essai existe.
- **Lot 4 fait** (2026-11-08) : un lanceur, `outils/tests-par-fichier.mjs`, remplace les 238 `node --test --test-name-pattern`
  de `tests-qua-*` : chaque fichier de test n'est joué qu'une fois par passe (`DRWIL_PASS_ID`, posé par `checks()` du moteur ;
  résultats partagés sous `.drwil/evidence/passe` (si présent), effacé en fin de passe par `run-checks`), un reporter laisse le résultat de
  chaque test, lu ensuite par ID de contrat. Aucun test à l'ID, ou fichier qui n'a rien joué : échec (QUA-013). `miroirs-gabarit`
  lit les tests de `outils/` par la même exécution (`--tous`, motif développé par le lanceur) au lieu de les rejouer ;
  `checks-self-test` y passe aussi quand le lanceur existe (dépôt drwil seulement : un projet adopté n'a ni lanceur ni tests des
  hooks), donc les tests de `.githooks/` ne sont plus joués deux fois. Contrat QUA-033 mis à jour ; tests ajoutés (lanceur,
  moteur) ; test de `.githooks/base-checks.mjs` ajouté pour trois branches du lot 2 que la couverture à 100 % des hooks ne voyait pas.
  **Mesure locale** (8 cœurs, `run-checks --tout-rejouer`, passe hors contrôles confiés à la CI : couvertures, build, tarball) :
  avant 352 s (CPU 18,4 min), après 182 s (CPU 6,8 min). Non mesuré en CI (la CI seule le dit, 4 cœurs, deux contrôles en parallèle).
  Couverture inchangée (QUA-004) : hooks 100 % (621 tests), paquet (355 tests) verts.
  **Chemins ajoutés au bloc `scope`** (QUA-214) : `outils/tests-par-fichier.mjs` et son test (le lanceur, nouveau) ;
  `packages/drwil/templates/common/base/.githooks/engine.mjs` et `packages/drwil/templates/common/base/.githooks/run-checks.mjs` (sources de `.githooks/engine.mjs` et
  `.githooks/run-checks.mjs`, QUA-018 : on édite le gabarit puis `npm run installer-depot`) ; `.githooks/engine.test.mjs` (test de la
  voie partagée de `checks-self-test`) ; `docs/architecture.md` (QUA-040 : la carte cite le nouveau lanceur). outils/miroirs.mjs,
  cité au bloc, n'existe pas : rien n'y a été modifié.
- **Limites** : le plus gros fichier (`packages/drwil/test/kit.test.mjs`, ~200 s en série) est joué d'un bloc, donc il borne
  la durée de la passe : le couper (ou rendre ses tests concurrents) serait un autre chantier ; un contrôle qui attend le
  résultat d'un fichier joué par un autre occupe un créneau de `parallel` sans calculer. Les doubles emplois qui restent :
  les couvertures (`couverture-tests`, `couverture-hooks`) rejouent les mêmes tests sous c8 (non partageables).

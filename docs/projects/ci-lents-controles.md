# Projet : les contrôles lents (e2e Playwright) sont accélérés par la CI livrée

**Statut** : cadré le 2026-11-08 ; décisions D1 à D7 tranchées le 2026-11-08 par le demandeur.
**Risque** : HIGH
**Maturité** : prêt
**Intention** : `docs/intentions/ci-rapide-epreuves-reelles.md` (suite : la CI rapide livrée n'aide pas un projet dont un contrôle lent domine la CI)

<!-- scope
files:
  - packages/drwil/templates/common/ci/github/.github/workflows/ia-first.yml
  - packages/drwil/templates/common/ci/gitlab/.gitlab-ci.yml
  - packages/drwil/templates/common/base/.githooks/engine.mjs
  - packages/drwil/templates/common/base/.githooks/engine-shards.mjs
  - packages/drwil/templates/common/base/.githooks/engine-texts.mjs
  - packages/drwil/templates/common/base/.githooks/run-checks.mjs
  - packages/drwil/templates/common/base/.githooks/run-checks-verdicts.mjs
  - packages/drwil/templates/common/base/.githooks/run-checks-shards.mjs
  - packages/drwil/templates/common/base/.githooks/run-checks-pr.mjs
  - packages/drwil/templates/common/base/.githooks/run-checks-texts.mjs
  - packages/drwil/templates/common/base/.githooks/base-checks.mjs
  - .githooks/engine.mjs
  - .githooks/engine-shards.mjs
  - .githooks/engine-texts.mjs
  - .githooks/run-checks.mjs
  - .githooks/run-checks-verdicts.mjs
  - .githooks/run-checks-shards.mjs
  - .githooks/run-checks-pr.mjs
  - .githooks/run-checks-texts.mjs
  - .githooks/base-checks.mjs
  - .githooks/engine-shards.test.mjs
  - .githooks/run-checks-shards.test.mjs
  - .githooks/run-checks-pr.test.mjs
  - .githooks/engine.test.mjs
  - .githooks/run-checks.test.mjs
  - .github/workflows/ia-first.yml
  - .github/scripts/workflows-yaml.test.mjs
  - packages/drwil/test/kit.test.mjs
  - packages/drwil/test/ci-shards.test.mjs
  - packages/drwil/CHANGELOG.md
  - docs/contracts.md
  - docs/architecture.md
  - docs/projects/kit-mechanics.md
  - packages/drwil/templates/common/base/docs/projects/kit-mechanics.md
  - docs/projects/journal.md
  - .drwil/ia-first.json
  - outils/miroirs.json
-->

(Le bloc `scope` couvre le gabarit, ses copies installées (`scopeMirrors`), les tests, le registre et la configuration
`.drwil/ia-first.json` où chaque contrat créé déclare son contrôle. `.githooks/engine.mjs` (200 lignes) et
`.githooks/run-checks.mjs` (199 lignes) sont au plafond : la tranche vit dans de nouveaux modules (engine-shards et run-checks-shards),
et ne s'ajoute pas aux fichiers existants au-delà du branchement. Deux modules de plus : la carte d'architecture et
`docs/projects/kit-mechanics.md` les citent. Un nouveau fichier de tests du paquet (ci-shards.test) porte le projet d'essai, `packages/drwil/test/kit.test.mjs`
étant déjà grand ; si l'implémentation montre qu'un autre fichier doit changer, l'élargissement sera un commit séparé. Lot 4 : les deux CI livrées
étaient au plafond de 200 lignes (QUA-157), l'humain a choisi de déplacer dans le moteur la recherche du run précédent et l'identité de la PR/MR :
nouveau module run-checks-pr des hooks, sa copie du gabarit et son fichier de tests (chemins du bloc ci-dessus).)

## 1. Besoin

`drwil_walk` (projet adoptant) a un contrôle e2e Playwright d'environ 10 minutes qui domine une CI de 800 à 1250 s.
La CI rapide livrée (chantier `ci-plus-rapide`, QUA-250, QUA-113, QUA-270) n'y change rien sur une PR ordinaire : une
seule passe, dominée par l'e2e. Le gain existant vise la PR qui ne touche pas un contrôle (documentation) ; une PR de
code change les fichiers (`paths`) de l'e2e, son empreinte (QUA-141) diffère de celle de la branche principale, il est
rejoué en entier, sur une seule machine.

Deux leviers, décidés par le demandeur le 2026-11-08 et traités dans la même fiche, en plusieurs lots :

1. **Sharding** : un contrôle déclaré découpable est joué par N jobs parallèles, une tranche chacun, plus un job
   d'agrégation. Le temps mur d'une CI dominée par l'e2e passe d'environ T à T/N plus le coût fixe d'une tranche
   (installation, build, navigateurs).
2. **Reprise de verdict d'une PR à l'autre** : un contrôle lent ne se rejoue que si l'empreinte de ses `paths` change
   (QUA-141), en reprenant un verdict déjà acquis. Voir l'écart avec QUA-250 ci-dessous.

### Relevé : ce que QUA-250 interdit, et ce qu'il autorise déjà

La demande décrit QUA-250 comme interdisant tout cache de verdicts en CI. Lu en entier (2026-11-08), il fait
l'inverse : sur une PR, la CI **reprend déjà** le verdict de la dernière CI de la branche principale pour chaque
contrôle « ok » dont l'empreinte propre est identique (cache Actions sur GitHub, artefact du dernier pipeline réussi
sur GitLab, via `DRWIL_CI_REUSE=1`). Il interdit :

- que la passe d'une PR relise un verdict qu'elle aurait pu écrire (seul un push sur la branche principale
  sauvegarde les verdicts, et il ne demande jamais la reprise) ;
- tout cache de verdicts GitLab partagé entre branches (un cache partagé pourrait être écrit par une merge request) ;
- toute reprise sans verdict lisible (QUA-013).

Donc « ne rejouer le contrôle lent que si ses `paths` changent, en reprenant le verdict de la branche principale »
est **déjà livré**. Ce qui ne l'est pas, et que ce chantier peut ouvrir :

- (a) la reprise **d'un push à l'autre de la même PR** (la PR pousse un correctif de doc ou de hook, les `paths` de
  l'e2e n'ont pas bougé depuis le push précédent, vert) : exige de lire un verdict écrit par une branche de PR, ce que
  QUA-250 interdit ; c'est la seule vraie ouverture du contrat ;
- (b) un meilleur calibrage des `paths` du contrôle e2e d'un adoptant : c'est le contrôle du projet, hors périmètre.

Le lot de reprise ci-dessous traite donc (a) : le demandeur a rouvert QUA-250 pour cela (D3, 2026-11-08).

## Critères d'acceptation

- Un contrôle déclaré `shards: N` est joué par N jobs parallèles en CI GitHub et GitLab, une tranche chacun, le
  contrôle recevant son numéro et le total par `DRWIL_SHARD_INDEX` et `DRWIL_SHARD_TOTAL` — contrat à créer
- Une tranche absente, en échec, annulée ou jouée deux fois fait échouer l'agrégation ; l'agrégation n'écrit « ok »
  que si les N tranches du même commit sont « ok » — `QUA-013`
- Le job exigé par la protection de branche garde son nom unique et stable, et `alert-if-ci-broken` suit son
  résultat, tranches et agrégation comprises — `QUA-251`
- Aucun contrôle n'est affaibli : un contrôle découpé juge les mêmes fichiers et la même commande que non découpé,
  `drwil verify` et `run-checks` locaux jouent une seule passe sans tranche, et un contrôle sans `shards` est joué
  comme avant — contrat à créer
- Un contrôle lent n'est repris d'une passe de PR à la suivante que sur une empreinte de ses `paths` identique, liée au
  commit et à la configuration du verdict, et rejoué au moindre doute — contrat à créer (D3 tranchée : oui)
- Un verdict de PR ne s'écrit que depuis le job de cette PR, ne se lit que par la même PR sur le même dépôt, et
  son intégrité se vérifie avant reprise (D4 : somme et identité du run) ; un verdict falsifié, d'un autre commit, d'une autre PR ou d'un fork est
  rejoué — contrat à créer (D3 tranchée : oui)
- Un projet d'essai installé depuis le paquet, avec un faux contrôle lent découpé, prouve sur GitHub et sur GitLab : la
  répartition des tranches, l'échec d'une tranche absente, le nom exigé inchangé et le local sans tranche — `QUA-270`
  étendu (preuve de même forme, projet d'essai synthétique ; aucune mesure réelle sur `drwil_walk`)

## Contrats modifiés

(à valider par le demandeur : aucune ligne n'est validée à ce jour, la clôture les refuse tant que le demandeur ne les
a pas validés.)

- `QUA-250` — ancien critère : « la passe de la PR ne relit jamais un verdict qu'elle aurait pu écrire ; seul un push
  sur la branche principale sauvegarde ces verdicts ; aucun cache GitLab partagé » — raison : le lot 4 (D3, tranchée : oui) fait lire
  à une PR le verdict de sa propre passe précédente pour un contrôle lent ; la clause sur la branche principale et sur
  GitLab reste vraie pour tout le reste — à valider par le demandeur
- `QUA-113` — ancien critère : « le rejeu avec les hooks de la branche principale reprend le verdict de la première
  passe de la PR ; le moteur de `run-checks` inchangé » — raison : les tranches rejouent aussi avec les hooks de la
  base (D5) et l'agrégation lit leurs verdicts ; la règle de reprise du rejeu ne change pas — à valider par le demandeur
- `QUA-251` — ancien critère : le job `checks` (`alert-if-ci-broken`) porte la CI de la branche principale — raison :
  le job exigé devient l'agrégateur des tranches ; son nom et la règle ne changent pas, la preuve s'étend aux tranches —
  à valider par le demandeur
- `QUA-270` — ancien critère : « un projet installé reçoit les mécanismes de la CI rapide » — raison : la liste des
  mécanismes reçus s'allonge du découpage et de la reprise d'une PR à l'autre — à valider par le demandeur
- `QUA-208` (réglage `runAt`) : la tranche ne change pas ses règles ; un contrôle `runAt: ["ci"]` découpé reste
  « confié à la CI » en local — à confirmer par le demandeur

## 2. Hors périmètre

- Modifier le contrôle e2e de `drwil_walk` (sa commande, ses `paths`, sa configuration Playwright) : le projet
  l'adapte lui-même, après la livraison du kit.
- Conditionner un contrôle à un changement de fichiers sans preuve : un contrôle n'est jamais sauté sur la foi d'une
  liste de fichiers, seul un verdict identique et lié à une empreinte permet de le reprendre (QUA-013, QUA-141).
- Une mesure réelle sur `drwil_walk` (décision du demandeur : preuve par projet d'essai synthétique).
- Le découpage automatique d'un contrôle qui ne sait pas se découper : le projet déclare `shards` et sa commande lit
  les variables ; le kit ne devine rien.
- La parité GitLab de `pr-watch` et de `merge-auto` (intention `docs/intentions/ci-rapide-epreuves-reelles.md`).
- Un cache de verdicts GitLab partagé : il reste refusé par QUA-250.
- Une alerte avant l'écrasement d'une CI modifiée à la main chez l'adoptant (D7 : comportement actuel gardé).
- Un autre moteur que `run-checks` (`drwil verify` local reprend ses règles actuelles).

## 3. Contraintes

- QUA-018 (dépôt ou livrable) : livrable. Tout vit dans le gabarit (`packages/drwil/templates/`), copié dans ce dépôt
  par `npm run installer-depot` ; on n'édite jamais la copie.
- QUA-013 : un contrôle non exécuté n'est pas passé. Une tranche manquante vaut un échec, jamais un succès par défaut ;
  un job de tranche sauté ou annulé fait échouer l'agrégation.
- QUA-251 : le nom du job exigé par la protection de branche (`checks`) reste unique et stable ; changer ce nom
  casserait la protection de tous les adoptants à la mise à jour.
- QUA-019 : aucun contrôle désactivé, affaibli ou sauté ; le découpage divise le travail, pas l'exigence.
- QUA-141 : la reprise se fait sur l'empreinte propre d'un contrôle ; un contrôle sans `paths` ou `reuse: false` est
  toujours rejoué, découpé ou non.
- QUA-033 pour ce dépôt : un contrôle par règle, `tests-<id>`, chaque fichier de test lancé une fois par passe.
- Plafond de 200 lignes par fichier de code (QUA-001) : nouveaux modules plutôt qu'extension de `.githooks/engine.mjs` et de
  `.githooks/run-checks.mjs`, qui sont à 200 et 199 lignes.
- Node 22, aucune dépendance d'exécution nouvelle. Pas de script de CI hors `.githooks/` et du YAML du gabarit.
- Le local reste inchangé : sans les deux variables, un contrôle se joue en une seule passe, sans tranche.
- Les CI GitHub et GitLab doivent tenir la même règle (parité) ; la préparation ne peut pas dépendre d'un secret.

### Conception retenue (D1 et D2 tranchées)

- **Nom du réglage : `shards: N`** (entier de 2 à 16 par défaut), placé dans la déclaration du contrôle de
  `.drwil/ia-first.json`. Justification : même mot que l'option `--shard` de Playwright (le cas d'origine), de Jest et
  de Vitest, et que `shards` de Cypress/Knapsack ; plus court et moins ambigu que `parallel` (mot-clé GitLab, qui
  dupliquerait des jobs identiques sans notion de tranche) ou `slices`. Refusé hors de la fourchette, non entier, ou
  combiné à `reuse: "tree"` ou à une commande sans lecture des variables (non vérifiable : la commande de la
  déclaration doit citer `DRWIL_SHARD_INDEX`, sinon la déclaration est refusée, pour ne pas jouer N fois le contrôle
  entier).
- **Variables** : `DRWIL_SHARD_INDEX` (de 1 à N, comme `--shard=1/N` de Playwright) et `DRWIL_SHARD_TOTAL`. Exemple de
  commande : `npx playwright test --shard=$DRWIL_SHARD_INDEX/$DRWIL_SHARD_TOTAL`. Le moteur les pose pour le seul
  contrôle découpé, jamais les autres.
- **Moteur** : `run-checks --shard <i>/<N>` ne joue que les contrôles `shards` de leur tranche ; `run-checks
  --without-shards` joue tout le reste et marque les contrôles découpés « confiés aux tranches », non passés. Chaque
  tranche écrit son verdict (nom du contrôle, empreinte, commit, i, N) dans un fichier déposé en artefact.
- **Agrégation** : le job `checks` (nom inchangé) dépend des tranches (`needs`, `if: always()`), télécharge leurs
  verdicts, refuse tout écart (nombre ≠ N, indice dupliqué, commit ou empreinte différents, un « non ok »), puis écrit
  le verdict du contrôle découpé ; seul ce verdict entre dans le fichier de verdicts de `run-checks` (`.drwil/evidence/run-checks-verdicts.json`, si présent) et dans la reprise de QUA-250.
- **Forges** : GitHub : un job `shards` en matrice dont la liste vient d'une étape de plan (`fromJSON`), car le nombre
  vient de la configuration ; GitLab : `parallel:` est statique (D2).

## 4. Décisions

Toutes du demandeur, le 2026-11-08, par sondage :

- Portée : sharding puis reprise de verdict d'une PR à l'autre, dans la même fiche, en plusieurs lots.
- Forges : GitHub et GitLab dès la première version, à parité.
- Preuve : un projet d'essai synthétique installé depuis le paquet, comme le contrat `QUA-270` ; aucune mesure réelle
  sur `drwil_walk`.

## 5. Points à trancher

Risque HIGH : la fiche touche `.githooks/`, la CI et `.drwil/`. Aucun point ouvert : D1 à D7 ont été tranchés par le demandeur le 2026-11-08 ; l'agent n'en a tranché aucun. Reste hors « Points à trancher » la confirmation de `QUA-208` et la validation des contrats modifiés (section « Contrats modifiés »).

- **D1 — nom et forme du réglage** (décision) : `shards: N` ; variables `DRWIL_SHARD_INDEX` /
  `DRWIL_SHARD_TOTAL` de 1 à N ; plafond de N : 16 ; refus d'une commande qui ne cite pas la variable. *Alternative écartée* : un objet `{ "shards": { "count": N } }`, plus extensible, plus lourd. **Tranché le 2026-11-08 (tranché par le demandeur)** : `shards: N` comme proposé, variables de 1 à N, plafond 16, commande qui ignore la variable refusée.
- **D2 — nombre de tranches sur GitLab** : `parallel:` ne se calcule pas depuis le dépôt. Options : (a) la
  CI livrée porte un nombre maximal de jobs (par exemple 16) et les tranches au-delà de N sortent en « non
  applicable » sans compter comme passées ; (b) un pipeline enfant dynamique généré par un job de plan ; (c) un
  fichier d'inclusion que `drwil` régénère à chaque mise à jour à partir de N (le YAML n'est plus identique pour tous
  les adoptants). (b) et (c) écartées. **Tranché le 2026-11-08 (tranché par le demandeur)** : (a), nombre maximal de jobs fixe dans le gabarit GitLab, tranches au-delà de N « non applicable ».
- **D3 — rouvrir QUA-250 pour la reprise d'un push à l'autre de la même PR (lot 4)**. **Tranché le 2026-11-08 (tranché par le demandeur)** : oui, QUA-250 est rouvert, lot 4 gardé, GitHub et GitLab. Le gain réel dépend du
  projet : il est nul si chaque push d'une PR change les `paths` de l'e2e, ce que le chantier ne mesure pas (hors
  périmètre : pas de mesure sur `drwil_walk`).
- **D4 — intégrité et provenance du verdict repris d'une PR**. **Tranché le 2026-11-08 (tranché par le demandeur)** : somme du fichier de verdicts + identité du run (SHA, numéro, PR), sans HMAC ni secret. Garanties :
  1. Le verdict est lié à l'empreinte propre du contrôle (QUA-141), à la configuration du contrôle, au commit qui l'a
     joué (SHA de la tête de la PR) et au commit de la branche principale dont les hooks ont jugé (QUA-113) ;
     tout écart le rejoue.
  2. Il n'est jamais repris depuis une branche de PR autre que la sienne, jamais d'un fork (un fork n'a pas le droit
     d'écriture sur le dépôt de base ; son artefact n'est pas lu), et jamais écrit par un événement qui exécute du
     code non fiable avec des droits d'écriture (`pull_request_target` interdit).
  3. Il n'est lu que depuis un emplacement que seule la CI du même dépôt peut écrire : GitHub : artefact du run
     `pull_request` précédent de la même PR, lu par `gh run download` avec le jeton du job ; GitLab : artefact du
     pipeline précédent de la même merge request (`CI_MERGE_REQUEST_IID`), jamais un cache partagé.
  4. Intégrité : somme du fichier de verdicts écrite à part et recalculée, plus identité du run (SHA, numéro du run,
     PR) comparée à celle attendue ; la signature HMAC avec un secret est écartée (la somme détecte la corruption, pas un auteur qui contrôle l'artefact : risque accepté, voir D6).
  5. Le verdict repris ne devient jamais une preuve de fusion ni de clôture : la preuve d'arbre et le rejeu de
     QUA-113 restent ; une reprise dit « repris du run … » et n'entre pas dans l'empreinte d'arbre (QUA-141).
  6. Toute lecture manquée, expirée, illisible, ou d'un autre commit : rejeu complet (QUA-013).
- **D5 — tranches et hooks de la branche principale (QUA-113)** : hooks de la branche contrôlée (écartés : une PR affaiblissant `.githooks/engine.mjs` pourrait faire passer ses propres tranches) ou copie de la base. **Tranché le 2026-11-08 (tranché par le demandeur)** : chaque tranche rejoue avec les hooks de la base (QUA-113), l'agrégateur est lancé par la copie de la base.
- **D6 — risques résiduels** : (i) un verdict falsifié par une PR qui contrôle
  l'artefact de sa propre passe (limité par D4.2 à 4) ; (ii) un cache empoisonné : aucun cache n'est écrit par une PR
  et lu par une autre branche ; l'artefact de PR n'est lu que par cette PR ; (iii) une PR qui prétend reprendre : la
  reprise est calculée par le moteur de la base, jamais par une étape du YAML de la PR (la base pose ses hooks avant) ;
  (iv) un nombre de tranches abaissé dans la PR pour « perdre » des fichiers : l'agrégation compare N à la configuration
  de la **base** quand elle existe, sinon à celle de la branche et le dit ; (v) un contrôle qui ignore les variables :
  refusé par D1.  **Tranché le 2026-11-08 (tranché par le demandeur)** : niveau de garantie suffisant, lot 4 sur GitHub et GitLab.
- **D7 — mise à jour des adoptants** : les CI du gabarit changent de forme (job de plan, tranches,
  agrégateur) ; la migration passe par la mise à jour habituelle des fichiers du gabarit. Option écartée : signaler une CI de l'adoptant modifiée à la main avant de l'écraser (intention existante
  `docs/intentions/alertes-avant-et-apres-ecrasement.md`). **Tranché le 2026-11-08 (tranché par le demandeur)** : garder le comportement actuel, pas d'alerte avant écrasement.

## 6. Increments

- **Lot 1 — le moteur : réglage et tranche** [IA] : validation de `shards` dans la déclaration, variables
  `DRWIL_SHARD_INDEX` / `DRWIL_SHARD_TOTAL`, `run-checks --shard i/N` et `--without-shards`, verdict de tranche
  (nom, empreinte, commit, i, N), agrégation qui refuse tout écart ; local inchangé. Modules engine-shards et
  run-checks-shards, branchement minimal dans `.githooks/engine.mjs` et `.githooks/run-checks.mjs` (à 200 et 199 lignes). Critère de
  sortie : tests du moteur verts (tranche absente, dupliquée, d'un autre commit, nombre incohérent, contrôle sans
  `paths`, sans lecture de la variable) ; `run-checks` local sans tranche inchangé ; `GOVERNANCE: PASS` à la clôture.
- **Lot 2 — CI GitHub** [IA] : job de plan, job `shards` en matrice, `checks` agrégateur au nom inchangé,
  `alert-if-ci-broken` suivant `checks`, preuve d'arbre déposée seulement après agrégation verte. Critère de sortie :
  tests de `.github/scripts/workflows-yaml.test.mjs` (nom exigé unique, `needs`/`always()`, aucune tranche ne produit un succès par
  défaut) ; copie du dépôt et gabarit alignés (`miroirs-gabarit`).
- **Lot 3 — CI GitLab** [IA] : même règle, selon D2 ; le job exigé garde son nom ; artefacts de tranches de la même
  pipeline ; aucun cache de verdicts. Critère de sortie : test de structure du gabarit GitLab, parité des cas du lot 2.
- **Lot 4 — reprise d'une PR à l'autre** [IA], (D3 tranchée : oui) : verdict de PR lié à l'empreinte, au commit
  et à la base, intégrité (D4), lecture limitée à la même PR, rejeu au moindre doute ; QUA-250 et QUA-113 amendés après
  validation. Critère de sortie : tests de falsification (verdict d'un autre commit, d'un autre contrôle, d'une autre
  PR, d'un fork, somme fausse, artefact expiré : tout est rejoué), jamais de lecture depuis une branche de PR ou
  depuis un cache.
- **Lot 5 — projet d'essai synthétique et documentation** [IA] : projet installé depuis le paquet (comme `QUA-270`),
  faux contrôle lent découpé (écrit pour lire les variables et laisser sa tranche), GitHub et GitLab ; recettes et
  documentation : `docs/architecture.md`, `docs/projects/kit-mechanics.md`, `packages/drwil/CHANGELOG.md` (en anglais),
  contrats créés dans `docs/contracts.md`, contrôles dans `.drwil/ia-first.json`. Critère de sortie : `node
  .githooks/run-checks.mjs` et `GOVERNANCE: PASS`.

## 7. Reprise

- **Dernier état** (2026-11-09) : lot 1 (le moteur) réalisé et commité : `shards: N` validé, `.githooks/engine-shards.mjs` (réglage,
  variables, plan, agrégation) et `.githooks/run-checks-shards.mjs` (options `--shard i/N`, `--without-shards`,
  `--aggregate-shards <dossier>`, verdict de tranche dans le dossier `shards` de `.drwil/evidence`), tests `.githooks/engine-shards.test.mjs` et
  `.githooks/run-checks-shards.test.mjs`, couverture des hooks à 100 %. Sans option, une seule passe : la commande reçoit
  `DRWIL_SHARD_INDEX=1` et `DRWIL_SHARD_TOTAL=1`. Les contrôles non découpés ne sont pas joués par `--shard` ; avec
  `--without-shards`, le contrôle découpé est « non applicable » (confié aux tranches), avec `--aggregate-shards` il est jugé
  sur les verdicts du dossier (nombre, indices, commit, empreinte, statut).
- **Lot 2 réalisé** (CI GitHub, gabarit et CI du dépôt) : job `plan` (décisions `pr` et `proven`, `run-checks --shard-plan` : matrice, `skip`,
  `count`), job `shards` (matrice `fromJSON`, `fail-fast: false`, tranche jouée par `base-checks --base … --shard` sur PR sinon
  `run-checks --shard`, artefact `shard-<i>-of-<N>`), `checks` (nom inchangé, `if: always()`, garde : plan ou tranche non « success » = échec,
  téléchargement des artefacts, `run-checks --aggregate-shards`). D6 iv faite dans `engine-shards` (`againstBase`), pas dans
  `base-checks` (plafond de 200 lignes) : N comparé à `origin/<base>:.drwil/ia-first.json`, écart accepté s'il est cité dans
  « Contrats modifiés » d'une fiche de `base..HEAD`, avertissement si la base ne déclare pas de tranches. `base-checks` transmet les options de
  tranche (jamais « skipped » ni « not-applicable » pour une tranche).
- **Lot 3 réalisé** (CI GitLab, gabarit seul : le dépôt n'a pas de CI GitLab) : étapes `plan`, `slices`, `test`, `alert` ; job `plan` (`run-checks --shard-plan` écrit le plan en artefact),
  job `shards` (`parallel: 16`, D2 a : une tranche au-delà de N sort en « non applicable », exit 0, sans verdict ; sinon `base-checks --base … --shard i/N`
  hors branche principale, `run-checks --shard i/N` sur elle ; artefact du dossier des verdicts de tranche, `when: always`), `checks` au nom et à l'étape inchangés,
  `--aggregate-shards` dans ses deux passes ; un job en échec arrête les étapes suivantes (pas de succès par défaut, QUA-013), aucun cache de verdicts.
  Tests : `packages/drwil/test/ci-shards.test.mjs` (structure + scripts `plan` et `shards` joués par bash sur un projet d'essai) ; regex QUA-250 de `.github/scripts/workflows-yaml.test.mjs` mise à jour.
- **Limites connues** : un seul N par projet (le plan refuse plusieurs totaux) ; pas de zone « projet » pour le setup du job `shards`
  (il faudrait modifier le fichier des zones `ci-zone`, hors scope) : la commande du contrôle fait son propre setup ; base antérieure au lot : tranches ignorées par son
  `base-checks` (échec sûr, QUA-013) ; CI du dépôt : `plan` ne reprend que le saut de `matrice-os`.
- **Travail non commité** : aucun.
- **Limites GitLab** : un seul pipeline sans MR (`workflow: rules`) ; une tranche ne peut pas dépasser 16 (plafond de `shards`) ; `checks` ne tourne pas si une étape amont échoue (il n'est alors pas « réussi »).
  Le test d'`init` GitLab ne couvre pas le comportement réel d'un runner GitLab (non joué ici).
- **Lot 4 réalisé** (reprise d'une PR à l'autre, D3 et D4) : `.githooks/run-checks-verdicts.mjs` (`loadPrVerdicts`, `prCovered`, `savePrVerdicts`) lit le dossier `pr-previous` de `.drwil/evidence`
  et écrit le dossier `pr-verdicts` (fichiers pr-verdicts.json et pr-verdicts.sum). Le nouveau module `.githooks/run-checks-pr.mjs` porte l'identité de la PR/MR (`prContext`, déduite de l'environnement de la forge :
  GitHub lit l'événement de la PR, un fork n'a pas d'identité ; GitLab : projet + branche, base = branche cible) et le téléchargement du run précédent (`--pr-previous [run]`, imprime `previous=<run>`) ;
  les YAML ne font que l'appeler, ils n'ont plus de variable `DRWIL_PR_*` (la CI d'un autre forge peut les poser : `DRWIL_PR_ID`, `_HEAD`, `_BASE`, `_RUN`, `_PREVIOUS_RUN` ; `DRWIL_PR_SLOW_MS` : seuil de lenteur, 60 000 par défaut, choix de l'agent).
  Seuls les « ok » de contrôles lents (découpés ou au-dessus du seuil) sont repris, rejoués au moindre doute (somme, id, run, empreinte, base, commit non ancêtre de la tête) ; la reprise exige `DRWIL_CI_REUSE=1`.
  `--shard-plan` ne planifie aucune tranche si tous les contrôles découpés sont couverts, jamais si la PR change `.githooks` ou `.drwil/ia-first.json` (`hooksChanged`). GitHub : artefact `pr-verdicts` du run `pull_request`
  précédent de la même PR, lu par le plan puis, à l'identique, par `checks` (gabarit et dépôt). GitLab : artefact du dernier pipeline réussi de la même branche, sans changer `workflow: rules` (QUA-263).
  Plafond de 200 lignes (QUA-157) : cadrage séparé (dd51d99) puis déplacement dans le moteur ; gabarits CI GitHub 196 lignes, GitLab 176.
  Tests : `.githooks/run-checks-pr.test.mjs`, `.githooks/run-checks-shards.test.mjs`, `.githooks/engine-shards.test.mjs`, `.github/scripts/workflows-yaml.test.mjs`, `packages/drwil/test/ci-shards.test.mjs` ; couverture des hooks à 100 %. YAML non joué sur de vrais runners.
- **Limites du lot 4** : GitLab sans identité de MR ni vérification du run lu (le dernier pipeline réussi de la branche) ; une PR peut falsifier l'artefact de sa propre passe (D6 i, risque accepté, la somme ne détecte que la corruption) ;
  verdicts repris de la branche principale potentiellement reportés avec la tête courante ; un fork n'a aucune reprise.
- **Lot 5 réalisé** (2026-11-09) : projet d'essai installé par `init` (GitHub, GitLab) avec un faux contrôle lent `shards: 3` (`packages/drwil/test/ci-shards.test.mjs` : plan, tranche absente, agrégation, nom `checks` unique, local en une passe 1/1) ; contrats créés `QUA-288` (tranches et agrégation), `QUA-289` (aucun affaiblissement, local sans tranche), `QUA-290` (reprise d'une PR à l'autre), `QUA-291` (provenance et intégrité), contrôles `tests-qua-288` à `291` dans `.drwil/ia-first.json` ; `QUA-250`, `QUA-113`, `QUA-251`, `QUA-270` amendés (ligne « Modifié »), `QUA-208` confirmé par un test (contrôle `["ci"]` découpé reste confié à la CI) ; tests existants renommés sous ces IDs ; `docs/architecture.md`, `packages/drwil/CHANGELOG.md` (anglais). Aucune mesure réelle (décision du demandeur). Reste : contrats modifiés à valider par le demandeur, puis vérification et clôture.
- **Prochaine étape** : lot 5 (contrats et documentation) : amender `QUA-250`, `QUA-113`, `QUA-251`, `QUA-270`, confirmer `QUA-208` ; `docs/contracts.md`, `docs/architecture.md`,
  `docs/projects/kit-mechanics.md` (dépôt et gabarit), `packages/drwil/CHANGELOG.md` (anglais), `.drwil/ia-first.json` ; projet d'essai synthétique. Restent à valider par le demandeur : contrats modifiés.

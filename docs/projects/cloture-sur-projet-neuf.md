# Projet : clôture d'un chantier sur un projet neuf

**Statut** : en cours le 2026-11-03 — quatre lots IA commités et marqués faits ; correction de classification autorisée, attestations humaines toujours requises.
**Risque** : HIGH
**Maturité** : prêt

<!-- scope
files:
  - packages/drwil/src/guarantees.ts
  - packages/drwil/src/guarantees-verify.ts
  - packages/drwil/src/guarantees-table.ts
  - packages/drwil/src/guarantees-texts.ts
  - packages/drwil/src/guarantees-layers.ts
  - packages/drwil/src/config-write.ts
  - packages/drwil/src/verify-types.ts
  - packages/drwil/src/verdict.ts
  - packages/drwil/src/verify.ts
  - packages/drwil/src/verify-checks.ts
  - packages/drwil/src/verdict-texts.ts
  - packages/drwil/src/closure.ts
  - packages/drwil/test/cycle.test.mjs
  - packages/drwil/templates/common/base/.githooks/briefs-criteria.mjs
  - .githooks/briefs-criteria.mjs
  - packages/drwil/test/guarantees.test.mjs
  - packages/drwil/templates/common/base/.githooks/close.mjs
  - packages/drwil/templates/common/base/.githooks/close-checks.mjs
  - packages/drwil/templates/common/base/.githooks/close-texts.mjs
  - packages/drwil/templates/common/base/.githooks/closure-proof.mjs
  - packages/drwil/templates/common/base/.githooks/state-acceptance.mjs
  - .githooks/close.mjs
  - .githooks/close-checks.mjs
  - .githooks/close-texts.mjs
  - .githooks/closure-proof.mjs
  - .githooks/state-acceptance.mjs
  - .githooks/close.test.mjs
  - .githooks/state.test.mjs
  - packages/drwil/templates/common/base/.githooks/close-mechanics.mjs
  - .githooks/close-mechanics.mjs
  - packages/drwil/templates/common/base/.githooks/close-journal.mjs
  - .githooks/close-journal.mjs
  - packages/drwil/templates/common/base/.githooks/check-docs.mjs
  - .githooks/check-docs.mjs
  - .githooks/check-docs.test.mjs
  - packages/drwil/templates/common/base/docs/recipes/working-with-branches.md
  - docs/intentions/commit-msg-non-executable.md
  - docs/contracts.md
  - docs/contracts-catalog.md
  - docs/architecture.md
  - docs/projects/kit-mechanics.md
  - packages/drwil/templates/common/base/docs/projects/kit-mechanics.md
  - docs/recipes/working-with-branches.md
  - .drwil/ia-first.json
-->

## 1. Besoin

Vu à l'installation réelle de `drwil_walk` (projet neuf) et à `release-allegee` : la clôture d'un chantier
est refusée ou faussée pour des raisons qui ne tiennent pas au chantier. Trois défauts, un seul mécanisme
(`drwil verify`, `.githooks/close.mjs`, l'empreinte des critères) :

1. Sur un projet sans code, `drwil verify` juge le projet entier : les garanties couverture et e2e ne
   peuvent pas être tenues, et 11 contrats manuels attendent une attestation. Un chantier de garantie
   (versionnement, forge, CI, protection de la branche principale) atteint ses objectifs mais ne peut pas
   être clos, et reste en BUILD, ce qui refuse le lancement du suivant.
2. Avant la clôture, `verify` échoue (faux FAIL `docs-references`) parce que l'entrée du journal cite
   `docs/preuves/<fiche>.md`, que `.githooks/close.mjs` ne crée qu'à la clôture ; `.githooks/close.mjs` n'écrit pas la ligne
   « Preuve de clôture » du journal et la ligne de `pending.md` qui cite la fiche supprimée se corrige à
   la main.
3. Poser la marque `[humain]` sur un critère après le lancement change l'empreinte acceptée (QUA-174 :
   les critères acceptés au lancement sont figés) et coûte un geste humain (`state.mjs accept`). Les IDs
   de contrat, eux, sont déjà exclus de l'empreinte (`PROOF_TAIL`).

## Critères d'acceptation

- Sur un projet sans code, une garantie couverture ou e2e dont la couche n'a aucun code est « pas encore
  applicable » : elle ne met pas `verify` en FAIL, et le dit en clair — `QUA-224`
- Dès que la couche reçoit du code, la garantie redevient applicable et son échec redevient bloquant —
  `QUA-225`
- La clôture écrit elle-même la ligne « Preuve de clôture » du journal et corrige la ligne de l'index qui
  cite la fiche supprimée — `QUA-228`
- Avant la clôture, la citation de la preuve du chantier actif (`docs/preuves/<fiche>.md`) ne fait plus
  échouer `verify` — `QUA-229`
- En BUILD, `.githooks/close.mjs --check` liste les renvois à la fiche (catalogue, dashboard, intentions, index,
  journal) qui bloqueraient le commit de clôture, et propose l'extension du bloc scope — `QUA-230`
- Ajouter ou retirer la marque `[humain]` d'un critère ne change pas l'empreinte acceptée ; tout autre
  changement du texte d'un critère la change toujours — `QUA-174`

## Contrats modifiés

- `.githooks/briefs-criteria.mjs` — correction de classification des marques citées en code,
  autorisée explicitement le 2026-11-03 : « Corriger le défaut dans ce chantier », à la
  question « Autorisez-vous la correction du défaut de classification, avec extension de
  cadrage séparée et tests, sans changer le texte des critères acceptés ? ».
  Aucun contrôle désactivé, aucune attestation ni acceptation écrite par l'agent.
- `QUA-174` — ancien critère : « texte de chaque puce, lignes de continuation jointes, espaces normalisés,
  preuve citée exclue » — raison : la marque `[humain]` est une classification de la preuve, pas le sens du
  critère ; l'exclure de l'empreinte évite un geste humain par marque posée après coup (validé le 2026-10-30)
- `.githooks/state-acceptance.mjs` — exclusion de la classification humaine, décision du lot 3
  ci-dessus, réalisée dans le lot 3 explicitement confirmé par le demandeur le 2026-11-03.
- `.githooks/state.test.mjs` — tests de cette décision du lot 3, confirmé par le demandeur le 2026-11-03.
- `.githooks/close-checks.mjs` — renvois hors scope et extension proposée, réalisation du lot 4
  demandée explicitement le 2026-11-03.
- `.githooks/close.mjs` — mécanique extraite avant ajout ; écrit automatiquement le renvoi de preuve
  dans l'entrée du journal, comme décidé en section 4.
- `.githooks/check-docs.mjs` — tolère uniquement la preuve future du chantier actif, comme décidé en section 4.
- `.githooks/closure-proof.mjs` — le signal de citation manuelle devient la préparation automatique
  du renvoi de preuve ; les refus d'évidence et la conservation de la fiche restent inchangés.
- `.githooks/close-texts.mjs` — messages français et anglais du renvoi automatique et de ses refus,
  nécessaires à la décision de clôture complète de la section 4.

## 2. Hors périmètre

- Une notion officielle de « chantier mis en attente » (état, commande de reprise, rappel) : écartée, le
  point 1 la rend inutile pour les chantiers de garantie.
- L'attestation de départ des contrats manuels à l'installation.
- L'élargissement visible du périmètre et l'alignement de QUA-050 : fiche à part.
- La première branche principale, l'auto-merge du dépôt neuf, le choix des outils IA, le signalement d'un
  défaut du kit : fiche « installation d'un dépôt neuf ».

## 3. Contraintes

- Le gabarit (`packages/drwil/templates/`) est la seule source ; la copie du dépôt suit (`scopeMirrors`).
- QUA-019 (pas de contournement) : « pas encore applicable » est une règle écrite et testée, jamais une
  dérogation (QUA-090 : aucune dérogation aux garanties, seulement une exclusion déclarée et justifiée) ;
  elle ne vaut qu'une couche **sans aucun code**.
- QUA-092 (sur un dossier vide, la garantie de couverture se prouve en vrai) et QUA-088 (une garantie non
  tenue écrit une fiche bloquante) restent vrais dès qu'il y a du code ; vérifier qu'ils ne sont pas
  affaiblis.
- Les 11 contrats manuels non attestés restent signalés : ils ne bloquent pas un chantier qui ne les cite pas.
- Les fichiers de plus de 180 lignes (`.githooks/close.mjs`, 196 lignes) sont découpés avant d'y ajouter du code.

## 4. Décisions

Tranchées par le demandeur le 2026-10-30 :

- Garanties « pas encore applicables » tant qu'une couche n'a pas de code (plutôt qu'un verdict limité à la
  fiche ou des attestations de départ).
- Pas d'état « mis en attente » : pas de nouvelle notion de cycle de vie.
- `.githooks/close.mjs` fait tout (ligne de journal, ligne d'index) et `verify` tolère la citation de la preuve du
  chantier actif.
- Renvois à la fiche supprimée : `close --check` en BUILD les liste et propose l'extension de scope (plutôt
  qu'une réorientation automatique vers le journal, ou les deux).
- Empreinte des critères sur le sens : la marque `[humain]` n'y entre plus (les IDs n'y entraient déjà plus).

## 5. Points à trancher

- [IA] Définition mécanique de « couche sans code » (aucun fichier source suivi dans les dossiers de la
  couche, hors gabarits et dépendances) : fixée au lot 1 par `QUA-225`, avec une règle plus prudente :
  les fichiers présents non encore indexés comptent aussi, et la recherche n'a pas de profondeur limite.

- [IA] Deux défauts liés, vus au même essai : (a) le classement « nouveau » ou « existant » dépend de la
  présence de code au moment où `drwil guarantees` est lancé, alors que la recette d'un projet neuf impose
  d'écrire le code d'abord ; (b) `drwil guarantees` affiche « ✓ couverture » alors que `drwil verify`
  déclare la garantie non tenue. À reproduire au lot 1 (cause avant correctif) ; si les deux outils
  doivent partager le même juge, l'ajouter au lot 1 plutôt qu'en ouvrir un autre. Reproduits au lot 1 :
  photo de l'origine à `init` (`QUA-226`) et juge partagé de déclaration/citation (`QUA-227`).

## 6. Increments

- **Lot 1 — garanties non applicables sans code** [IA] : `packages/drwil/src/guarantees.ts` et `packages/drwil/src/guarantees-verify.ts`, contrats
  et tests (dossier vide, puis premier fichier de code). Critère de sortie : sur un dossier vide
  `verify` ne tombe plus sur couverture/e2e, et retombe dès le premier fichier de code.
- **Lot 2 — clôture complète** [IA] : `.githooks/close.mjs` écrit la ligne « Preuve de clôture » et corrige l'index ;
  `verify` tolère la preuve du chantier actif ; découpe de `.githooks/close.mjs`. Critère de sortie : un chantier
  clos de bout en bout sans retouche à la main, ni faux FAIL avant la clôture.
- **Lot 3 — empreinte sans `[humain]`** [IA] : `.githooks/state-acceptance.mjs`, QUA-174 modifié, tests. Critère de
  sortie : poser `[humain]` après lancement n'impose plus `state.mjs accept`.

- **Lot 4 — renvois visibles avant la clôture** [IA] : `.githooks/close-checks.mjs` et `.githooks/close.mjs
  --check` en BUILD, sans rien réécrire. Critère de sortie : un renvoi à la fiche hors du bloc scope est
  nommé avant le commit de clôture, avec l'extension de scope proposée (arrivé à `adopter-seuil-couverture`,
  `couverture-du-code-modifie` et `e2e-et-attestation-precises`).

## 7. Reprise

- **Correction après autorisation (2026-11-03)** : cadrage seul commité `62f5f69`,
  puis correction des deux lecteurs. Les expressions régulières reconnaissaient la marque
  même en code et la supprimaient ; le premier lecteur doit aussi conserver les accents
  graves de cette citation, sinon le rejeu de la preuve la reclasserait humaine.
  La distinction code/classification reprend celle de l'empreinte, sans nouveau module ni
  refactor. Les vraies marques françaises et anglaises, y compris en majuscules et mêlées
  à une citation, restent humaines ; la disparition du contrôle d'un critère automatique
  cité reste bloquante.
- **Régressions vues échouer puis réussir** :
  `node .githooks/wait-command.mjs --wait 600 'node --test --test-name-pattern="classification des critères|citation de marque humaine|conserve la citation" .githooks/state.test.mjs .githooks/close.test.mjs packages/drwil/test/cycle.test.mjs'` :
  avant correction code 1, 3 échecs attendus (classification, libellé et preuve écrite) ;
  après correction et `npm run build` (code 0), code 0, 3 réussites, 0 échec.
  `npm run installer-depot` : code 0, un seul miroir écrit depuis le gabarit.
- **Contrôles de la correction** :
  - `node .githooks/check-file-size.mjs` et `git diff --check` : code 0.
  - `node .githooks/check-contract-tests.mjs` : 276 liens, 0 problème ;
    `node outils/verifier-tests-contrats.mjs` : 620 tests rattachés, 0 problème ;
    `node outils/verifier-miroirs.mjs` : 183 fichiers, 17 écarts déclarés, 0 problème.
  - `node .githooks/wait-command.mjs --wait 600 node .githooks/run-checks.mjs` :
    premier passage code 1 (formatage du nouveau test, corrigé avec Biome) ; deuxième
    passage code 1 (audit non exécuté, registre npm momentanément injoignable, HTTP 400).
    Troisième passage code 0 : « contrôles exécutés : OK (6 avertissement(s), non exécutés
    compris) », 212 repris / 15 rejoués. Aucun contrôle désactivé.
    Les suites de couverture ont réussi : paquet 282 tests, hooks 552 tests ;
    hooks à 100 % lignes, instructions, branches et fonctions.
  - `node .githooks/close.mjs --check` : code 0, « Rien ne ferait échouer la clôture. » ;
    ce signal ne vaut ni attestation ni autorisation de clore.
  - Lecture seule de l'acceptation : `same`, `sha256:922f5befc3a3593d` inchangée.
    Le critère réel de `QUA-174` garde sa citation et porte désormais `human: false`.
    Aucun texte accepté, état, fichier d'acceptation ou attestation modifié.
- **Suite après commit de la correction** : relire les hooks, puis
  `node packages/drwil/bin/drwil.js verify --failed --agent`, verdict partiel uniquement.
  Sans les quatre attestations humaines, rester BUILD, sans clôture, push, PR ni lot suivant.
  La vérification complète finale reste requise après les véritables gestes humains.

- **Reprise autorisée du 2026-11-03 — correction de classification** : reprise du chantier
  BUILD après arrêt humain, sans nouveau lot ni lancement. Extension de cadrage à commiter
  seule avant le code : `packages/drwil/templates/common/base/.githooks/briefs-criteria.mjs`
  (lecteur source des critères), `.githooks/briefs-criteria.mjs` (miroir installé),
  `packages/drwil/src/closure.ts` (lecteur des preuves de clôture),
  `packages/drwil/test/cycle.test.mjs` (régression du second lecteur). Les tests du premier
  lecteur restent dans `.githooks/state.test.mjs`, déjà au périmètre.
  Prior art : `.githooks/state-acceptance.mjs` distingue déjà les segments en code et les marques
  de classification ; appliquer cette distinction aux deux lecteurs, sans refactor superflu.
  Préserver la citation dans le libellé et sa preuve durable, ainsi que les vraies marques
  `[humain]` / `[human]`, sans distinction de casse ; tests vus échouer avant correction.
  Ne modifier aucun texte accepté, ne renouveler aucune acceptation. Les quatre attestations
  humaines restent obligatoires ; sans elles, arrêt BUILD après correction, commits et
  contrôles, sans clôture, push, PR ni suite de file.

- **Arrêt après vérification finale (2026-11-03)** : lot 4 commité `8590332`,
  puis `node .githooks/state.mjs lot next` : aucun lot [IA] restant. Le sous-agent
  `drwil-checks` a exécuté dans le dépôt réel :
  - `node .githooks/run-checks.mjs` : code 0,
    « contrôles exécutés : OK (7 avertissement(s), non exécutés compris) »,
    210 repris / 17 rejoués.
  - `node packages/drwil/bin/drwil.js verify --agent` : code 1,
    **`Verdict: GOVERNANCE: FAIL (exit 1)`**.
    202 PASS, 16 ATTESTED, 0 FAIL, 0 ERROR, 4 MANUAL au registre.
  - Blocage exact du critère de `QUA-174` :
    `not-durable (human) — QUA-174 is fully automated: remove [human] from the criterion`.
    Le critère cite littéralement la marque entre accents graves ; il ne demande pas une
    preuve humaine. Cause relevée sans correction hors lot : les expressions régulières de
    `.githooks/briefs-criteria.mjs` et `packages/drwil/src/closure.ts` reconnaissent aussi cette
    citation comme classification et la retirent du libellé. Ne pas supprimer ce texte accepté
    pour rendre le verdict vert ; le défaut reste à traiter par décision de l'humain.
  - **Human attestation required.** : `QUA-013` (contrôle non exécuté n'est pas passé),
    `QUA-048` (clôture en un geste), `QUA-092` (couverture prouvée sur dossier vide),
    `QUA-175` (aucun agent ne peut écrire l'acceptation). L'humain doit réaliser/lire les
    vérifications manuelles de ces contrats, puis les attester lui-même dans son terminal
    interactif (`drwil attest <CONTRACT_ID>`). Aucune attestation exécutée par l'agent.
  - État conservé : BUILD sur cette fiche, autorisation de fusion et file conservées.
    Aucun journal de clôture, aucune suppression de fiche, aucun push, aucune PR ni fusion.
    Aucun `state next`, aucun nouveau chantier, aucune acceptation réécrite.
    La clôture n'ayant pas eu lieu, le défaut de classification est conservé ici pour décision,
    pas transformé en limite acceptée silencieusement. La reprise requiert d'abord les gestes
    humains ci-dessus ; ensuite refaire les vérifications complètes avant toute clôture.
  - Hooks du commit `8590332` : code 0, contrôles exécutés OK,
    51 avertissements (non exécutés compris). Hook commit-msg non exécutable préexistant :
    intention déjà présente, aucun contournement ni doublon.

- **Lot 4 — réalisation du 2026-11-03** : `QUA-230` (renvois hors périmètre avant clôture)
  ajoute au rapport les fichiers et lignes citant la fiche et dont la correction serait hors du
  scope commité dans HEAD. Les chemins à ajouter sont proposés avec la consigne de motiver et
  commiter l'extension séparément ; aucune réécriture automatique. Grammaire, motifs, miroirs et
  exclusions sont ceux de la barrière existante, sans les recopier. Les renvois déjà couverts ou
  exemptés restent signalés par les règles de cohérence sans extension inutile ; l'élément d'index
  supprimé par la mécanique reste inchangé. Français et anglais disponibles.
- **Cause et reproduction du lot 4** : le rapport de clôture nommait déjà les renvois morts,
  mais ne confrontait pas leur correction au scope de HEAD. Deux nouveaux tests `QUA-230`
  ont échoué avant correction (code 1) : absence du signal « hors du bloc scope » et de sa
  proposition, en français et anglais. Ils couvrent catalogue Markdown, dashboard HTML,
  intentions et journal exemptés, fichiers couverts, renvois non suivis, motifs, miroirs,
  exclusions configurées, extension non commitée puis commitée et absence d'écriture.
- **Documentation du lot 4** : contrat et contrôle dédiés, critère relié à son contrat sans
  changer son texte, recette du gabarit alignée avec sa copie spécifique au dépôt. Sources des
  hooks éditées uniquement dans le gabarit, puis `npm run installer-depot` : trois miroirs écrits.
  Les déclarations des hooks du lot 3 manquaient dans « Contrats modifiés » malgré la décision
  de ce lot et sa confirmation explicite : elles sont complétées, avec celle du lot 4 demandé,
  pour que le rejeu CI garde ces changements autorisés ; aucun contrôle assoupli.
- **Périmètre du lot 4** : aucun chemin ajouté au bloc `scope`, aucune extension nécessaire.
  Aucun refactor, aucune migration d'empreinte, aucune attestation ni acceptation écrite par
  l'agent. L'empreinte active reste `sha256:922f5befc3a3593d` (`acceptanceCheck` : `same`).
- **Preuves du lot 4 avant commit** :
  - `node .githooks/wait-command.mjs --wait 600 node --test .githooks/close.test.mjs .githooks/doc-coherence.test.mjs` :
    code 0, 41 tests réussis, aucun échec, y compris après ajout du cas non suivi.
  - `node .githooks/wait-command.mjs --wait 600 npm run test:hooks:coverage` : code 0,
    550 tests réussis, couverture à 100 % lignes, instructions, branches et fonctions.
  - `node .githooks/check-contract-tests.mjs` : 276 liens, 0 problème ;
    `node outils/verifier-tests-contrats.mjs` : 617 tests rattachés, 0 problème ;
    `node outils/verifier-miroirs.mjs` : 183 fichiers, 17 écarts déclarés, 0 problème.
  - `node .githooks/close.mjs --check` : code 0, « Rien ne ferait échouer la clôture. » ;
    `node .githooks/check-file-size.mjs` : code 0.
- **Première passe globale du lot 4** : `run-checks` a refusé 13 contrôles (code 1,
  61 avertissements) pour une cause unique introduite dans la recette livrée :
  elle citait le nouveau contrat propre au dépôt, absent du registre minimal d'une installation.
  La citation a été retirée de la recette (gabarit et copie), pas la règle ni le contrôle ;
  le contrat reste défini et testé dans le dépôt. Rejeu complet :
  `node .githooks/wait-command.mjs --wait 600 node .githooks/run-checks.mjs` :
  code 0, « contrôles exécutés : OK (40 avertissement(s), non exécutés compris) »,
  78 repris / 149 rejoués.
- **Suite du lot 4** : après commit, `node .githooks/state.mjs lot next` marque le dernier lot
  fait ; contrôles complets puis `drwil verify --agent` par le sous-agent `drwil-checks`.
  Si geste humain requis, arrêter en BUILD avec la preuve exacte ; sinon journal et clôture
  selon la recette. L'intention préexistante `docs/intentions/commit-msg-non-executable.md`
  reste la seule limite connue à ce stade ; ne pas la doubler ni la corriger hors périmètre.

- **Lot 3 — réalisation du 2026-11-03** : seule la normalisation de l'empreinte change,
  dans `packages/drwil/templates/common/base/.githooks/state-acceptance.mjs`, puis son miroir
  `.githooks/state-acceptance.mjs` par `npm run installer-depot` (un seul fichier écrit).
  Les marques de classification `[humain]` / `[human]`, sans distinction de casse, sont
  ignorées ; une marque citée entre accents graves reste du texte, afin de ne pas masquer
  un changement de sens. `QUA-174` (critères acceptés figés) est aligné dans `docs/contracts.md`.
  Les tests `.githooks/state.test.mjs` et `.githooks/close.test.mjs` couvrent ajout, retrait,
  position, anglais, casse, texte voisin modifié, autres marques et marque citée en code ;
  la clôture conserve l'empreinte acceptée sans nouveau geste humain.
- **Cause et reproduction du lot 3** : l'ancienne normalisation excluait seulement la preuve,
  pas la classification ; un ancien test attendait même une empreinte différente.
  `node .githooks/wait-command.mjs --wait 600 node --test --test-name-pattern=QUA-174 .githooks/state.test.mjs .githooks/close.test.mjs`
  a échoué avant correction : 8 tests, 5 réussis, 3 échecs (empreinte différente, acceptation
  `changed`, clôture refusée en demandant `state.mjs accept`).
- **Preuves ciblées du lot 3** :
  - `node .githooks/wait-command.mjs --wait 600 node --test .githooks/state.test.mjs .githooks/close.test.mjs` :
    code 0, 154 tests réussis, aucun échec.
  - `npx biome check .githooks/state.test.mjs .githooks/close.test.mjs packages/drwil/templates/common/base/.githooks/state-acceptance.mjs .githooks/state-acceptance.mjs` :
    4 fichiers, aucune erreur après correction d'une mise en forme du nouveau test.
  - `node outils/verifier-miroirs.mjs` : 183 fichiers, 17 écarts déclarés, 0 problème ;
    `node .githooks/check-contract-tests.mjs` : 275 liens, 0 problème ;
    `node outils/verifier-tests-contrats.mjs` : 615 tests rattachés, 0 problème.
  - Empreinte de la fiche active inchangée : `sha256:922f5befc3a3593d`,
    `acceptanceCheck` retourne `same` ; aucun enregistrement d'acceptation réécrit.
  - `node .githooks/wait-command.mjs --wait 600 node .githooks/run-checks.mjs` :
    code 0, « contrôles exécutés : OK (50 avertissement(s), non exécutés compris) »,
    16 repris / 210 rejoués. Hooks : 548 tests réussis, couverture à 100 % lignes,
    instructions, branches et fonctions ; paquet : 281 tests réussis,
    98,30 % lignes/instructions, 90,64 % branches, 98,69 % fonctions.
- **Périmètre du lot 3** : aucun chemin ajouté au bloc `scope`, aucune extension nécessaire.
  Aucun changement des contrôles d'attestation ni de la mécanique de clôture.
  Les empreintes anciennes ne sont pas migrées : les critères originaux ne sont pas conservés,
  et réécrire leur acceptation sans l'humain serait contraire à `QUA-175`.
  La fiche active ne demande aucune migration ; l'incident préexistant du hook commit-msg
  reste décrit dans `docs/intentions/commit-msg-non-executable.md`.
- **Passation du lot 3** : après le commit de ce lot et de cette reprise,
  `node .githooks/state.mjs lot next`, puis STOP. Reprendre seulement le lot 4
  « renvois visibles avant la clôture » dans un contexte neuf. Aucun `verify` complet,
  aucune attestation, aucune clôture ni push entre les lots.

- **Dernier état** (2026-11-03) : BUILD, lot 1 commité (`3290841` : cadrage ; `76b9fad` : code),
  lot 2 commité (`b8e53f2` : clôture complète), hooks de commit réussis.
  Passation vers le lot 3 « empreinte sans [humain] » après commit de cette reprise ;
  l'état local lu par la commande reste la source du lot courant.
- **Périmètre ajouté au lot 2, avant code** : module close-mechanics dans le gabarit et son miroir
  `.githooks/close-mechanics.mjs` (extraction préalable de la mécanique et de la consommation) ;
  `.githooks/close-journal.mjs` et son gabarit (préparation et écriture idempotente du renvoi
  de preuve dans le journal, sans inventer de décisions métier) ;
  module check-docs dans le gabarit et son miroir, `.githooks/check-docs.test.mjs`
  (le faux échec de `verify` provient du contrôle de références exécuté par son moteur, pas du juge
  TypeScript) ; gabarit de `docs/recipes/working-with-branches.md` (source de la recette installée
  déjà cadrée) ; `docs/intentions/commit-msg-non-executable.md` (limite préexistante à conserver,
  sans la corriger dans ce lot).
- **Caractérisation préalable** : tests existants de clôture complétés avant extraction, puis commit
  distinct vert (`e762f48`, précédé du cadrage seul `766804f`).
  `node .githooks/wait-command.mjs --wait 600 node --test .githooks/close.test.mjs` :
  26 tests réussis, aucun échec. Contrôles globaux avant ces commits : code 0,
  31 avertissements, 72 repris / 152 rejoués. Hooks de cadrage : OK, 218 avertissements ;
  hooks de caractérisation : OK, 104 avertissements, sans désactivation.
  Aucun lot 3 ou 4 à réaliser dans ce contexte.
- **Extraction préalable** : mécanique de clôture et consommation déplacées sans changement de
  comportement dans `.githooks/close-mechanics.mjs` ; miroirs installés par `npm run installer-depot`.
  La fiche permanente du dépôt est un écart déclaré dans `outils/miroirs.json` :
  son bloc scope est mis à jour en plus du gabarit (l'installateur la préserve).
  Après rattachement au gabarit : contrôles globaux code 0, 40 avertissements,
  78 repris / 146 rejoués, sans aucun changement de comportement.
  Extraction commitée séparément (`96e7308`) ; hooks OK, 68 avertissements.
- **Cause et reproduction du lot 2** : le contrôle `docs-references` exigeait le fichier que la
  clôture crée seulement après `verify` ; la clôture n'ajoutait aucun renvoi dans le journal.
  Cinq tests ciblés nouveaux ont échoué avant correction. Le retrait normal de l'élément d'index
  multilignes existait déjà : il est conservé et testé dans le cycle complet, pas réinventé.
- **Réalisation du lot 2** : renvoi ajouté à l'entrée reconnue par preuve, titre, nom ou branche ;
  sans entrée identifiable, un renvoi minimal seul est créé. Ambiguïté ou journal inaccessible :
  fiche conservée. Relance idempotente. Une seule preuve future, celle du chantier actif existant
  dans un état valide, est tolérée par le contrôle de références ; les autres restent bloquantes.
  Contrats `QUA-228` et `QUA-229` ajoutés. La recette propre au dépôt est aussi un écart déclaré :
  son texte commun est aligné sur le gabarit, ses compléments locaux préservés.
- **Preuves du lot 2** :
  - `node .githooks/wait-command.mjs --wait 600 npm run test:hooks:coverage` : code 0,
    546 tests réussis, aucun échec ; hooks à 100 % lignes, instructions, branches et fonctions.
  - `node .githooks/check-docs.mjs` : 211 fichiers, 0 erreur ;
    `node .githooks/check-contract-tests.mjs` : 275 liens, 0 problème ;
    `node outils/verifier-tests-contrats.mjs` : 613 tests rattachés, 0 problème ;
    `node outils/verifier-miroirs.mjs` : 183 fichiers, 17 écarts déclarés, 0 problème ;
    `node .githooks/check-architecture.mjs` : 167 éléments, 0 absent ;
    `node .githooks/check-file-size.mjs` : code 0.
  - Aucun `verify` complet du dépôt exécuté entre lots, aucune attestation, aucune clôture ni push.
  - Validation principale avant commit de code :
    `node .githooks/wait-command.mjs --wait 600 node .githooks/run-checks.mjs` :
    code 0, « contrôles exécutés : OK (51 avertissement(s), non exécutés compris) ».
    Paquet : 281 tests réussis, couverture 98,30 % lignes/instructions, 90,64 % branches,
    98,69 % fonctions ; hooks : 546 tests réussis, 100 % ; hooks Claude : 15 tests réussis.
    Variables temporaires normales, aucune garde modifiée.
  - Empreinte relue : `sha256:922f5befc3a3593d`, `acceptanceCheck` retourne `same`.
    Aucun hook modifié non déclaré (`undeclaredHooks` : listes vides).
  - Hooks du commit de code `b8e53f2` : code 0, contrôles exécutés OK,
    51 avertissements, non exécutés compris. L'avertissement de Git sur le hook
    `.githooks/commit-msg` non exécutable reste la limite préexistante consignée dans
    `docs/intentions/commit-msg-non-executable.md` ; aucune nouvelle intervention humaine demandée.
- **Commits du lot 2** : `766804f` (cadrage initial seul), `e762f48` (caractérisation verte et
  intention de limite), `1f94ed7` (complément de cadrage seul), `96e7308` (extraction seule),
  `b8e53f2` (clôture complète). Aucun travail de code non commité après ce dernier commit.
- **Complément indispensable de cadrage** : le gabarit
  `packages/drwil/templates/common/base/docs/projects/kit-mechanics.md` doit citer les modules
  extraits, comme sa copie déjà cadrée. La première passe après extraction a révélé 7 contrôles
  en échec, tous issus des installations qui signalent le nouveau module hors de toute fiche.
  Les 26 tests de clôture restent réussis ; aucun contrôle affaibli. Ce chemin est cadré seul
  avant d'éditer la source de cette fiche.
- **Périmètre ajouté au lot 1** : `packages/drwil/src/guarantees-layers.ts` (applicabilité et classement de la
  couche), `packages/drwil/src/config-write.ts` (photo du code à la première installation), `packages/drwil/src/verify-types.ts`
  et `packages/drwil/src/verdict.ts` (information non bloquante lisible dans le verdict), `packages/drwil/src/verify.ts`
  (ne pas exécuter des contrôles de garantie d'une couche vide, même déjà cités),
  `packages/drwil/src/verify-checks.ts` et `packages/drwil/src/verdict-texts.ts` (découpage préalable des deux fichiers de 200 lignes,
  caractérisé par les tests existants d'installation, cycle et verdict), `docs/architecture.md`
  (carte des deux nouveaux modules, exigée par le contrôle).
- **Cause** : les couches vides sont jugées comme les couches codées ; le classement est recalculé
  au lancement de `guarantees` ; son résumé ignore la citation des contrôles par les contrats.
- **Réalisation** : couverture et e2e pas encore applicables sans code, y compris si les contrôles
  sont déjà cités ; réactivation dès le premier fichier, même non indexé ; origine photographiée à
  `init`, conservée aux mises à jour (ancienne installation sans photo : classement conservateur
  inchangé) ; déclaration et citation jugées par la même fonction. Contrats `QUA-224` à `QUA-227`
  ajoutés. Aucun fichier installé modifié, donc aucune synchronisation du gabarit nécessaire.
- **Preuves** :
  - Avant correction, les quatre premiers tests `QUA-224` à `QUA-227` échouaient.
  - `npm run build --workspace packages/drwil && TMPDIR="$PWD/.drwil/evidence/lot1-isolation" node --test packages/drwil/test/guarantees.test.mjs packages/drwil/test/config-write.test.mjs packages/drwil/test/kit.test.mjs packages/drwil/test/cycle.test.mjs` :
    247 tests, 247 réussis, 0 échec. Commande lancée par le script d'attente, en fond.
  - Le contrôle global exécute `npm run test:coverage` dans `packages/drwil` : 281 tests réussis ;
    98,30 % lignes/instructions, 90,64 % branches, 98,69 % fonctions, seuils tenus.
    `npm run test:hooks:coverage` : 540 tests réussis ; `npm run test:claude:coverage` : 15 tests réussis.
  - `npx biome check` sur les 12 fichiers de code/test touchés : aucune erreur ni avertissement.
    `node .githooks/check-file-size.mjs` : code 0 ;
    `node .githooks/check-contract-tests.mjs` : 273 liens, 0 problème ;
    `node outils/verifier-tests-contrats.mjs` : 607 tests rattachés, 0 problème.
  - `node outils/verifier-miroirs.mjs` : 181 fichiers, 17 écarts déclarés, 0 problème ;
    `node .githooks/check-architecture.mjs` : 166 éléments, 0 absent ;
    `node .githooks/check-docs.mjs` : 210 fichiers, 0 erreur.
    L'empreinte des critères acceptés reste `sha256:922f5befc3a3593d` : seuls leurs renvois de preuve ont changé.
- **Première passe globale, diagnostic rectifié** : `node .githooks/run-checks.mjs` par le sous-agent
  de contrôles, via le script d'attente, avec TMPDIR/TMP/TEMP dans le dépôt : 8 contrôles en échec,
  38 avertissements, 75 repris, 149 rejoués (détail dans `.drwil/evidence/run-checks.log` (si présent)).
  Les bancs refusent explicitement toute racine de fixtures située dans le dépôt, y compris après
  résolution du chemin réel. Ces échecs établissent que le TMPDIR forcé dans le dépôt était
  inadapté, pas qu'un outil interdisait les fixtures extérieures : aucune création hors dépôt
  n'a été tentée ni refusée par un outil. L'ancien diagnostic d'interdiction environnementale
  n'était donc pas établi par les erreurs observées. Les contrôles concernés sont ceux
  des contrats `QUA-060`, `QUA-101`, `QUA-102`, `QUA-103`, `QUA-104`, `QUA-107`, `QUA-108` et
  `miroirs-gabarit` (ses tests d'outils s'arrêtent sur les mêmes bancs ; la comparaison des miroirs,
  exécutée séparément, est verte). Ni garde ni contrôle n'a été affaibli.
- **Incident de procédure** : le sous-agent de contrôles a également exécuté un `verify` complet,
  malgré l'interdiction explicite transmise dans sa consigne. Résultat FAIL : blocages ci-dessus,
  critères des lots suivants non réalisés et attestations humaines manquantes. Aucune attestation
  ni transition de gouvernance n'a été effectuée ; ne pas réutiliser cette passe comme preuve de clôture.
- **Travail du lot 1** : les 16 fichiers ont été commités ; arbre propre au démarrage du lot 2.
- **Validation normale reprise par la session principale** :
  `node .githooks/wait-command.mjs --wait 600 node .githooks/run-checks.mjs` :
  code 0, contrôles exécutés OK, 9 avertissements (non exécutés compris),
  200 repris et 24 rejoués. Aucun répertoire temporaire forcé, aucune garde modifiée.
- **Hooks du lot 1** : réussis, code lot 1 OK, 51 avertissements (non exécutés inclus).
  Aux deux commits, Git a signalé `.githooks/commit-msg` ignoré car non exécutable. Préexistant,
  aucun contrôle réellement refusé pour cette cause ; ni désactivation ni correction hors périmètre.
- **Passation précédente (lot 2)** : commit `accfb02`, puis `node .githooks/state.mjs lot next`
  vers le lot 3. La passation courante est celle du lot 3 en tête de cette section.

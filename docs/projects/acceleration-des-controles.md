# Projet : des chantiers plus rapides chez l'adoptant — contrôles ciblés pendant un lot, formatage avant commit, recette réelle dès le premier lot

**Statut** : cadré le 2026-11-22 ; décisions D1 à D9 tranchées le 2026-11-22.
**Risque** : HIGH
**Maturité** : prêt
**Intention** : notes du 2026-11-22 (`docs/intentions/notes.md`, trois lignes écrites sur la branche du chantier
`installation-dans-un-depot-existant`, pas encore fusionnées) : « tests ciblés pendant un lot », « formatage automatique
avant commit », « recettes réelles dès le cadrage ».

<!-- scope
files:
  - packages/drwil/templates/common/base/.githooks/pre-commit
  - .githooks/pre-commit
  - packages/drwil/templates/common/base/.githooks/format-staged.mjs
  - .githooks/format-staged.mjs
  - .githooks/format-staged.test.mjs
  - packages/drwil/templates/common/base/.githooks/fingerprints.mjs
  - .githooks/fingerprints.mjs
  - packages/drwil/templates/common/base/.githooks/engine.mjs
  - .githooks/engine.mjs
  - .githooks/engine.test.mjs
  - .githooks/run-checks.test.mjs
  - packages/drwil/src/evidence.ts
  - packages/drwil/test/kit-verify-reprise.test.mjs
  - packages/drwil/src/kit-update.ts
  - packages/drwil/test/kit-mise-a-jour.test.mjs
  - packages/drwil/templates/common/base/AGENTS.md
  - AGENTS.md
  - packages/drwil/templates/common/base/docs/ia-first/8-conduct-rules.md
  - docs/ia-first/8-conduct-rules.md
  - packages/drwil/templates/common/base/docs/recipes/working-with-branches.md
  - docs/recipes/working-with-branches.md
  - packages/drwil/templates/common/base/docs/projects/model-brief.md
  - docs/projects/model-brief.md
  - packages/drwil/templates/common/tools/claude/.claude/skills/start-a-workstream/SKILL.md
  - .claude/skills/start-a-workstream/SKILL.md
  - packages/drwil/templates/common/tools/claude/.claude/agents/drwil-checks.md
  - .claude/agents/drwil-checks.md
  - packages/drwil/templates/common/tools/claude/.claude/skills/adopt-the-kit/SKILL.md
  - .claude/skills/adopt-the-kit/SKILL.md
  - packages/drwil/test/format-avant-commit.test.mjs
  - outils/recette-adoptant.mjs
  - outils/recette-adoptant.test.mjs
  - outils/verifier-recette-reelle.mjs
  - outils/verifier-recette-reelle.test.mjs
  - .drwil/ia-first.json
  - docs/contracts.md
  - docs/projects/kit-mechanics.md
  - docs/architecture.md
  - packages/drwil/CHANGELOG.md
  - packages/drwil/src/guarantees-layers.ts
  - packages/drwil/src/guarantees-e2e-tools.ts
  - packages/drwil/src/doctor-fix.ts
  - packages/drwil/src/doctor-checks.ts
  - packages/drwil/test/guarantees.test.mjs
  - packages/drwil/test/doctor-fix.test.mjs
  - packages/drwil/test/doctor-checks.test.mjs
  - packages/drwil/test/mise-a-jour-empreinte.test.mjs
  - packages/drwil/templates/common/base/.githooks/scope-gate-kit.mjs
  - .githooks/scope-gate-kit.mjs
  - .githooks/scope-gate.test.mjs
  - packages/drwil/templates/common/base/docs/ia-first/4-checks-in-git.md
  - docs/ia-first/4-checks-in-git.md
  - packages/drwil/src/doctor.ts
  - packages/drwil/templates/common/base/.githooks/glob.mjs
  - .githooks/glob.mjs
  - .githooks/glob.test.mjs
  - packages/drwil/templates/common/tools/claude/.claude/hooks/bash-guard.mjs
  - .claude/hooks/bash-guard.mjs
  - packages/drwil/test/claude-hooks.test.mjs
  - .githooks/check-control-coverage.mjs
  - .githooks/check-control-coverage.test.mjs
  - packages/drwil/templates/common/base/.githooks/check-control-coverage.mjs
  - packages/drwil/src/fingerprint.ts
  - outils/resserrer-paths.mjs
  - outils/resserrer-paths-lecture.mjs
  - outils/resserrer-paths.test.mjs
-->

(Le bloc `scope` couvre les trois volets tels que tranchés : le hook de commit et son module de formatage, livrés
(gabarit et copie du dépôt) ; l'empreinte par contrôle (moteur, preuve du paquet et leurs tests, D3) et la ligne du compte rendu de mise à jour qui
annonce la première passe complète (`packages/drwil/src/kit-update.ts` et son test) ; la consigne de
passe ciblée pendant un lot (consignes, skill de lancement, sous-agent des contrôles, recette des branches, D1) ; le
modèle de fiche pour la recette réelle (D7, D8) ; l'outil de recette et l'avertissement propres au dépôt (`outils/`) ;
les `paths` des contrôles du dépôt dans `.drwil/ia-first.json`. `.githooks/engine.mjs` fait 189 lignes : toute logique
neuve va dans `.githooks/fingerprints.mjs` ou un module découpé, à lister par commit séparé. Élargi le 2026-11-22 sur
demande du demandeur (« oui on traite tout ») : les contrôles que le kit génère ne reçoivent plus `paths: ["**"]`
(`packages/drwil/src/guarantees-layers.ts`, `packages/drwil/src/guarantees-e2e-tools.ts`), `drwil doctor` et `--fix` le signalent et le
corrigent (`packages/drwil/src/doctor-checks.ts`, `packages/drwil/src/doctor-fix.ts`), et la mise à jour réécrit les déclarations intactes du kit
(`packages/drwil/src/kit-update.ts`, déjà listé) ; avec leurs tests. Le 2026-11-23, choix du demandeur : les nouveaux tests des lots 3 et 6 sur la mise à jour et la reprise vont dans `packages/drwil/test/mise-a-jour-empreinte.test.mjs` (à créer), car `QUA-315` fige la liste des tests des fichiers `kit-*.test.mjs`.)


(Élargi le 2026-11-23 par le sondage des limites, six réponses « Traiter maintenant » du demandeur : contrôles du projet
en parallèle chez l'adoptant, page livrée des contrôles (`format`, `readsChecks`, `parallel`), racine transmise au point
`doctor` des chemins du kit, chemins du dépôt resserrés avec exclusion dans les `paths`, boucles d'attente `pgrep`
refusées par le garde des commandes, adoptant sans reprise des verdicts signalé par `doctor` ; lots 9 à 12. Dans le
cadre, sans élargissement : un seul appel du formateur pour tous les fichiers indexés.)
## 1. Besoin

Demandeur, 2026-11-22 : « ce gain est au final fait pour tout adoptant, c'est lui le vrai produit ». Le paquet livré
(gabarit `packages/drwil/templates/`, CLI `packages/drwil/`) d'abord ; le dépôt drwil en profite comme premier banc
d'essai (QUA-018, dépôt ou livrable : le livrable, plus les copies du dépôt).

Constats (chantier `installation-dans-un-depot-existant`, 2026-11-21 et 2026-11-22) :

- **Passes complètes répétées** : 2 à 3 passes complètes d'environ 7 min par sous-agent de lot, relancées pour un
  formatage ou un chemin cité. Mesures : `run-checks` complet 367 à 422 s sous 2 processeurs ; CI d'une PR 8 à 11 min,
  plus 3 min sur la branche principale après fusion.
- **Relances pour le seul formatage** : un commit refusé par le lint (Biome, avertissements bloquants) pour un
  formatage, puis une nouvelle passe.
- **Défauts vus tard** : les défauts sous Copilot et les étapes de CI de `drwil_walk` ne sont apparus qu'à la recette
  finale sur de vrais adoptants, pas pendant les lots.

Ce qui existe déjà (lu dans le code le 2026-11-22) :

- Au commit, le moteur reporte un contrôle du projet dont aucun fichier indexé ne correspond à ses `paths` ; il reste
  « non exécuté » et le push et la CI le rejouent (`.githooks/engine.mjs`, QUA-013).
- Hors hook, `run-checks` reprend un verdict « ok » dont l'empreinte propre (déclaration et fichiers de ses `paths`) n'a
  pas changé (QUA-141) ; le pre-push aussi (QUA-152) ; `drwil verify --failed` ne rejoue que les contrats non PASS
  (QUA-159) ; la preuve de clôture exige l'arbre entier (QUA-140).
- Le skill de lancement dit déjà : « Between two lots, `verify --failed` only after a failure: the full pass is the
  closing's » (QUA-171). La consigne existe ; elle n'est pas tenue par le sous-agent des contrôles (`drwil-checks`), qui
  lance toujours `run-checks` et `drwil verify --agent` en entier.
- **Dans le dépôt, la reprise ne prend presque jamais** : sur 305 contrôles déclarés, 293 citent `.drwil/ia-first.json`
  entier dans leurs `paths`, 280 `.githooks/contract-tests.mjs`, 191 `.githooks/**`, 174 `packages/drwil/**`. Un
  chantier qui ajoute un contrat (il touche `.drwil/ia-first.json`) ou un module de `.githooks/` invalide donc presque
  tous les verdicts, au commit comme hors hook.
- Aucun formateur n'est connu du kit : pas de réglage, pas de détection de stack (`packages/drwil/src/render-stack.ts`
  ne connaît que des commandes de test et de lint), le pre-commit ne fait que juger.
- Aucune consigne ni outil ne fait rejouer un vrai adoptant pendant un chantier ; la recette réelle se fait à la main,
  à la fin.

Le projet : qu'un chantier, chez l'adoptant comme ici, ne paie qu'une passe complète (celle de la clôture), sache dès le
commit quelle commande de formatage lancer, et voie les défauts d'installation dès son premier lot — sans rien retirer à
l'exigence (QUA-019, QUA-013) ni ralentir ou casser l'adoptant.

Première mise à jour après le nouveau calcul de l'empreinte (D3, ajout validé par le demandeur le 2026-11-22) : les
verdicts déjà enregistrés chez l'adoptant portent l'ancienne empreinte ; ils sont invalidés une fois et la première passe
après la mise à jour rejoue tout. C'est attendu, mais l'adoptant doit le savoir pour ne pas y lire une régression : le
compte rendu de la mise à jour (`npx drwil init`) le lui dit.

## Critères d'acceptation

- Pendant un lot, la conduite livrée (consignes, skill de lancement, sous-agent des contrôles) ne lance que le commit et,
  après un échec, les contrôles touchés et les tests cités par les contrats de la fiche, choisis par l'outil ; la passe
  complète reste exigée avant VERIFY et la clôture, et la CI reste complète — `QUA-327`
- L'empreinte d'un contrôle couvre sa déclaration et la configuration qu'il lit, pas tout `.drwil/ia-first.json` : un
  contrat ajouté ne rejoue plus les autres contrôles ; la preuve de clôture garde l'empreinte de l'arbre entier — `QUA-141`
- Une mise à jour (`npx drwil init`) depuis une version antérieure au nouveau calcul de l'empreinte le signale en une
  ligne de son compte rendu, dans la langue du projet : « première passe complète, puis reprise des verdicts » ; une
  mise à jour depuis une version qui le connaît déjà ne l'écrit pas — `QUA-141`
- Avec un formateur déclaré, un commit dont un fichier indexé n'est pas formaté est refusé, sans qu'aucun fichier soit
  modifié, avec la commande exacte qui le formate et les fichiers en cause — `QUA-328`
- Sans clé `format`, le commit est inchangé ; l'adoption la propose, une mise à jour ne l'active jamais — `QUA-329`
- Le temps ajouté au commit par la vérification du formatage est mesuré sur un projet temporaire et rapporté au journal de
  clôture, sans seuil — [humain] `QUA-013`
- Le modèle de fiche livré recommande une recette réelle dès le premier lot d'un chantier qui touche ce que l'utilisateur
  installe ; dans le dépôt seul, un avertissement non bloquant le rappelle quand le bloc `scope` touche l'installation ou
  la mise à jour et que le lot 1 ne cite pas de recette réelle ; jamais de refus — `QUA-330`
- Dans le dépôt, un outil construit le tarball de la branche et l'installe sur des copies de marinade-poulet et
  `drwil_walk` — `QUA-331`
- Recette du chantier par une mise à jour réelle : des copies de marinade-poulet (GitLab) et `drwil_walk` (GitHub) mises
  à jour avec un tarball du chantier ; le commit de mise à jour passe sans nouveau blocage et sans clé `format` ajoutée,
  le compte rendu signale la première passe complète ; puis un second commit qui touche un fichier du projet reprend les
  verdicts des contrôles non concernés (« repris ») [humain] — `QUA-332`
- Un projet neuf dont la couche est à la racine n'a aucun contrôle généré par le kit en `paths: ["**"]` : couverture,
  couverture du diff et e2e reçoivent les chemins du code et de sa configuration (sources, tests, configuration de
  l'outil, `package*.json`) — `QUA-087`, `QUA-089`
- Une mise à jour (`npx drwil init`) réécrit les `paths: ["**"]` des contrôles restés tels que le kit les a posés, et
  ceux de la paire de couverture d'une couche (`coverage-<couche>`, `coverage-diff-<couche>`) même retouchée par
  l'adoptant, avec les chemins calculés par le kit ; son compte rendu nomme chaque contrôle réécrit ; tout autre contrôle
  retouché n'est que signalé ; la barrière de périmètre admet ce commit chez l'adoptant — `QUA-141`, `QUA-238`
- `drwil doctor` signale un contrôle généré par le kit encore en `paths: ["**"]` ; `--fix` applique la même règle que
  la mise à jour : la paire de couverture d'une couche réécrite même retouchée, tout autre contrôle retouché seulement
  signalé (choix du demandeur le 2026-11-23) — `QUA-303`
- Chez l'adoptant, l'adoption propose le réglage `parallel` quand le projet déclare plusieurs contrôles, `drwil doctor`
  le signale sur un projet qui ne l'a pas, une mise à jour ne l'active jamais ; un contrôle qui ne supporte pas le
  parallèle garde `parallel: false` — `QUA-334`
- La page livrée des contrôles décrit les clés `format`, `readsChecks` et `parallel` — `QUA-333`
- Le point `doctor` d'un contrôle du kit en `paths: ["**"]` se tait quand rien ne se délimite sous la racine — `QUA-303`
- Un motif de `paths` précédé de `!` exclut des fichiers ; les contrôles du dépôt sur `.githooks/**` ou
  `packages/drwil/**` excluent les tests des autres contrats quand ils ne les lisent pas, après audit contrôle par
  contrôle ; nombre de contrôles rejoués pour un fichier mesuré avant et après — `QUA-141`
- Le garde des commandes refuse une boucle d'attente `while`/`until` sur `pgrep` lancée par un agent et renvoie à
  `node .githooks/wait-command.mjs` — `QUA-337`
- `drwil doctor` signale un kit installé antérieur au calcul d'empreinte par contrôle (`FINGERPRINT_SCHEME`) : ses
  passes ne reprennent aucun verdict tant qu'il n'est pas mis à jour — `QUA-026`
- Le formateur reçoit tous les fichiers indexés en un seul appel quand sa commande le permet — `QUA-328`

## Contrats modifiés

- `QUA-141` — ancien critère : l'empreinte d'un contrôle couvre « sa déclaration (commande, `needsBuild`) et le contenu
  des fichiers suivis ou non suivis, non ignorés, qui correspondent à ses `paths` », d'où `.drwil/ia-first.json` entier
  dans les `paths` de 293 contrôles sur 305 — raison : un contrat ajouté invalide presque tous les verdicts ; l'empreinte
  couvre désormais la déclaration du contrôle et la configuration qu'il lit, livré à tout projet ; la première mise à
  jour depuis une version antérieure le signale dans son compte rendu (« première passe complète, puis reprise des
  verdicts »), et la preuve du contrat ajoute le test de ce message (`packages/drwil/test/mise-a-jour-empreinte.test.mjs`, choix du demandeur le 2026-11-23 : `QUA-315` fige les tests `kit-*`)
  (validé par le demandeur le 2026-11-22).
- `.githooks/pre-commit` — lance la vérification du formatage (`format-staged.mjs` (à créer)) quand la clé `format` est déclarée ;
  inchangé sans clé (validé par le demandeur le 2026-11-22).
- `.githooks/fingerprints.mjs` — l'empreinte d'un contrôle couvre sa déclaration et la configuration qu'il lit, pas tout
  `.drwil/ia-first.json` (`QUA-141`) (validé par le demandeur le 2026-11-22).
- `.githooks/engine.mjs` — branche le nouveau calcul d'empreinte, sans logique neuve au-delà du branchement (plafond de
  200 lignes) (validé par le demandeur le 2026-11-22).
- `.githooks/engine.test.mjs` — tests du nouveau calcul d'empreinte au commit (validé par le demandeur le 2026-11-22).
- `.githooks/run-checks.test.mjs` — test : un contrat ajouté ne rejoue plus les autres contrôles (validé par le
  demandeur le 2026-11-22).
- `QUA-087` — ancien critère : les contrôles de couverture d'une couche à la racine sont déclarés sur `paths: ["**"]`
  (`packages/drwil/src/guarantees-layers.ts`) — raison : tout fichier modifié les rejoue et ils ne reprennent jamais leur
  verdict (marinade-poulet : 62 s et 66 s par passe) ; ils reçoivent les chemins du code et de sa configuration (validé
  par le demandeur le 2026-11-22).
- `QUA-089` — ancien critère : le contrôle e2e proposé par le kit est déclaré sur `paths: ["**"]`
  (`packages/drwil/src/guarantees-e2e-tools.ts`) — même raison ; il reçoit les chemins du code et de sa configuration
  (validé par le demandeur le 2026-11-22).
- `QUA-303` — ancien critère : `drwil doctor` signale la couverture jouée deux fois et `--fix` la fusionne ; `--fix` pose
  `paths: ["**"]` sur un contrôle réservé à la CI sans `paths` — raison : `["**"]` empêche toute reprise ; `doctor`
  signale aussi un contrôle généré par le kit encore en `["**"]` et `--fix` le réécrit s'il est intact (validé par le
  demandeur le 2026-11-22).
- `QUA-141` (suite) — la mise à jour réécrit les `paths: ["**"]` des contrôles restés tels que le kit les a posés et le
  dit dans son compte rendu ; un contrôle retouché par l'adoptant n'est que signalé (validé par le demandeur le
  2026-11-22, réécriture à la mise à jour choisie plutôt que par `doctor --fix` seul) ; exception, la paire de
  couverture d'une couche (`coverage-<couche>`, `coverage-diff-<couche>`) est réécrite même retouchée, comme celle de
  marinade-poulet écrite à la main en Vitest (validé par le demandeur le 2026-11-23, risque accepté : une commande de
  l'adoptant qui lirait d'autres fichiers reprendrait un verdict à tort ; le compte rendu nomme le contrôle réécrit).
- `QUA-238` — ancien critère : le commit de mise à jour du kit n'admet, dans `.drwil/ia-first.json`, que les réglages
  recalculés par `init` et des contrôles ajoutés ; tout contrôle existant modifié le fait juger comme un commit ordinaire
  (refusé en SCOPING) — raison : la mise à jour réécrit les `paths: ["**"]` ; la barrière admet un contrôle existant dont
  seuls les `paths` passent de `["**"]` aux chemins calculés par le kit (validé par le demandeur le 2026-11-23).
- `packages/drwil/templates/common/base/.githooks/scope-gate-kit.mjs`, `.githooks/scope-gate-kit.mjs`,
  `.githooks/scope-gate.test.mjs` — la barrière admet la réécriture des `paths` d'un contrôle par la mise à jour, et son
  test (validé par le demandeur le 2026-11-23).
- `packages/drwil/src/guarantees-layers.ts`, `packages/drwil/src/guarantees-e2e-tools.ts` — chemins du code et de sa configuration au lieu
  de `**` (validé par le demandeur le 2026-11-22).
- `packages/drwil/src/doctor-fix.ts`, `packages/drwil/src/doctor-checks.ts` — signalement et réécriture d'un `["**"]` intact du kit
  (validé par le demandeur le 2026-11-22).
- `packages/drwil/test/guarantees.test.mjs`, `packages/drwil/test/doctor-fix.test.mjs`, `packages/drwil/test/doctor-checks.test.mjs` — tests des chemins
  générés, du signalement et de la réécriture (validé par le demandeur le 2026-11-22).
- `QUA-303` (suite) — `packages/drwil/src/doctor.ts` transmet la racine du projet aux points des contrôles, pour que le
  point des chemins du kit se taise quand rien ne se délimite (validé par le demandeur le 2026-11-23, sondage des
  limites).
- `QUA-026` — ancien critère : `doctor` signale la version installée — raison : un adoptant sur un kit antérieur à
  l'empreinte par contrôle ne reprend aucun verdict ; `doctor` le dit et renvoie à la mise à jour (validé par le
  demandeur le 2026-11-23, sondage des limites).
- `QUA-141` (suite) — un motif de `paths` précédé de `!` exclut des fichiers de l'empreinte et du report au commit ; les
  `paths` du dépôt sont resserrés après audit (validé par le demandeur le 2026-11-23, sondage des limites).
- `packages/drwil/templates/common/base/.githooks/glob.mjs`, `.githooks/glob.mjs`, `.githooks/glob.test.mjs` — motif
  d'exclusion `!` et ses tests (validé par le demandeur le 2026-11-23, sondage des limites).
- `packages/drwil/templates/common/tools/claude/.claude/hooks/bash-guard.mjs`, `.claude/hooks/bash-guard.mjs`,
  `packages/drwil/test/claude-hooks.test.mjs` — refus d'une boucle d'attente sur `pgrep`, et son test (validé par le
  demandeur le 2026-11-23, sondage des limites).
- `packages/drwil/src/doctor.ts` — racine transmise aux points des contrôles (validé par le demandeur le 2026-11-23,
  sondage des limites).
- l'outil resserrer-paths (dossier outils/), son module de lecture des sources (`outils/resserrer-paths-lecture.mjs`, ajouté au lot 13 :
  le plafond de 200 lignes par fichier impose de couper l'outil en deux) et son test — outil qui suit les imports pour resserrer les `paths` des contrôles de
  tests (validé par le demandeur le 2026-11-23, sondage des limites ; contrat modifié : `QUA-141`, déjà déclaré).

## 2. Hors périmètre

- Raccourcir la CI elle-même (tranches, cache, rejeu des hooks de la branche principale) : la CI reste complète ; ce
  chantier n'en retire aucun contrôle.
- Une option « passe de lot » de `run-checks` : écartée (D1).
- Réécrire ou ré-indexer un fichier au commit : écarté (D4).
- Un seuil de temps au formatage : écarté (D6).
- Le journal du temps passé dans les contrôles : fiche `docs/projects/temps-des-controles-journalise.md` ; ce chantier
  s'en sert s'il est fusionné, sinon relève les durées à la main.
- Garder ou retirer les sous-agents de chantier : fiche `docs/projects/fin-des-sous-agents-de-chantier.md`.
- Détecter un formateur pour toutes les stacks (Python, Go…) : ce chantier livre la clé et la proposition par
  l'adoption pour les formateurs que la détection connaît déjà ; l'élargissement suit
  `docs/intentions/detection-de-stack-elargie.md`.
- Publier ou automatiser une recette de version (module de release, QUA-051 à QUA-054) : intouché.
- Une notion de « chemin critique » pour lancer un contrôle lent au commit :
  `docs/intentions/controle-lent-chemin-critique.md`.

## 3. Contraintes

- **QUA-019** (pas de contournement) : « ciblé pendant le lot » ne remplace jamais la passe complète exigée avant VERIFY
  et la clôture, ni la CI ; aucun `--no-verify`, aucun contrôle désactivé.
- **QUA-013** (un contrôle non exécuté n'est pas passé) : la reprise ne vaut que sur une empreinte qui couvre tout ce que
  le contrôle lit ; un contrôle dont la configuration lue ne se délimite pas garde le fichier entier.
- **QUA-018** : livrable d'abord (gabarit), copie du dépôt rafraîchie par `npm run installer-depot` dans le même commit ;
  l'outil de recette et l'avertissement (`outils/`) restent propres au dépôt.
- **Ne jamais ralentir ni casser l'adoptant** : la vérification du formatage ne lit que l'index, ne modifie rien, se
  mesure, et reste inactive sans clé `format`.
- **Mise à jour** : une nouvelle exigence ne bloque pas un projet existant (réglage `newRequirements` de
  `.drwil/ia-first.json`) ; la clé `format` n'est jamais ajoutée par une mise à jour. La première mise à jour après D3
  invalide une fois les verdicts enregistrés (ancienne empreinte) : la première passe rejoue tout, ce que le compte
  rendu de la mise à jour dit ; elle ne bloque rien. Le compte rendu reste celui de `QUA-239` (`finishUpdate`) : une
  ligne de plus, sans changer les trois messages qu'il exige.
- Plafond de 200 lignes : `.githooks/run-checks.mjs` est à 200, `.githooks/engine.mjs` à 189, `.githooks/fingerprints.mjs`
  à 93 ; toute logique neuve va dans un module découpé.
- Ordre : après la fusion de `installation-dans-un-depot-existant` (en cours, touche l'installation et la CI de
  l'adoptant) ; `preuves-fiables-rejeux-mesures` et `temps-des-controles-journalise` touchent
  `.githooks/run-checks-verdicts.mjs`, que ce chantier ne liste pas : à garder ainsi.
- Les autres outils (Copilot, Gemini, Codex, Cursor) lisent la même consigne dans `AGENTS.md` et la section 8 ; seul
  Claude Code a le sous-agent `drwil-checks`.

## 4. Décisions

Priorité P0, en tête des fiches cadrées : demande explicite du demandeur le 2026-11-22. Tranchées par le demandeur le
2026-11-22 (l'agent n'en a tranché aucune) :

- **D1 — Forme du « ciblé pendant le lot »** : consigne seule ; pendant un lot, le commit (déjà ciblé sur l'index) et,
  après un échec, `verify --failed` ; le sous-agent des contrôles n'est appelé qu'avant VERIFY et à la clôture.
  `QUA-171` reste tel quel (il dit déjà « `verify --failed` entre deux lots qu'après un échec »). *Alternatives écartées* :
  une option « passe de lot » de `run-checks` ; les deux.
- **D2 — Périmètre des tests ciblés** : les contrôles touchés par les fichiers du lot, plus les tests cités par les
  contrats de la fiche ; c'est l'outil qui juge. *Alternatives écartées* : les contrôles touchés seuls ; une liste
  choisie par l'agent.
- **D3 — Faire prendre la reprise** : l'empreinte d'un contrôle couvre sa déclaration et la configuration qu'il lit, pas
  tout `.drwil/ia-first.json` (`QUA-141` modifié, livré) ; puis resserrer les `paths` du dépôt au vu de la mesure.
  *Alternatives écartées* : resserrer les `paths` du dépôt seuls ; ne rien changer.
- **D4 — Le formatage au commit** : il refuse toujours : le commit est refusé, avec la commande de formatage et les
  fichiers en cause ; aucune réécriture. *Alternatives écartées* : réécrire et ré-indexer les fichiers entièrement indexés
  (recommandation de l'agent) ; avertir seulement.
- **D5 — Déclarer le formateur** : une clé `format` dans `.drwil/ia-first.json`, inactive si elle est absente, proposée
  à l'adoption (skill `adopt-the-kit`), jamais activée par une mise à jour. *Alternative écartée* : déduite de la stack,
  active par défaut.
- **D6 — Budget de temps** : mesuré et rapporté, sans seuil. *Alternative écartée* : un seuil qui arrête et avertit.
- **D7 — Recette réelle** : recommandation livrée (modèle de fiche, skill de lancement), plus un avertissement non
  bloquant dans le dépôt seul ; jamais de refus. *Alternatives écartées* : avertissement livré ; refus de lancement.
- **D8 — Livrable ou dépôt pour la recette réelle** : les deux ; l'outil dans le dépôt (tarball de la branche installé
  sur des copies de marinade-poulet et `drwil_walk`), la consigne générale livrée. *Alternatives écartées* : dépôt seul ;
  livrable seul.
- **D9 — Une fiche ou trois** : une fiche, la mesure en premier. *Alternative écartée* : trois fiches.

## 5. Points à trancher

Aucun.

## 6. Increments

- **Lot 1 — Mesure de départ** [IA] : sur un lot réel du dépôt et sur des copies de marinade-poulet et de `drwil_walk`,
  relever le nombre de passes, leur durée, les contrôles repris et rejoués, les plus lents
  (`.drwil/evidence/run-checks.log` (si présent)), et le temps d'un commit ; consigné dans la section « Reprise ». Critère de sortie : chiffres écrits, commités.
- **Lot 2 — Passe ciblée pendant un lot** [IA] : D1 et D2 ; consignes (`AGENTS.md`, section 8, skill de lancement,
  sous-agent des contrôles, recette des branches) ; contrat de la conduite pendant un lot. Critère de sortie : contrôle du
  contrat vert, `npm run installer-depot` sans écart.
- **Lot 3 — Empreinte par contrôle** [IA] : D3 ; tests d'abord (un contrat ajouté ne change pas l'empreinte des autres
  contrôles ; la configuration lue par un contrôle la change ; la preuve de clôture garde l'arbre entier) ; empreinte dans
  le moteur et la preuve du paquet ; ligne du compte rendu de mise à jour « première passe complète, puis reprise des
  verdicts » (test d'abord : écrite depuis une version antérieure, absente sinon, en français et en anglais) ; `QUA-141`
  mis à jour ; puis `paths` du dépôt resserrés et mesure avant et après sur le même lot. Critère de sortie : tests de
  `QUA-141` verts, gain chiffré.
- **Lot 4 — Formatage vérifié avant commit** [IA] : D4 à D6 ; tests d'abord (fichier indexé non formaté : commit refusé,
  commande et fichiers nommés, aucun fichier modifié ; fichier formaté : commit accepté ; sans clé `format` : rien ne
  change ; formateur absent : refus qui le dit ; mise à jour : clé jamais ajoutée), module découpé, hook de commit,
  proposition par l'adoption, mesure du temps. Critère de sortie : tests verts, temps du commit relevé.
- **Lot 5 — Recette réelle dès le premier lot** [IA] : D7 et D8 ; modèle de fiche et skill de lancement (livrés) ;
  outil de recette et avertissement non bloquant (dépôt), rejoués sur marinade-poulet et `drwil_walk`. Critère de
  sortie : une recette rejouée par l'outil, résultat au journal.
- **Lot 6 — Chemins des contrôles générés** [IA] : tests d'abord (couche à la racine : couverture, couverture du diff
  et e2e sans `["**"]` ; mise à jour : `["**"]` intact du kit et paire de couverture réécrits et dits, autre contrôle retouché seulement signalé,
  commit admis par la barrière (`QUA-238`) ;
  `doctor` signale, `--fix` réécrit s'il est intact) ; `packages/drwil/src/guarantees-layers.ts`, `packages/drwil/src/guarantees-e2e-tools.ts`,
  `packages/drwil/src/kit-update.ts`, `packages/drwil/src/doctor-checks.ts`, `packages/drwil/src/doctor-fix.ts` ; `QUA-087`, `QUA-089`, `QUA-303`, `QUA-141` mis à jour.
  Critère de sortie : tests verts.
- **Lot 7 — Contrats et carte** [IA] : contrats créés, carte du moteur, carte d'architecture, ligne du `CHANGELOG`.
  Critère de sortie : `run-checks` sans échec, `drwil verify --agent` en `GOVERNANCE: PASS`.
- **Lot 8 — Recette par une mise à jour réelle** [humain] : tarball du chantier installé en mise à jour sur des copies de
  marinade-poulet (GitLab) et `drwil_walk` (GitHub) ; commit de mise à jour sans nouveau blocage ni clé `format` ajoutée,
  compte rendu qui signale la première passe complète et la réécriture des `paths: ["**"]` du kit, puis second commit
  (fichier du projet touché) dont les contrôles non concernés, couverture comprise, sont « repris ». Critère de sortie : attestation du contrat `Manuel` de la recette.
- **Lot 9 — Page des contrôles et doctor** [IA] : clés `format`, `readsChecks`, `parallel` décrites dans la page
  livrée des contrôles ; racine transmise par `packages/drwil/src/doctor.ts` ; `doctor` signale un kit antérieur à l'empreinte par contrôle
  (`QUA-026`). Critère de sortie : tests verts.
- **Lot 10 — Contrôles en parallèle chez l'adoptant** [IA] : l'adoption propose `parallel`, `doctor` le signale, la
  mise à jour ne l'active jamais ; un seul appel du formateur pour tous les fichiers (`QUA-328`) ; gain mesuré sur une
  copie de marinade-poulet. Critère de sortie : tests verts, gain chiffré.
- **Lot 11 — Chemins du dépôt resserrés** [IA] : motif `!` dans `.githooks/glob.mjs` (tests d'abord), audit contrôle par
  contrôle des `paths` sur `.githooks/**` et `packages/drwil/**`, mesure avant et après. Critère de sortie : tests
  verts, gain chiffré.
- **Lot 12 — Boucles d'attente refusées** [IA] : le garde des commandes refuse `while`/`until` sur `pgrep` et renvoie à
  `.githooks/wait-command.mjs` (tests d'abord) ; contrats créés, carte, ligne du `CHANGELOG` pour les lots 9 à 12. Critère de
  sortie : tests verts.
- **Lot 13 — Chemins resserrés par les imports** [IA] : outil du dépôt resserrer-paths (dossier outils/, tests d'abord) qui
  suit les imports statiques d'un fichier de test et propose les `paths` exacts du contrôle ; appliqué aux contrôles de
  tests qui citent `.githooks/**` et `packages/drwil/**` (`.githooks/state.mjs`, `.githooks/engine.mjs`, `.githooks/contract-tests.mjs` : 194 à 294
  contrôles invalidés), mesure avant et après. Critère de sortie : tests verts, gain chiffré.

## 7. Reprise

- **Lot 13 fait (2026-11-23)** : outil du dépôt `outils/resserrer-paths.mjs` (lecture des sources dans
  `outils/resserrer-paths-lecture.mjs`, plafond de 200 lignes par fichier ; tests d'abord dans `outils/resserrer-paths.test.mjs`) :
  il suit les imports statiques relatifs (`import`, `export from`, `import()` et `require` littéraux, `dist` lu dans `src`) des
  fichiers de test d'un contrôle, de proche en proche, plus les fichiers que nomment leurs chaînes (chemin existant, ou nom de
  fichier, le plus proche du citeur), et propose les `paths` exacts à la place de `.githooks/**` et `packages/drwil/**`. Il garde le
  motif large au moindre doute : import non résolu ou calculé, `worker_threads`, sous-processus de commande inconnue, dossier
  du dépôt lu, commande composée. Sans `--appliquer` rien n'est écrit ; avec, seul le tableau `paths` des contrôles resserrés est
  réécrit, dans son style. Contrat `QUA-338`, contrôle `tests-qua-338` ; `QUA-141` inchangé (son texte ne change pas). **Résultat
  honnête** : sur 264 contrôles de tests aux motifs larges, 6 sont resserrés (`tests-qua-191`, `-192`, `-193`, `-198`, `-316`,
  `-317`), 258 gardent leur motif large : leurs tests copient ou parcourent les hooks et le gabarit du paquet, ou importent `dist`,
  donc `packages/drwil/src` (sous-processus et `import()` calculés), si bien que le motif large est leur vraie dépendance. Chaque
  contrôle resserré a été rejoué sous une trace des lectures de fichiers : aucun fichier lu hors des nouveaux `paths`. **Mesure**
  (contrôles invalidés par un fichier touché, 315 contrôles) avant → après : `.githooks/state.mjs` 194 → 188 ;
  `.githooks/engine.mjs` 194 → 188 ; `.githooks/briefs.mjs` 196 → 190 ; `.githooks/dashboard.mjs` 194 → 189 ;
  `.githooks/check-diff-coverage.mjs` 194 → 191 ; `.githooks/glob.mjs` 196 → 193 ; `.githooks/engine.test.mjs` 140 → 138 ;
  `.githooks/contract-tests.mjs` 295 → 295 (le lanceur est cité par tous) ; `packages/drwil/src/evidence.ts` 191 et
  `packages/drwil/CHANGELOG.md` 108 : inchangés. **Limite hors cadre** : gagner davantage demande de couper la dépendance
  elle-même (tests qui copient tout `.githooks`, `dist` qui tire tout le paquet), pas de mieux lire les imports ; chemin
  d'intention : une fiche d'intention (`docs/intentions/`) sur des tests à dépendances déclarées, fichiers touchés : les tests
  de `.githooks/` et de `packages/drwil/test/`. Chemin ajouté au `scope` : `outils/resserrer-paths-lecture.mjs` (découpe imposée
  par le plafond de 200 lignes, admis d'office par la barrière).

- **Lot 12 fait (2026-11-23)** : le garde des commandes (`.claude/hooks/bash-guard.mjs`, gabarit et copie) refuse (`deny`) une boucle
  `while` ou `until` dont la condition lance `pgrep` (forme simple, `until !`, `$(…)`, accent grave, `bash -c`) et renvoie à
  `node .githooks/wait-command.mjs` en appel de fond ; une boucle citée dans un texte (`while` seul entre accents graves),
  un message de commit ou un `pgrep` hors boucle passent. Contrat `QUA-337` (contrôle `tests-qua-337`, test dans
  `packages/drwil/test/claude-hooks.test.mjs`) ; carte `docs/architecture.md` ; lignes sous « Unreleased » du `CHANGELOG`
  pour les lots 9 à 12. Limite connue, dite au contrat : un texte entre guillemets qui commence par une telle boucle
  (heredoc) est refusé aussi, comme pour `QUA-114`.

- **Lot 11 fait (2026-11-23)** : motif `!` dans les `paths` : `matchPaths` de `.githooks/glob.mjs` (gabarit et copie), à la
  manière de `.gitignore` : le dernier motif qui correspond décide, `!motif` retire, un motif plus loin reprend ; sans
  motif positif, rien. Lu par le moteur (report au commit), l'empreinte par contrôle et le formateur ; le contrôle de
  couverture CI (`.githooks/check-control-coverage.mjs`, gabarit et copie) saute les `!` (le job du CI dépasse le contrôle) ;
  l'empreinte de preuve du paquet (`packages/drwil/src/fingerprint.ts`) garde l'ordre des `paths` dès qu'un `!` s'y
  trouve. `QUA-141` : ligne « Modifié ». **Audit** : trace des lectures de fichiers (préchargement de `fs`, un `node --test`
  par fichier de test, 92 fichiers) ; 107 des 263 contrôles de tests citant `.githooks/**` ou `packages/drwil/**` reçoivent
  `!.githooks/*.test.mjs` et `!packages/drwil/test/*.test.mjs` (moins les tests lus ou cités), `!packages/drwil/templates/**`,
  le `CHANGELOG`, le `README` et `serve` du paquet quand la trace ne les lit pas. 156 laissés intacts : test en échec
  sous la trace (`state`, `close`, `cycle`, `kit-mise-a-jour`, `kit-hooks`, `worktree`…), mention générique d'un fichier de test
  dans le test, balayage d'un dossier de tests (`run-checks`, `check-kit-size`). **Mesure** (contrôles invalidés par un
  fichier touché, 314 contrôles) avant → après : `.githooks/engine.test.mjs` 195 → 140 ; `.githooks/state.test.mjs` 195 → 140 ;
  `packages/drwil/test/serve.test.mjs` 191 → 128 ; `packages/drwil/test/kit.test.mjs` 191 → 115 ;
  `packages/drwil/CHANGELOG.md` 184 → 108 ; `packages/drwil/templates/common/base/AGENTS.md` 202 → 199 ; moyenne par fichier
  suivi : `.githooks/` 195,6 → 180,5, `packages/drwil/` 197,6 → 188,2, dépôt 99,3 → 93,9. **Inchangés** : `.drwil/ia-first.json` 302,
  `.githooks/contract-tests.mjs` 294, `.githooks/state.mjs` et `.githooks/engine.mjs` 194, `packages/drwil/src/evidence.ts` 190 :
  les modules importés ne se voient pas dans la trace (le chargeur ESM ne passe pas par `fs`), leur resserrement demande une
  analyse des imports, hors de ce lot.
- **Lot 10 fait (2026-11-23)** : sous-clé `check` de `format` (un appel pour les fichiers indexés dont la copie égale
  l'index, repli par `stdin`), `QUA-334` (skill d'adoption, point `doctor` `parallel`, mise à jour sans `parallel`).
  **Mesure sur une copie de marinade-poulet** (passe sans reprise, 8 processeurs, référence en série 574,2 s) :
  `parallel: true` seul 442,3 s mais 2 échecs (les deux couvertures écrivent `coverage/`) ; `parallel: false` sur ces
  deux : 639,0 s et 1 échec (SRC-002, test de balayage, délai dépassé sous charge). **Gain non démontré** : le
  parallèle chez cet adoptant échoue ou ne gagne rien tant que ses tests sensibles au temps partagent la machine ;
  `parallel` reste au choix de l'adoptant, jamais posé par défaut.
- **Lot 9 fait (2026-11-23)** : page livrée des contrôles
  (`packages/drwil/templates/common/base/docs/ia-first/4-checks-in-git.md`, copie installée) : `readsChecks: true`,
  réglage `parallel` (`parallel: false` par contrôle, jamais activé par une mise à jour) et clé `format` ; `QUA-333`
  créé (test dans `packages/drwil/test/doctor-checks.test.mjs`, contrôle `tests-qua-333`). `packages/drwil/src/doctor.ts`
  passe la racine à `checksPoints` : le point `kit-paths` se tait quand `kitPathsOf` rend `["**"]` (`QUA-303`).
  Point `fingerprint` (« Reprise des verdicts ») : kit dont `FINGERPRINT_SCHEME` est antérieur ou absent, renvoi à
  `npx drwil init` (`QUA-026`, `tests-qua-026` lance aussi `packages/drwil/test/doctor-checks.test.mjs`) ;
  `staleFingerprints` vit dans `packages/drwil/src/doctor-checks.ts`, la mise à jour l'importe (une seule source).
  Pour le lot 10 : la page décrit déjà `parallel` (ne pas la redire) ; le point `doctor` « parallel absent » va dans
  `packages/drwil/src/doctor-checks.ts` à côté de `fingerprintPoints`, ses tests dans
  `packages/drwil/test/doctor-checks.test.mjs`. Remarque : un projet neuf contient `.env.example` écrit par le kit,
  que `kitPaths` ne range pas parmi les fichiers du kit (il délimite `*.example`).
- **Dernier état (2026-11-23, lot 7 fait)** : lots 1 à 7 faits ; reste le lot 8 [humain] (recette par une mise à
  jour réelle, attestation de `QUA-332`). Lot 7 : critères de la fiche reliés à `QUA-327` à `QUA-332` (textes
  inchangés) ; `QUA-332` créé (contrat `Manuel` de la recette par une mise à jour réelle, preuve humaine, champ
  `**Couvre**`) ; critère `drwil doctor` aligné sur le choix du demandeur du 2026-11-23 (`--fix` suit la règle de la
  mise à jour : paire de couverture réécrite même retouchée, autre contrôle retouché seulement signalé), déjà dit par
  `QUA-303`, dont la ligne « Modifié » cite ce choix ; carte du moteur (`docs/projects/kit-mechanics.md`, section 6, et
  sa source livrée, section 3, sans les outils propres au dépôt) et `docs/architecture.md` : `readsChecks` et
  `FINGERPRINT_SCHEME`, `kitPaths` partagé avec la CLI, points `doctor` et `--fix`, `repathConfig` et
  `rewriteKitPaths` ; lignes sous « Unreleased » du `CHANGELOG` (Added : clé `format`, recette réelle recommandée ;
  Changed : passe ciblée, empreinte par contrôle et première passe annoncée, chemins des contrôles générés).
  Avant VERIFY, la session principale soumet au demandeur, par un sondage `drwil-limite`, les limites hors cadre :
  `packages/drwil/src/doctor.ts` ne passe pas la racine à `checksPoints` (point `kit-paths`) ; la clé `format` et
  `readsChecks` absentes de la page des contrôles livrée
  (`packages/drwil/templates/common/base/docs/ia-first/4-checks-in-git.md`) ; les contrôles du projet joués en série
  chez l'adoptant ; un adoptant en 0.10.0 sans reprise ; les globs larges `.githooks/**` et `packages/drwil/**` du
  dépôt (audit par contrôle). Dans le cadre mais non traité (à trancher) : un formateur lancé par `npx` coûte environ
  0,2 s par fichier au commit (`.githooks/format-staged.mjs`, un appel groupé le réduirait).
- **Lot 6 fait (2026-11-23, commit `94157cb5`)** : une seule fonction calcule les chemins des contrôles générés,
  `kitPaths` de la barrière livrée (`packages/drwil/templates/common/base/.githooks/scope-gate-kit.mjs`, copie
  `.githooks/scope-gate-kit.mjs`), importée par la CLI : `<couche>/**` sous la racine ; à la racine, chaque dossier qui
  porte un fichier et chaque extension des fichiers de la racine, sans dossiers du kit (`.drwil`, `.githooks`,
  `docs`, dossiers des outils d'IA et de la forge), sans Markdown ni fichiers de git (`.gitignore`, `.gitattributes`,
  la CI GitLab, `.gitleaks.toml`) ; `["**"]` si rien ne se délimite. Création : `check()` de
  `packages/drwil/src/guarantees-layers.ts` et `e2eDeclaration` (paramètre `paths`, `["**"]` par défaut : la
  déclaration des kits précédents) ; l'e2e prend les chemins de la racine, même dans une couche. Mise à jour :
  `repathConfig` (`packages/drwil/src/guarantees-e2e-tools.ts`), appelé par `finishUpdate` après `git add -A`, donc
  calculé sur ce que contient le commit, comme la barrière ; la paire de couverture (tout `coverage-*`) réécrite même
  retouchée, l'`e2e` seulement s'il est identique à la déclaration du kit, sinon « Reste à décider ». La barrière
  (`configFromInit`) admet un contrôle `coverage-*` ou `e2e` dont seuls les `paths` passent de `["**"]` aux chemins
  recalculés sur l'arbre du commit (index au commit, `ls-tree` au rejeu). `doctor` : point `kit-paths` ; `--fix`
  applique la même règle que la mise à jour (`rewriteKitPaths`), et un contrôle confié à la CI sans `paths` reçoit les
  chemins calculés au lieu de `["**"]`. `packages/drwil/src/kit-update.ts` à 200 lignes (plafond atteint). Contrats mis à jour : `QUA-087`,
  `QUA-089`, `QUA-141`, `QUA-238`, `QUA-303` (règle, preuve, tests, ligne « Modifié ») ; `tests-qua-238` lance aussi
  `packages/drwil/test/mise-a-jour-empreinte.test.mjs`, `tests-qua-303` aussi `packages/drwil/test/doctor-checks.test.mjs`.
  Piège vu : `contract-tests` ne rattache un test qu'au contrat qui **commence** son nom (`QUA-141, QUA-238 : …` ne
  compte que pour `QUA-141`) ; d'où un test par contrat.
- **Recette rejouée (lot 6, 2026-11-23)** — `node outils/recette-adoptant.mjs --garder`, tarball `drwil-0.11.1.tgz` :
  **marinade-poulet** ✓ mise à jour commitée (barrière passée, hooks actifs) en 3,4 s, arbre propre ; compte rendu
  « Paths set by the kit on `coverage-root`, `coverage-diff-root` » ; chemins posés sur les deux :
  `*.example`, `*.html`, `*.js`, `*.json`, `*.toml`, `.env`, `e2e/**`, `json_tool/**`, `public/**`, `scripts/**`,
  `src/**` ; son `e2e` (écrit à la main, `runAt: ["ci"]`, sans `paths`) intouché. **drwil_walk** ✓ en 3,4 s ; rien à
  réécrire (`coverage-app`, `coverage-diff-app` et `e2e` déjà sur `app/**`). Dépôts d'origine intacts (aucune branche
  `workstream/kit-update`) ; copies supprimées. Constat hors chantier : la copie de travail d'origine de marinade-poulet
  est sur une branche `detour/fix-scope-kit-sync` avec des changements indexés, travail de son auteur, non touché
  (la recette clone la branche principale).
- **Ce que le lot 6 transmet au lot 7** : citer dans les critères `QUA-327` à `QUA-331` (contrats créés), sans changer
  leur texte ; carte du moteur et `docs/architecture.md` : `kitPaths` dans `.githooks/scope-gate-kit.mjs`, partagé
  avec la CLI ; ligne du `CHANGELOG` (sous « Unreleased ») : contrôles générés sur les chemins du code, réécrits par la
  mise à jour, signalés et réécrits par `doctor`. Ambiguïté à soumettre : `doctor --fix` réécrit la paire de
  couverture même retouchée (même règle que la mise à jour), alors que le critère dit « s'il est intact ». Limite hors
  cadre : `packages/drwil/src/doctor.ts` (hors scope) ne passe pas la racine à `checksPoints`, le point `kit-paths` ne peut donc pas taire
  un contrôle où rien ne se délimite.
- **Lot 5 fait (2026-11-23, D7 et D8)** : recommandation d'une recette réelle dès le lot 1 dans le modèle de fiche
  livré (`packages/drwil/templates/common/base/docs/projects/model-brief.md`, section des lots ; copie du dépôt
  `docs/projects/model-brief.md`, en français, écart déclaré) et dans le skill de lancement (gabarit et copie, puce « A brief
  that changes what users install or update ») ; textes livrés sans outil ni contrat propres au dépôt. Dans le dépôt :
  `outils/recette-adoptant.mjs` (tarball de la branche par `npm pack`, installé à part ; chaque adoptant cloné depuis sa
  branche principale dans un dossier temporaire, remote et autres branches retirés, hooks actifs, `npm ci`, puis
  `drwil init` de la CLI installée ; jugé : code 0, commit sur `workstream/kit-update` avec le trailer, arbre propre,
  pas de clé `format` ; `--garder` laisse les copies pour inspection) et `outils/verifier-recette-reelle.mjs` (ligne
  `[ia-first-warning]`, code 0 toujours). Contrats créés : `QUA-330` (recommandation livrée et rappel non bloquant,
  contrôles `recette-reelle` et `tests-qua-330`) et `QUA-331` (outil de recette, `tests-qua-331` ; l'outil lui-même
  n'est rejoué par aucun contrôle : il lit des dépôts hors du clone et le registre npm). Carte `docs/architecture.md`
  complétée (section `outils/`).
- **Recette rejouée (lot 5, 2026-11-23)** — `node outils/recette-adoptant.mjs --garder`, tarball `drwil-0.11.1.tgz`
  de la branche (lots 1 à 5) : **marinade-poulet** (kit 0.11.1, branche principale `main`) ✓ mise à jour commitée sur
  `workstream/kit-update` en 6,8 s, arbre propre, sans clé `format`, première passe complète annoncée (130 fichiers) ;
  **drwil_walk** (kit 0.10.0, `master`) ✓ même verdict en 5,2 s (136 fichiers). Dépôts d'origine vérifiés intacts
  après coup (branche, état de la copie de travail, aucune branche `workstream/kit-update`) ; copies supprimées.
  Le rappel signale cette fiche-ci (scope sur `packages/drwil/src/kit-update.ts`, lot 1 « Mesure de départ » sans
  recette réelle) : attendu, non bloquant ; le texte des lots n'a pas été retouché.
- **Ce que le lot 5 transmet au lot 6** : rejouer `node outils/recette-adoptant.mjs` après le lot 6 (il touche
  `packages/drwil/src/kit-update.ts`) : la réécriture des `paths: ["**"]` doit apparaître dans le compte rendu
  de `drwil init` et le commit rester propre. La recette s'arrête au commit de mise à jour : le second commit du lot 8
  (reprise des verdicts) reste humain ; chez `drwil_walk`, `npm ci` à la racine n'installe que drwil (les couches ont
  leurs propres dépendances), à installer à la main avant ce second commit. Le tarball porte la version du paquet
  (0.11.1) : le sujet du commit de mise à jour de marinade dit « 0.11.1 → 0.11.1 ». `QUA-330` et `QUA-331` sont à citer
  dans les critères au lot 7, avec `QUA-327`, `QUA-328` et `QUA-329`.
- **Lot 4 fait (2026-11-23, D4 à D6)** : `.githooks/format-staged.mjs` (gabarit `packages/drwil/templates/common/base/.githooks/format-staged.mjs`
  et copie), lancé par `.githooks/pre-commit` avant `run-checks`. Clé `format` de `.drwil/ia-first.json` :
  `{ "stdin": "<commande qui écrit {file} formaté depuis l'entrée standard>", "write": "<commande qui formate>",
  "paths": [motifs] }` ; sans clé, rien (une exécution de node, 91 ms) ; clé incomplète, formateur en échec ou sortie
  vide pour un contenu non vide (`npx --no-install` sans le paquet sort en code 0 sans rien écrire) : refus qui le dit.
  Chaque fichier indexé (ACMR) des `paths` est lu dans l'index (`git show :f`), jamais la copie de travail, et passé au
  formateur, en parallèle (un processus par fichier) ; refus avec `<write> "f…" && git add "f…"`, rien n'est réécrit.
  Contrats créés : `QUA-328` (refus d'un fichier non formaté) et `QUA-329` (sans clé, rien ; l'adoption la propose ;
  la mise à jour ne l'ajoute ni ne la retire), contrôles `tests-qua-328` et `tests-qua-329`, tests
  `.githooks/format-staged.test.mjs` et `packages/drwil/test/format-avant-commit.test.mjs`. Proposition par le skill
  `adopt-the-kit` (gabarit et copie). Module recensé dans le cadrage de la mécanique (`docs/projects/kit-mechanics.md` et sa source
  `packages/drwil/templates/common/base/docs/projects/kit-mechanics.md`, admise d'office comme source de gabarit,
  `QUA-311` cas 4 : sans elle, `check-docs` refusait le module chez tout projet installé) et dans la carte
  `docs/architecture.md`. Le skill livré ne cite aucun ID de contrat du dépôt (un projet installé ne les a pas).
- **Mesure du lot 4 (2026-11-23)** — temps ajouté au commit par `.githooks/format-staged.mjs` seul, projet temporaire, Biome
  sur des fichiers JavaScript formatés, médiane de 5, machine locale à 8 processeurs : sans clé `format` 91 ms ;
  binaire local (`node_modules/.bin/biome format --stdin-file-path={file}`) 219 ms pour 1 fichier, 455 ms pour 10,
  1 649 ms pour 50 ; par `npx --no-install biome …` 763 ms, 2 328 ms et 9 786 ms (le lancement de npx par fichier
  domine). À rapporter au journal de clôture (critère [humain], sans seuil, D6).
- **Ce que le lot 4 transmet au lot 5** : rien à reprendre dans le code du lot 4. Le dépôt drwil ne déclare pas de clé
  `format` (proposée à l'adoption, jamais posée d'office) : la poser ici reste une décision du demandeur. Les critères
  de la fiche portent encore « contrat à créer » : `QUA-328` et `QUA-329` sont à y citer au lot 7, avec `QUA-327`.
  Limites hors cadre à soumettre (fin de BUILD) : la clé `format` n'est pas décrite dans la page des réglages livrée
  `packages/drwil/templates/common/base/docs/ia-first/4-checks-in-git.md` (hors scope) ; un formateur lancé par
  `npx` coûte environ 0,2 s par fichier au commit (un appel groupé par lot de fichiers le réduirait).
- **État après le lot 5** (2026-11-23) : lots 1, 2, 3, 4 et 5 faits (lot 5 : voir plus haut). Lot 3 (D3) : l'empreinte d'un contrôle ne prend de
  `.drwil/ia-first.json` que ses réglages hors `checks` (`configView` de `.githooks/fingerprints.mjs`, gabarit et copie) ;
  un contrôle qui lit les déclarations des autres porte `readsChecks: true` et garde le fichier entier, comme
  `checks-self-test` (déclaration non objet) et une configuration illisible. Au commit, `stagedConfig` (même module,
  branché en deux lignes dans `.githooks/engine.mjs`, 191 lignes) reporte un contrôle quand le `.drwil/ia-first.json`
  indexé ne change, depuis HEAD, ni un réglage ni sa propre déclaration. Marqueur `FINGERPRINT_SCHEME = 2` : la mise à
  jour (`packages/drwil/src/kit-update.ts`, 197 lignes) compare celui du projet à celui du gabarit et écrit, avant
  « Reste à décider : relire… », « Première passe complète, puis reprise des verdicts… » (constante hors `KitTexts`,
  que `packages/drwil/src/kit-install.ts`, hors scope, partage). `QUA-141` mis à jour (règle, périmètre, preuve, tests) ;
  `tests-qua-141` lance aussi `packages/drwil/test/mise-a-jour-empreinte.test.mjs`. Dans le dépôt, `readsChecks: true`
  posé sur `tests-qua-001`, `tests-qua-047`, `tests-qua-185`, `tests-qua-194`, `tests-qua-208` (leurs tests lisent les
  contrôles déclarés du dépôt) et sur les quatre couvertures. Lot 2 : contrat `QUA-327` créé (passe ciblée pendant un lot,
  contrôle `tests-qua-327`, test dans `.githooks/run-checks.test.mjs` : un test ajouté à un fichier `kit-*.test.mjs` casse `QUA-315`, l'inventaire figé des tests du kit) ; règle « During a lot, a
  targeted pass » dans la section 8 livrée (`packages/drwil/templates/common/base/docs/ia-first/8-conduct-rules.md`),
  reprise en une ligne par `AGENTS.md` (gabarit et dépôt), le skill de lancement, le sous-agent `drwil-checks` et la
  recette des branches (gabarit et copie du dépôt, déclarée en miroir). Le gabarit de la recette des branches est à
  249 lignes sur 250 (plafond de `check-kit-size`) : n'y rien ajouter sans en retirer. Le critère de la fiche porte
  encore « contrat à créer » : `QUA-327` est à y citer au lot 7 (contrats et carte), sans changer son texte.
- **Mesure de départ (lot 1, 2026-11-22)** — machine locale à 8 processeurs (WSL2), copies des adoptants sur tmpfs ;
  durée murale de la commande, compteurs lus dans `.drwil/evidence/run-checks.log` (si présent) :
  - **Dépôt, passe avec reprise** (`run-checks`, arbre inchangé depuis la dernière passe) : 3,0 s ; 295 repris,
    14 rejoués, 5 confiés à la CI. **Passe sans reprise** (`--tout-rejouer`) : 315,7 s ; 309 joués, 0 repris ;
    1 254 s cumulées (passe parallèle). Plus lents : « tests des contrôles eux-mêmes » 238,6 s, tests de `QUA-013`
    97,3 s, de `QUA-021` 45,6 s, de `QUA-029` 41,8 s, de `QUA-035` 41,1 s ; puis une dizaine de 25 à 36 s.
  - **Dépôt, commit** : fiche seule, 0,85 s (contrôles du projet reportés « non exécutés », 314 avertissements) ; une
    ligne ajoutée à `.githooks/fingerprints.mjs` (hook lancé seul, puis retirée) : 476,3 s, 200 contrôles joués,
    115 reportés — plus lent qu'une passe complète (« tests des contrôles eux-mêmes » 417,3 s au commit contre 238,6 s).
  - **Dépôt, contrôles invalidés par un seul fichier touché** (comptés sur les `paths` des 306 contrôles déclarés) :
    `.drwil/ia-first.json` 295 ; `.githooks/contract-tests.mjs` 287 ; `.githooks/state.mjs` 194 ;
    `packages/drwil/templates/common/base/AGENTS.md` 197 ; `packages/drwil/src/evidence.ts` 186 ; `AGENTS.md` 7 ;
    `docs/contracts.md` 4. Tout module `engine*.mjs` ou `.githooks/fingerprints.mjs` entre dans l'empreinte de chaque contrôle :
    le toucher les invalide tous.
  - **Dépôt, chantier précédent** (`installation-dans-un-depot-existant`) : traces de `wait-command` du 21 au
    22 novembre, 5 passes complètes au moins (2 avec reprise : 294 et 295 repris ; 2 avec 196 et 197 rejoués), une
    dizaine de commits à contrôles reportés, 8 passes de couverture à part ; CI de la PR 10 min (verte) et 19 min (en
    échec), branche principale 13 min puis 3 min ; 480 min et 27,4 M jetons (`.drwil/usage.jsonl` (si présent)).
  - **marinade-poulet** (kit 0.11.1, 32 contrôles) : passe avec reprise 3,5 s (29 repris, 10 rejoués) ; sans reprise
    574,2 s, 41 joués, 573,3 s cumulées : **les contrôles du projet y tournent l'un après l'autre**. Plus lents :
    couverture différentielle 65,6 s, cliquet de couverture 61,9 s, `APP-001` 30,9 s, `APP-004` 29,1 s, `UI-018`
    27,7 s. Commit de doc 1,0 s (refusé en SCOPING, attendu) ; commit d'un fichier source du projet 207,5 s, 18 contrôles
    joués (refusé : cadrage SCOPING, et un test du service worker de marinade en échec au commit, vert dans la passe complète).
  - **drwil_walk** (kit 0.10.0, 19 contrôles, **sans reprise** : la version installée ne la connaît pas) : passe
    1 874 s, puis 1 397 s, 26 joués chaque fois, à la suite ; plus lents : e2e Playwright 1 258,6 s puis 710,7 s,
    couverture 173 à 193 s, couverture différentielle 185 à 189 s. Commit de doc 0,7 s ; commit d'un fichier source de l'application
    1 138,1 s, 25 contrôles joués. Échecs propres à la copie : branche principale (`master`), cadrage SCOPING,
    délais de tests dépassés (5 s) sous charge, e2e une fois sur deux.
- **Ce que la mesure transmet** : au lot 2, un commit de code coûte déjà autant qu'une passe (dépôt 476 s, walk
  1 138 s) : la passe ciblée ne doit pas en ajouter une. Au lot 3, la reprise prend sur un arbre inchangé (3 s) mais un
  seul fichier très cité invalide de 186 à 295 contrôles : refaire les comptes ci-dessus après l'empreinte par contrôle.
  Hors cadre, à soumettre à l'humain : les contrôles du projet joués en série chez l'adoptant (marinade 574 s pour
  573 s cumulées) ; un adoptant en 0.10.0 sans reprise du tout.
- **Travail non commité** : aucun.
- **Piège pour les lots 3 et 6** : `packages/drwil/test/kit-verify-reprise.test.mjs` et
  `packages/drwil/test/kit-mise-a-jour.test.mjs` sont des fichiers `kit-*.test.mjs` dont `QUA-315` (la découpe des tests du
  kit ne perd ni ne change aucun test) fige la liste des tests (`packages/drwil/test/decoupe-kit.inventaire.json`, hors
  scope) : y ajouter ou renommer un test fait échouer le commit. Modifier le corps d'un test existant reste permis.
- **Mesure du lot 3 (2026-11-23)** — contrôles dont l'empreinte propre change, sur 300 à 301 déclarés avec `paths`,
  ancien puis nouveau calcul (script de mesure hors dépôt, clone du dépôt, avant les `readsChecks` ci-dessus qui
  ajoutent 9 contrôles au second chiffre d'un contrat ajouté) : **contrat ajouté** (un contrôle de plus déclaré) 290 →
  1 ; **même lot, le lot 2** (`318e42b6`, sur son parent) 291 → 273 ; `.githooks/contract-tests.mjs` 285 → 285 ;
  `.githooks/state.mjs` 192 → 192 ; `packages/drwil/templates/common/base/AGENTS.md` 195 → 195 ;
  `packages/drwil/src/evidence.ts` 185 → 185 ; un fichier de test (`packages/drwil/test/serve.test.mjs`) 185 → 185 ;
  `AGENTS.md` 8 → 8 ; `docs/contracts.md` 3 → 3. Ce qui reste : les globs larges `.githooks/**` (192 contrôles) et
  `packages/drwil/**` (175) ; un test touché rejoue tous les contrôles qui les citent. Les resserrer demande d'exclure les
  fichiers de test des autres contrats, ce que les `paths` ne savent pas dire (pas de négation), et un audit par
  contrôle (des tests lisent d'autres tests : `.githooks/engine.test.mjs` les `kit-*.test.mjs`, `.githooks/state.test.mjs`
  lance `.githooks/scope-gate.test.mjs`) : non fait au lot 3 (`QUA-013`), signalé comme limite.
- **Ce que le lot 3 transmet au lot 4** : le commit du lot 3 a touché `.githooks/fingerprints.mjs` et
  `.githooks/engine.mjs` : tous les verdicts enregistrés sont à rejouer une fois. Le lot 4 touchera
  `.githooks/pre-commit` et créera `.githooks/format-staged.mjs` (à créer) : un module `.githooks/*.mjs` neuf entre dans
  `.githooks/**` (192 contrôles au commit) ; commiter par `node .githooks/wait-command.mjs git commit …` en appel de
  fond. La clé `readsChecks` n'est pas encore décrite dans la page des contrôles livrée
  (`packages/drwil/templates/common/base/docs/ia-first/4-checks-in-git.md`, hors scope) : limite à soumettre.
- **Ce que le lot 2 transmettait au lot 3** : pendant le lot, pas de passe complète ; le commit fait foi, et après un échec
  le contrôle en échec seul ou `npx drwil verify --failed` (`QUA-327`). Le commit du lot 2 ne touche aucun module
  `.githooks/*.mjs` ; le lot 3 touchera `.githooks/fingerprints.mjs`, qui invalide tous les contrôles au commit
  (mesure du lot 1 : 476 s) : prévoir un appel de fond par `node .githooks/wait-command.mjs git commit …`.
- **Prochaine étape** : sondage des limites hors cadre (session principale), passe complète et `drwil verify --agent`, puis [humain] lot 8 — Recette par une mise à jour réelle (`QUA-332`), et clôture.

# Projet : des chantiers plus rapides chez l'adoptant — contrôles ciblés pendant un lot, formatage avant commit, recette réelle dès le premier lot

**Statut** : cadré le 2026-11-22 ; points D1 à D9 ouverts.
**Risque** : HIGH
**Maturité** : à affiner
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
  - packages/drwil/templates/common/base/.githooks/run-checks.mjs
  - .githooks/run-checks.mjs
  - packages/drwil/templates/common/base/.githooks/run-checks-texts.mjs
  - .githooks/run-checks-texts.mjs
  - .githooks/run-checks.test.mjs
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
  - .drwil/ia-first.json
  - docs/contracts.md
  - docs/projects/kit-mechanics.md
  - docs/architecture.md
  - packages/drwil/CHANGELOG.md
-->

(Le bloc `scope` couvre les trois volets au plus large de leurs alternatives : le hook de commit et son module de
formatage, livrés (gabarit et copie du dépôt) ; la consigne de passe ciblée pendant un lot (consignes, skill de
lancement, sous-agent des contrôles, recette des branches) ; le modèle de fiche pour la recette réelle ; l'outil de
recette propre au dépôt (`outils/`), seulement si D8 le retient ; les `paths` des contrôles du dépôt dans
`.drwil/ia-first.json` (D3). Les points à trancher peuvent retirer des lignes, jamais en ajouter sans commit séparé.
`.githooks/run-checks.mjs` fait 200 lignes, le plafond : toute option neuve de `run-checks` passe par un module
découpé, à lister par commit séparé.)

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
  closing's ». La consigne existe ; elle n'est pas tenue par le sous-agent des contrôles (`drwil-checks`), qui lance
  toujours `run-checks` et `drwil verify --agent` en entier.
- **Dans le dépôt, la reprise ne prend presque jamais** : sur 305 contrôles déclarés, 293 citent `.drwil/ia-first.json`
  entier dans leurs `paths`, 280 `.githooks/contract-tests.mjs`, 191 `.githooks/**`, 174 `packages/drwil/**`. Un
  chantier qui ajoute un contrat (il touche `.drwil/ia-first.json`) ou un module de `.githooks/` invalide donc presque
  tous les verdicts, au commit comme hors hook.
- Aucun formateur n'est connu du kit : pas de réglage, pas de détection de stack (`packages/drwil/src/render-stack.ts`
  ne connaît que des commandes de test et de lint), le pre-commit ne fait que juger.
- Aucune consigne ni outil ne fait rejouer un vrai adoptant pendant un chantier ; la recette réelle se fait à la main,
  à la fin.

Le projet : qu'un chantier, chez l'adoptant comme ici, ne paie qu'une passe complète (celle de la clôture), ne soit
jamais relancé pour un formatage, et voie les défauts d'installation dès son premier lot — sans rien retirer à
l'exigence (QUA-019, QUA-013) ni ralentir ou casser l'adoptant.

## Critères d'acceptation

- Pendant un lot, la conduite livrée (consignes, skill de lancement, sous-agent des contrôles) ne joue que les contrôles
  touchés par le lot ; la passe complète reste exigée avant VERIFY et la clôture, et la CI reste complète — contrat à créer
- Une passe ciblée ne vaut jamais validation : elle n'écrit aucune preuve de clôture, elle dit « partielle » et le nombre
  de contrôles non joués ; la clôture la refuse comme preuve — contrat à créer
- Le formateur déclaré par le projet s'applique au commit aux seuls fichiers indexés ; un fichier non indexé, ou indexé
  en partie, n'est jamais modifié ; tout fichier reformaté est nommé dans la sortie — contrat à créer
- Sans formateur déclaré, le commit est inchangé ; un projet mis à jour ne reçoit aucun formateur actif sans le
  déclarer (aucune exigence nouvelle bloquante à la mise à jour) — contrat à créer
- Le temps ajouté au commit par le formatage est mesuré dans un test sur un projet temporaire et rapporté au journal de
  clôture ; aucun seuil bloquant — [humain] `QUA-013`
- Une fiche qui touche l'installation ou la mise à jour du kit prévoit une recette réelle dès son premier lot (forme
  selon D7 et D8) — contrat à créer
- Dans le dépôt, un chantier qui ajoute un contrat ne rejoue plus tous les contrôles à la passe suivante (selon D3),
  mesuré avant et après sur un lot réel — contrat à créer, ou `QUA-141` modifié

## Contrats modifiés

- `QUA-141` (reprise contrôle par contrôle) : seulement si D3 retient l'empreinte de la seule déclaration du contrôle à la
  place de `.drwil/ia-first.json` entier ; ancien critère : l'empreinte couvre « sa déclaration (commande, `needsBuild`)
  et le contenu des fichiers … qui correspondent à ses `paths` » — raison : un contrat ajouté invalide 293 verdicts sur
  305. À valider par le demandeur (non validé à ce jour).
- `QUA-171` (un sous-agent neuf par lot) : seulement si D1 change la consigne de vérification entre deux lots ; ancien
  texte inchangé sur le sous-agent lui-même. À valider par le demandeur (non validé à ce jour).

## 2. Hors périmètre

- Raccourcir la CI elle-même (tranches, cache, rejeu des hooks de la branche principale) : la CI reste complète ; ce
  chantier n'en retire aucun contrôle.
- Le journal du temps passé dans les contrôles : fiche `docs/projects/temps-des-controles-journalise.md` ; ce chantier
  s'en sert s'il est fusionné, sinon relève les durées à la main.
- Garder ou retirer les sous-agents de chantier : fiche `docs/projects/fin-des-sous-agents-de-chantier.md`.
- Détecter un formateur pour toutes les stacks (Python, Go…) : ce chantier livre le réglage et la proposition par
  l'adoption pour les formateurs que la détection connaît déjà ; l'élargissement suit
  `docs/intentions/detection-de-stack-elargie.md`.
- Publier ou automatiser une recette de version (module de release, QUA-051 à QUA-054) : intouché.
- Une notion de « chemin critique » pour lancer un contrôle lent au commit :
  `docs/intentions/controle-lent-chemin-critique.md`.

## 3. Contraintes

- **QUA-019** (pas de contournement) : « ciblé pendant le lot » ne remplace jamais la passe complète exigée avant VERIFY
  et la clôture, ni la CI ; aucun `--no-verify`, aucun contrôle désactivé.
- **QUA-013** (un contrôle non exécuté n'est pas passé) : une passe ciblée nomme et compte ce qu'elle n'a pas joué ;
  jamais un vert global.
- **QUA-018** : livrable d'abord (gabarit), copie du dépôt rafraîchie par `npm run installer-depot` dans le même commit ;
  ce qui reste propre au dépôt (outil de recette, `paths` du dépôt) se déclare comme tel.
- **Ne jamais ralentir ni casser l'adoptant** : le formatage ne touche que l'index, se mesure, et reste inactif sans
  déclaration ; une erreur du formateur (outil absent) ne casse pas le commit d'un projet qui ne l'a pas déclaré.
- **Mise à jour** : une nouvelle exigence ne bloque pas un projet existant (réglage `newRequirements` de
  `.drwil/ia-first.json`) ; le formatage et la recette réelle arrivent désactivés ou en avertissement.
- Plafond de 200 lignes : `.githooks/run-checks.mjs` est à 200, `.githooks/engine.mjs` à 189 ; toute logique neuve va dans
  un module découpé.
- Ordre : après la fusion de `installation-dans-un-depot-existant` (en cours, touche l'installation et la CI de
  l'adoptant) ; `preuves-fiables-rejeux-mesures` et `temps-des-controles-journalise` touchent
  `.githooks/run-checks-verdicts.mjs`, que ce chantier ne liste pas : à garder ainsi.
- Les autres outils (Copilot, Gemini, Codex, Cursor) lisent la même consigne dans `AGENTS.md` et la section 8 ; seul
  Claude Code a le sous-agent `drwil-checks`.

## 4. Décisions

Aucune tranchée à ce jour. La priorité (P0, en tête des fiches cadrées) est une demande explicite du demandeur le
2026-11-22.

## 5. Points à trancher

- [décision] **D1 — Forme du « ciblé pendant le lot »**.
  (a) Consigne seule : pendant un lot, le commit (déjà ciblé sur l'index) et `verify --failed` après un échec ; le
  sous-agent des contrôles n'est appelé qu'avant VERIFY et à la clôture.
  (b) Une option de `run-checks` (« passe de lot ») qui joue les contrôles dont les `paths` touchent les fichiers changés
  depuis la base de la branche, dit « partielle », n'écrit aucun verdict reprenable par la preuve de clôture.
  (c) Les deux.
  *Recommandation* : (a) d'abord, (b) seulement si la mesure du lot 1 montre qu'une passe entre deux commits reste
  nécessaire ; (a) ne touche aucun code de contrôle.
- [décision] **D2 — Périmètre des tests ciblés**.
  (a) Les contrôles dont les `paths` touchent les fichiers du lot (moteur existant).
  (b) (a) plus les tests cités par les contrats de la fiche (champ Tests).
  (c) Une liste choisie par l'agent.
  *Recommandation* : (b) ; jamais (c), c'est l'outil qui juge, pas l'agent.
- [décision] **D3 — Faire prendre la reprise dans le dépôt** (293 contrôles sur 305 citent `.drwil/ia-first.json`).
  (a) L'empreinte d'un contrôle couvre sa seule déclaration dans `.drwil/ia-first.json`, pas le fichier entier
  (`QUA-141` modifié, livré).
  (b) Resserrer les `paths` du dépôt seul (`.githooks/**` vers les modules réellement lus), contrôle par contrôle.
  (c) Laisser tel quel.
  *Recommandation* : (a), livré, car un adoptant qui ajoute un contrat paie le même coût ; (b) ensuite, au vu de la
  mesure, dans le dépôt seul.
- [décision] **D4 — Le formatage au commit réécrit ou refuse**.
  (a) Il réécrit les fichiers entièrement indexés, les ré-indexe et les nomme ; un fichier indexé en partie : refus sans
  rien écrire, avec la commande à lancer.
  (b) Il ne réécrit jamais : refus, avec la commande exacte.
  (c) Il avertit seulement, le lint juge ensuite.
  *Recommandation* : (a) : c'est la seule qui supprime la relance ; le refus sur index partiel tient la contrainte « jamais
  un fichier non indexé modifié ».
- [décision] **D5 — Déclarer le formateur**.
  (a) Une clé neuve `format` dans `.drwil/ia-first.json` (commande qui reçoit les fichiers, motifs de fichiers) ; absente,
  rien ne change ; l'adoption (skill `adopt-the-kit`) la propose quand la stack est reconnue.
  (b) Déduite de la stack, active par défaut.
  *Recommandation* : (a) : jamais active sans choix de l'adoptant, rien n'arrive par une mise à jour.
- [décision] **D6 — Budget de temps du formatage au commit**.
  (a) Mesuré et rapporté, sans seuil. (b) Un seuil (par exemple 2 s sur le dépôt) au-delà duquel le formatage s'arrête
  et avertit.
  *Recommandation* : (a) au premier lot, (b) seulement si la mesure le justifie.
- [décision] **D7 — Recette réelle : obligation ou recommandation**.
  (a) Recommandation : le modèle de fiche et le skill de lancement disent de prévoir une recette réelle au lot 1 d'un
  chantier qui touche ce que l'utilisateur installe.
  (b) Avertissement non bloquant au cadrage quand le bloc `scope` touche l'installation ou la mise à jour et que le lot 1
  ne cite pas de recette réelle.
  (c) Refus de lancement dans ce cas.
  *Recommandation* : (a) livré, plus (b) dans le dépôt seul ; jamais (c), qui bloquerait un adoptant sans adoptant de
  test.
- [décision] **D8 — Livrable ou dépôt pour la recette réelle**.
  (a) Dépôt seul : un outil `outils/` qui construit le tarball de la branche et l'installe sur des copies de
  marinade-poulet et `drwil_walk`, plus la consigne du dépôt.
  (b) Livrable : une consigne générale dans le modèle de fiche (rejouer un vrai consommateur dès le lot 1), sans outil.
  (c) Les deux.
  *Recommandation* : (c) : l'outil reste au dépôt (les adoptants de test sont ceux de drwil), la consigne générale
  sert tout adoptant.
- [décision] **D9 — Ordre de réalisation des trois volets**, en une fiche ou trois.
  (a) Une fiche, lots dans l'ordre mesure, passe ciblée, reprise, formatage, recette réelle.
  (b) Trois fiches, lancées l'une après l'autre.
  *Recommandation* : (a), avec la mesure en premier ; découper si le cadrage tranché dépasse cinq lots de code.

## 6. Increments

- **Lot 1 — Mesure de départ** [IA] : sur un lot réel du dépôt et sur une copie de marinade-poulet, relever le nombre de
  passes, leur durée, les contrôles repris et rejoués, les plus lents (`.drwil/evidence/run-checks.log` (si présent)),
  et le temps d'un commit ; consigné dans la section « Reprise ». Critère de sortie : chiffres écrits, commités.
- **Lot 2 — Passe ciblée pendant un lot** [IA] : selon D1 et D2 ; consignes (`AGENTS.md`, section 8, skill de lancement,
  sous-agent des contrôles, recette des branches), tests d'abord si une option de `run-checks` est retenue ; contrat de la
  passe partielle. Critère de sortie : tests verts, `npm run installer-depot` sans écart.
- **Lot 3 — Reprise effective** [IA] : selon D3 ; empreinte et `paths`, mesure avant et après sur le même lot. Critère de
  sortie : gain chiffré, tests de `QUA-141` verts.
- **Lot 4 — Formatage avant commit** [IA] : selon D4 à D6 ; tests d'abord (fichier indexé reformaté et ré-indexé, index
  partiel refusé, sans déclaration rien ne change, outil absent), module découpé, hook de commit, proposition par
  l'adoption, mesure du temps. Critère de sortie : tests verts, temps du commit relevé.
- **Lot 5 — Recette réelle dès le premier lot** [IA] : selon D7 et D8 ; modèle de fiche, skill de lancement, outil du
  dépôt s'il est retenu, rejoué sur marinade-poulet et `drwil_walk`. Critère de sortie : une recette rejouée par l'outil
  ou la consigne, résultat au journal.
- **Lot 6 — Contrats et carte** [IA] : contrats créés, `QUA-141` ou `QUA-171` mis à jour selon les décisions, carte du
  moteur, carte d'architecture, ligne du `CHANGELOG`. Critère de sortie : `run-checks` sans échec, `drwil verify --agent`
  en `GOVERNANCE: PASS`.

## 7. Reprise

- **Dernier état** (2026-11-22) : cadrage écrit, D1 à D9 ouverts ; rien de commencé.
- **Travail non commité** : aucun.
- **Prochaine étape** : [décision] trancher D1 à D9 avec le demandeur, puis passer la maturité à « prêt ».

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
-->

(Le bloc `scope` couvre les trois volets tels que tranchés : le hook de commit et son module de formatage, livrés
(gabarit et copie du dépôt) ; l'empreinte par contrôle (moteur, preuve du paquet et leurs tests, D3) et la ligne du compte rendu de mise à jour qui
annonce la première passe complète (`packages/drwil/src/kit-update.ts` et son test) ; la consigne de
passe ciblée pendant un lot (consignes, skill de lancement, sous-agent des contrôles, recette des branches, D1) ; le
modèle de fiche pour la recette réelle (D7, D8) ; l'outil de recette et l'avertissement propres au dépôt (`outils/`) ;
les `paths` des contrôles du dépôt dans `.drwil/ia-first.json`. `.githooks/engine.mjs` fait 189 lignes : toute logique
neuve va dans `.githooks/fingerprints.mjs` ou un module découpé, à lister par commit séparé.)

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
  complète reste exigée avant VERIFY et la clôture, et la CI reste complète — contrat à créer
- L'empreinte d'un contrôle couvre sa déclaration et la configuration qu'il lit, pas tout `.drwil/ia-first.json` : un
  contrat ajouté ne rejoue plus les autres contrôles ; la preuve de clôture garde l'empreinte de l'arbre entier — `QUA-141`
- Une mise à jour (`npx drwil init`) depuis une version antérieure au nouveau calcul de l'empreinte le signale en une
  ligne de son compte rendu, dans la langue du projet : « première passe complète, puis reprise des verdicts » ; une
  mise à jour depuis une version qui le connaît déjà ne l'écrit pas — `QUA-141`
- Avec un formateur déclaré, un commit dont un fichier indexé n'est pas formaté est refusé, sans qu'aucun fichier soit
  modifié, avec la commande exacte qui le formate et les fichiers en cause — contrat à créer
- Sans clé `format`, le commit est inchangé ; l'adoption la propose, une mise à jour ne l'active jamais — contrat à créer
- Le temps ajouté au commit par la vérification du formatage est mesuré sur un projet temporaire et rapporté au journal de
  clôture, sans seuil — [humain] `QUA-013`
- Le modèle de fiche livré recommande une recette réelle dès le premier lot d'un chantier qui touche ce que l'utilisateur
  installe ; dans le dépôt seul, un avertissement non bloquant le rappelle quand le bloc `scope` touche l'installation ou
  la mise à jour et que le lot 1 ne cite pas de recette réelle ; jamais de refus — contrat à créer
- Dans le dépôt, un outil construit le tarball de la branche et l'installe sur des copies de marinade-poulet et
  `drwil_walk` — contrat à créer
- Recette du chantier par une mise à jour réelle : des copies de marinade-poulet (GitLab) et `drwil_walk` (GitHub) mises
  à jour avec un tarball du chantier ; le commit de mise à jour passe sans nouveau blocage et sans clé `format` ajoutée,
  le compte rendu signale la première passe complète ; puis un second commit qui touche un fichier du projet reprend les
  verdicts des contrôles non concernés (« repris ») [humain] — contrat `Manuel` à créer

## Contrats modifiés

- `QUA-141` — ancien critère : l'empreinte d'un contrôle couvre « sa déclaration (commande, `needsBuild`) et le contenu
  des fichiers suivis ou non suivis, non ignorés, qui correspondent à ses `paths` », d'où `.drwil/ia-first.json` entier
  dans les `paths` de 293 contrôles sur 305 — raison : un contrat ajouté invalide presque tous les verdicts ; l'empreinte
  couvre désormais la déclaration du contrôle et la configuration qu'il lit, livré à tout projet ; la première mise à
  jour depuis une version antérieure le signale dans son compte rendu (« première passe complète, puis reprise des
  verdicts »), et la preuve du contrat ajoute le test de ce message (`packages/drwil/test/kit-mise-a-jour.test.mjs`)
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
- **Lot 6 — Contrats et carte** [IA] : contrats créés, carte du moteur, carte d'architecture, ligne du `CHANGELOG`.
  Critère de sortie : `run-checks` sans échec, `drwil verify --agent` en `GOVERNANCE: PASS`.
- **Lot 7 — Recette par une mise à jour réelle** [humain] : tarball du chantier installé en mise à jour sur des copies de
  marinade-poulet (GitLab) et `drwil_walk` (GitHub) ; commit de mise à jour sans nouveau blocage ni clé `format` ajoutée,
  compte rendu qui signale la première passe complète, puis second commit (fichier du projet touché) dont les contrôles
  non concernés sont « repris ». Critère de sortie : attestation du contrat `Manuel` de la recette.

## 7. Reprise

- **Dernier état** (2026-11-22) : lot 1 fait, mesures ci-dessous ; aucun code modifié.
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
- **Prochaine étape** : [IA] lot 2 — Passe ciblée pendant un lot.

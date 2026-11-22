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
(gabarit et copie du dépôt) ; l'empreinte par contrôle (moteur, preuve du paquet et leurs tests, D3) ; la consigne de
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

## Critères d'acceptation

- Pendant un lot, la conduite livrée (consignes, skill de lancement, sous-agent des contrôles) ne lance que le commit et,
  après un échec, les contrôles touchés et les tests cités par les contrats de la fiche, choisis par l'outil ; la passe
  complète reste exigée avant VERIFY et la clôture, et la CI reste complète — contrat à créer
- L'empreinte d'un contrôle couvre sa déclaration et la configuration qu'il lit, pas tout `.drwil/ia-first.json` : un
  contrat ajouté ne rejoue plus les autres contrôles ; la preuve de clôture garde l'empreinte de l'arbre entier — `QUA-141`
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

## Contrats modifiés

- `QUA-141` — ancien critère : l'empreinte d'un contrôle couvre « sa déclaration (commande, `needsBuild`) et le contenu
  des fichiers suivis ou non suivis, non ignorés, qui correspondent à ses `paths` », d'où `.drwil/ia-first.json` entier
  dans les `paths` de 293 contrôles sur 305 — raison : un contrat ajouté invalide presque tous les verdicts ; l'empreinte
  couvre désormais la déclaration du contrôle et la configuration qu'il lit, livré à tout projet (validé par le demandeur
  le 2026-11-22).

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
  `.drwil/ia-first.json`) ; la clé `format` n'est jamais ajoutée par une mise à jour.
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

- **Lot 1 — Mesure de départ** [IA] : sur un lot réel du dépôt et sur une copie de marinade-poulet, relever le nombre de
  passes, leur durée, les contrôles repris et rejoués, les plus lents (`.drwil/evidence/run-checks.log` (si présent)),
  et le temps d'un commit ; consigné dans la section « Reprise ». Critère de sortie : chiffres écrits, commités.
- **Lot 2 — Passe ciblée pendant un lot** [IA] : D1 et D2 ; consignes (`AGENTS.md`, section 8, skill de lancement,
  sous-agent des contrôles, recette des branches) ; contrat de la conduite pendant un lot. Critère de sortie : contrôle du
  contrat vert, `npm run installer-depot` sans écart.
- **Lot 3 — Empreinte par contrôle** [IA] : D3 ; tests d'abord (un contrat ajouté ne change pas l'empreinte des autres
  contrôles ; la configuration lue par un contrôle la change ; la preuve de clôture garde l'arbre entier) ; empreinte dans
  le moteur et la preuve du paquet ; `QUA-141` mis à jour ; puis `paths` du dépôt resserrés et mesure avant et après sur
  le même lot. Critère de sortie : tests de `QUA-141` verts, gain chiffré.
- **Lot 4 — Formatage vérifié avant commit** [IA] : D4 à D6 ; tests d'abord (fichier indexé non formaté : commit refusé,
  commande et fichiers nommés, aucun fichier modifié ; fichier formaté : commit accepté ; sans clé `format` : rien ne
  change ; formateur absent : refus qui le dit ; mise à jour : clé jamais ajoutée), module découpé, hook de commit,
  proposition par l'adoption, mesure du temps. Critère de sortie : tests verts, temps du commit relevé.
- **Lot 5 — Recette réelle dès le premier lot** [IA] : D7 et D8 ; modèle de fiche et skill de lancement (livrés) ;
  outil de recette et avertissement non bloquant (dépôt), rejoués sur marinade-poulet et `drwil_walk`. Critère de
  sortie : une recette rejouée par l'outil, résultat au journal.
- **Lot 6 — Contrats et carte** [IA] : contrats créés, carte du moteur, carte d'architecture, ligne du `CHANGELOG`.
  Critère de sortie : `run-checks` sans échec, `drwil verify --agent` en `GOVERNANCE: PASS`.

## 7. Reprise

- **Dernier état** (2026-11-22) : cadrage écrit, D1 à D9 tranchés ; rien de commencé.
- **Travail non commité** : aucun.
- **Prochaine étape** : [IA] lot 1, après la fusion de `installation-dans-un-depot-existant`.

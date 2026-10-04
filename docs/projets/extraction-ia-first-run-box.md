# Projet : extraire l'architecture IA-first complète de run-box-v2 dans le kit

**Statut** (2026-10-04) : cadrage proposé le 2026-10-03 — 7 décisions tranchées le 2026-10-03 ; **lots 1 à 8 terminés** (partie IA) ; **relecture humaine du lot 8 restant à faire par le demandeur** (voir section 6, dernière entrée).

## 1. Besoin

Le kit (`packages/kit-ia-first/`) doit être l'extraction **complète** de
l'architecture IA-first de run-box-v2, rendue générique et fonctionnelle pour
n'importe quel projet. Règle du demandeur (2026-10-03) : **ne rien perdre** ;
ce qui est trop propre à run-box n'est pas jeté, il est rendu générique
(paramètre, modèle, exemple, point d'extension) ou classé explicitement
« propre au projet » avec la raison.

Constat du 2026-10-03 : le kit n'a repris qu'une fraction de l'architecture.
Exemples mesurés : `packages/kit-ia-first/templates/fr/base/docs/ia-first.md` 8 lignes dans le kit contre 227 dans
run-box ; 2 contrats contre 31 ; 4 recettes de 3 à 10 lignes contre 11 ;
0 skill contre 7 ; `AGENTS.md` de couche d'une ligne contre 44 à 63 lignes ;
aucun des 11 fichiers de contrôle et de test de run-box n'est porté.

## 2. Existant

Relevé dans le code le 2026-10-03. Chemins run-box relatifs à la racine de
run-box-v2 (dépôt voisin, non cités entre accents graves car absents d'ici).

### 2.1 Ce qui fait l'architecture IA-first de run-box-v2

Selon son propre descriptif (docs/ia-first.md de run-box) :

1. Un point d'entrée unique et un contexte budgété (AGENTS.md, une fiche par
   couche, chargement progressif).
2. Une information, une seule source (skills = raccourcis vers les recettes,
   contrats cités par ID).
3. Des invariants outillés, et l'aveu de ce qui ne l'est pas (section
   « Hors registre », preuves humaines nommées).
4. Le contrôle est dans git (hooks), avec un filet propre à Claude Code en plus.
5. Ce que l'agent doit prouver (tester ce que voit l'utilisateur, compte
   rendu normatif, un contrôle qui échoue signale un contrat).
6. Des limites assumées.
7. Des chantiers exploitables à froid (intentions → index → fiches à lots,
   marqueurs `[IA]`/`[humain]`/`[décision]`, section Reprise, rappel de cadrage).

### 2.2 Inventaire pièce par pièce

Les ID de contrats sont ceux de run-box-v2, cités avec le préfixe
`run-box-v2:` pour ne pas être confondus avec le registre de drwil.

Nature : **G** générique tel quel (retirer les noms) ; **P** générique
paramétrable (config ou stack) ; **M** à fournir comme modèle ou exemple à
compléter ; **S** propre à run-box (classé, raison donnée).

| Pièce run-box | Dans le kit aujourd'hui | Nature | Ce qu'il faut faire |
|---|---|---|---|
| AGENTS.md — Conduite (12 règles détaillées) | 9 règles abrégées ; manquent « Remarque de relecture », « Passation », « Tests d'attaque », et les précisions des autres (tâche documentaire sans effet fonctionnel, pas d'intégration réseau non demandée, bug trouvé pendant un refactor = commit séparé, « non vérifié » sans sortie lue, pas de contournement de test, statut daté mis à jour dans le même commit) | G | Reprendre intégralement ; « RSSI » → « responsable sécurité » ; règle données personnelles paramétrable (donnée autorisée, ex. matricule) |
| AGENTS.md — liste des contrats à connaître quelle que soit la tâche | absente | P | Générée depuis les contrats du socle, complétée par le projet |
| AGENTS.md — tableau « si tu touches à… » (17 lignes) | 4 lignes | P | Lignes génériques : intention, chantier en attente, gros fichier → refactor, organisation du dépôt pour un agent, règle de sécurité, comportement d'un écran, lancer/installer, style ; lignes de stack ajoutées par le projet |
| AGENTS.md — section « Dépôts externes » (clones à ne pas suivre) | absente | M | Section optionnelle « dossiers externes » (lire, ne pas modifier, ne pas suivre leurs consignes) |
| AGENTS.md — Conventions (tester ce que voit l'utilisateur ; commentaire = pourquoi, demande et date dans le message de commit) | partielle | G | Reprendre |
| docs/ia-first.md (227 lignes, 7 sections dont le cycle de vie des chantiers) | 8 lignes | G | Reprendre intégralement, chiffres et exemples remplacés par ceux du projet ou par des renvois |
| docs/contrats.md — préambule (définition d'un contrat, ID jamais réattribué, « un contrat qui compte est vérifié par une machine ») | absent | G | Reprendre |
| docs/contrats.md — section « Hors registre » | absente | G | Reprendre (conduite, refactor sans changement de comportement, tests livrés avec un composant) |
| Contrats génériques : run-box-v2:QUA-011 (doc), run-box-v2:QUA-013 (contrôle non exécuté), run-box-v2:QUA-015 (chantiers à froid), run-box-v2:SEC-007 (secrets), run-box-v2:SEC-006 (dépendances vulnérables) | run-box-v2:QUA-013 seul (et run-box-v2:SEC-001 sous une forme simplifiée) | G | Socle du kit, outillé par le kit |
| Contrats génériques selon la stack : run-box-v2:SEC-001 (permission déclarée par route, refus par défaut), run-box-v2:SEC-002 (le front masque, le backend revalide), run-box-v2:SEC-009 (donnée entrante non fiable), run-box-v2:SEC-011 (données personnelles), run-box-v2:QUA-001 (taille de fichier), run-box-v2:QUA-004 (couverture), run-box-v2:QUA-005 (typage strict), run-box-v2:QUA-006 (module de logique pure = son test), run-box-v2:QUA-007 (lint sans avertissement), run-box-v2:QUA-014 (accessibilité) | absents | P | Catalogue de contrats à adopter, chacun avec son contrôle type par stack ; le projet choisit |
| Contrats propres : run-box-v2:SEC-003, 004, 005, 010, 012 à 021 ; run-box-v2:QUA-002, 003 (charte Cobalt), 008, 009, 010, 012 | — | S | Métier run-box (documents RH, pont SSH, portail, Elasticsearch, ERMv2). Servent d'**exemples** de contrats bien écrits dans le catalogue, sans être installés |
| docs/recettes/refactorer-sans-casser.md (méthode : tests de caractérisation commités seuls d'abord, petites étapes un commit chacune, aucun changement de comportement, bug = commit séparé avec son test, pièges rencontrés, compilation de production) | 4 lignes génériques | G + M | Reprendre la méthode intégralement ; les pièges React deviennent une section « pièges déjà rencontrés » à alimenter par le projet (exemple fourni) |
| Outillage du refactor : run-box-v2:QUA-001 et frontend/scripts/check-file-size.mjs (plafond de lignes, fichiers trop gros plafonnés à leur taille actuelle et qui ne peuvent que maigrir) ; ligne « un gros fichier existant » du tableau ; convention « tester ce que voit l'utilisateur » ; règle « bug trouvé pendant un refactor » ; modèle de découpage par couche | absent | P | Contrôle de taille générique en Node (extensions et plafond en config, liste des plafonds hérités), lié au contrat run-box-v2:QUA-001 du catalogue ; le reste via les pièces ci-dessus |
| Recettes génériques : ajouter-une-route-api, ajouter-un-ecran-front, deployer-en-prod, lancer-en-local, modifier-les-droits, gerer-les-acces, sauvegarder-et-restaurer | 3 présentes, squelettiques | M | Structure et étapes génériques reprises (droits, tests, contrats cités) ; détails de stack à compléter par le projet |
| Recettes propres : ajouter-une-commande-ssh, lancer-le-portail, deployer-backend-local | — | S | Pont SSH, portail, conteneur run-box. La première sert d'exemple de recette « opération sensible » |
| .claude/skills/ (7 raccourcis vers les recettes) | aucun (README seul) | P | Un skill par recette du kit, généré avec `--tools claude` |
| AGENTS.md de couche (Contexte, Pièges des tests, Contrats de la couche, Charte et recettes, Vérifier) | une ligne | M | Modèle à sections, rempli par le projet ou par l'IA à l'adoption |
| docs/projets/en-attente.md (cases à cocher, marqueur obligatoire, sections par thème, statut jamais recopié) | tableau vide | G | Reprendre le format (contrôlé par run-box-v2:QUA-015) |
| docs/intentions/README.md (définition, cycle de vie, forme contrôlée, table des fiches) | 3 lignes | G | Reprendre |
| Modèles de fiche : intention (Statut, Besoin, Existant, Questions à trancher) ; projet (Statut daté, Besoin, Hors périmètre, Contraintes, Décisions, Points à trancher, Lots avec critère de sortie, Reprise, bloc cadrage) | absents | M | Fournir les deux modèles (dans docs/ia-first.md ou une recette « ouvrir un chantier ») |
| .githooks/run-checks.sh (ordre des contrôles, blocs de tests en parallèle, journal affiché seulement en cas d'échec, compteurs de tests affichés même en succès, proxy d'entreprise, images Docker par empreinte) | run-checks.mjs séquentiel, sans compteurs | P | Parallélisme, journaux et compteurs en Node ; Docker et proxy en option documentée |
| .githooks/check-docs.py : chemins (détection par préfixes connus, ce qui évite les faux positifs), chemins relatifs à la couche, mention « (à créer) », ID défini une seule fois, run-box-v2:QUA-015 (marqueurs, Statut daté, sections des intentions, Reprise des projets), avertissements de cadrage | chemins et ID seulement, avec des faux positifs | G | Porter tout en Node |
| .githooks/cadrage.py + scripts/rappel-cadrage.py (fichier de code hors de toute fiche : rappel à l'agent et avertissement au commit, jamais bloquant) | retiré du kit le 2026-10-03 (copie vide) | P | Porter en Node ; périmètre du « code » lu dans les clés de config déjà prévues pour ça (`layerPrefixes`, `codePrefixes`, `extraCodeFiles`, `extraCodeGlobs`, `ciFiles`), qu'aucun contrôle ne lit aujourd'hui |
| scripts/garde-fou-bash.py (hook Claude Code : demander l'accord sur un fichier de secrets ou un pipe vers un shell) | retiré du kit le 2026-10-03 (copie vide) | G | Porter en Node, message sans nom de projet |
| .claude/settings.json (39 allow, 21 ask, 15 deny commentés, leviers d'exécution git et find neutralisés, deux hooks branchés) | 4 règles | P | Reprendre le modèle et son commentaire ; commandes de stack (npm, pytest…) selon la stack |
| .githooks/checks.json + check-control-coverage.py (contrôle « dégradable » ⇒ job CI qui se déclenche sur les mêmes chemins) | absent ; clé `checks` sans notion de dégradable ni de job CI | P | Fusionner dans la config du kit et vérifier le fichier de CI généré |
| .githooks/check-code-rules.py (règles d'hygiène machine) | absent | M + S | Point d'extension vide et documenté ; les règles de run-box (imports privés, CSV, isolation du portail) en exemples |
| .githooks/test_*.py (7 fichiers) + .coveragerc (couverture 100 % des contrôles, job CI) | tests du kit dans le paquet, non livrés aux projets | G | Livrer les tests des contrôles avec les contrôles |
| .githooks/pre-push | absent | G | Ajouter |
| .githooks/commit-msg (refus de « Co-Authored-By ») | absent | P | Option, désactivée par défaut (décision ci-dessous) |
| .gitlab-ci.yml (un job par sujet avec rules: changes : secrets, docs, checks-coverage, audit des dépendances, tests par couche) | un seul job | P | Jobs générés selon la stack et les contrôles déclarés, en GitHub et GitLab |
| frontend/scripts/check-colors.mjs, check-contrast.mjs (charte, contraste clair/sombre) | absents | P | Module optionnel « qualité front » (charte et palette en config) |
| README.md, INSTALL.md (dont « Utiliser un autre outil IA que Claude »), docs/architecture.md, docs/securite.md (modèle, preuves automatisées, tests d'attaque faits et à faire), docs/deploiement.md, docs/fonctionnalites.md, docs/charte-graphique.md | architecture.md seul | M | Squelettes à sections, cités par AGENTS.md |
| .env.example, .gitignore (run-box-v2:SEC-007) | absents | G | Générer (`.env` ignoré, `.env.example` versionné) |
| e2e/ (Playwright dans Docker, jeux de données factices) | absent | S | Infrastructure propre ; le principe (« neutraliser les dépendances réelles, tout en CI ») va dans la fiche modèle ou une recette optionnelle |
| scripts/sauvegarder.sh, restaurer.sh, deploy-*.sh, exercice-sauvegarde/ | absents | S | Propres à la production run-box ; la recette générique « sauvegarder et restaurer » renvoie à des scripts du projet |
| keycloak/, portal/, docker-compose*.yml, dossier-modernisation.html | — | S | Application, pas architecture IA-first |

**Vérification « rien perdu » (lot 8, 2026-10-04)** : tableau relu ligne par
ligne contre le contenu livré par les lots 1 à 7
(`packages/kit-ia-first/templates/`) et contre une copie de travail de
run-box-v2 (`/tmp/run-box-v2-copy`, jetable, original jamais modifié).
Résultat : chaque ligne **G** et **P** a son équivalent dans le kit (AGENTS.md
12 règles + tableau de routage + dépôts externes ; docs/ia-first.md 215
lignes ; docs/contrats.md avec préambule et « Hors registre » ; 8 recettes
génériques + 8 skills ; catalogue de contrats avec les 10 contrats
catalogués ; module qualité front optionnel ; contrôles Node ---
`.githooks/check-docs.mjs`, `.githooks/check-control-coverage.mjs`, `.githooks/check-file-size.mjs`,
`.githooks/check-code-rules.mjs`, `.githooks/cadrage.mjs` --- avec `pre-push`/`commit-msg`).
Chaque ligne **S** reste absente du kit, à raison (métier run-box : RH, pont
SSH, portail, Elasticsearch, ERMv2, e2e Playwright, scripts de sauvegarde
prod). Écart assumé déjà documenté lors du lot 4 : pas de `.coveragerc`
équivalent (mesure de couverture des contrôles eux-mêmes), jugé hors de
portée raisonnable — `.githooks/cadrage.test.mjs` reste le seul contrôle qui s'auto-teste
chez le projet. `apply()` testé sur la copie de run-box-v2 : stack détectée
correctement sur les 4 couches (`backend` → Python/FastAPI, `frontend` →
Node/React/Vite/TS, `e2e` → Node.js, `portal` → Python/FastAPI), aucun
fichier existant écrasé (`git status` : uniquement des ajouts). `.githooks/check-docs.mjs`
lancé sur cette copie signale, comme attendu, des centaines de fichiers de
code existants hors de tout bloc `cadrage` : c'est le rôle de la recette
`adopter-le-kit` (lot 6) de les répartir dans des fiches, pas quelque chose
que `apply()` doit faire seul — ce n'est donc pas un écart du kit.

## 3. Comment rendre l'ensemble générique et fonctionnel

1. **Socle de méthode** (toujours installé) : les textes de run-box repris mot
   pour mot, avec le spécifique retiré ou remplacé par une variable.
2. **Socle de contrats outillé par le kit** : run-box-v2:QUA-011, run-box-v2:QUA-013, run-box-v2:QUA-015,
   run-box-v2:SEC-007, run-box-v2:SEC-006 (ce dernier selon la stack). Un projet installé est vert
   le premier jour et ne prétend rien de plus.
3. **Catalogue de contrats à adopter**, avec leur contrôle type par stack ; les
   contrats métier de run-box y servent d'exemples, pas d'installation.
4. **Contrôles en Node, pilotés par la config** (périmètre du code, contrôles
   déclarés, dégradable et job CI, plafonds de taille).
5. **Adoption par l'IA** : une recette « adopter le kit » (et son skill)
   demande à l'agent de relever la stack, remplir les `AGENTS.md` de couche,
   déclarer les contrôles et proposer les contrats du catalogue, chaque choix
   restant une `[décision]` de l'utilisateur. C'est le prolongement de la
   détection de stack de `apply`.
6. **Critère « rien perdu »** : le tableau 2.2 devient une table de
   correspondance vérifiée — chaque fichier IA-first de run-box a un
   équivalent dans le kit ou une ligne S justifiée.

## 4. Lots proposés

Chaque lot : tests du kit verts (`npm test` dans le paquet), contrôles d'un
projet généré verts, doc du kit à jour dans le même commit.

- **Lot 1 — Méthode et docs** [IA] : AGENTS.md complet, `packages/kit-ia-first/templates/fr/base/docs/ia-first.md`
  complet, préambule et « Hors registre » des contrats, socle de contrats,
  format de l'index et des intentions, modèles de fiche, recettes génériques
  (dont refactorer-sans-casser complète), skills, squelettes de docs produit,
  `.gitignore` et `.env.example`. Sortie : chaque ligne G et M du tableau 2.2
  pour ces pièces est couverte.
- **Lot 2 — check-docs complet** [IA] : préfixes, couche, « (à créer) »,
  ID unique, run-box-v2:QUA-015, avec tests. Sortie : faux positifs du point 8 de
  `docs/projets/suites-kit-portable.md` supprimés.
- **Lot 3 — Cadrage et filet Claude Code** [IA] : cadrage, rappel à l'agent,
  garde-fou, modèle de permissions, avec tests.
- **Lot 4 — run-box-v2:QUA-013 complet et CI** [IA] : contrôles dégradables, couverture
  CI vérifiée, jobs CI par sujet, pre-push, commit-msg optionnel, tests et
  couverture des contrôles livrés aux projets.
- **Lot 5 — Outillage du refactor** [IA] : contrôle de taille avec plafonds
  hérités, point d'extension des règles d'hygiène, module optionnel qualité
  front.
- **Lot 6 — Adoption par l'IA** [IA] : recette et skill « adopter le kit »,
  catalogue de contrats.
- **Lot 7 — Anglais** [IA] : traduction de tout le contenu ajouté.
- **Lot 8 — Preuve « rien perdu »** [IA] puis [humain] : `apply` sur une copie
  de run-box-v2, comparaison avec l'original, table de correspondance à jour ;
  relecture par le demandeur.

## 5. Décisions

Tranchées par le demandeur le 2026-10-03 :

- Contrôles en **Node**.
- Le kit installe **seulement le socle de contrats** ; le reste va au catalogue.
- Rappel de cadrage **bloquant au commit** (choix différent de run-box, qui
  le voulait non bloquant pour ne pas lasser). Le rappel à l'agent après
  écriture reste informatif (le fichier est déjà écrit). docs/ et les fichiers .md
  n'en relèvent jamais. Les petites tâches se rattachent à une fiche
  permanente « entretien courant » ; les motifs trop larges restent refusés.
  **Révisé le 2026-10-04** (après l'épreuve de l'installation réelle, voir
  Reprise) : sévérité rendue réglable par projet (`.drwil/ia-first.json` ->
  `cadrage`), **par défaut `avertissement`** (jamais bloquant), `bloquant`
  pour retrouver le comportement initial, `off` pour tout désactiver. Ne
  touche que ce contrôle (`kit:QUA-016`) ; le reste de `.githooks/check-docs.mjs` (chemins,
  contrats, `kit:QUA-015`…) reste toujours bloquant.
- Anglais **traduit en fin de projet** (lot 7) : le moins cher, le contenu
  n'est traduit qu'une fois stabilisé.
- Module **qualité front** (couleurs dans le seul dossier du thème, contraste
  clair et sombre) **fourni en option**, désactivé par défaut, proposé par la
  recette d'adoption quand un front est détecté ; palette en config, charte
  Cobalt de run-box en exemple ; Tailwind d'abord.

Confirmées par le demandeur le 2026-10-03 :

- Registre des contrats en **tableau**, une ligne par contrat (plus court à
  charger pour un agent, ID unique facile à contrôler ; le détail long renvoie
  au fichier source de vérité).
- Hook commit-msg refusant « Co-Authored-By » **fourni mais désactivé par
  défaut** (règle propre à run-box ; des outils IA ajoutent cette ligne par
  défaut et des équipes la veulent pour tracer les contributions IA).

## 6. Reprise

- **Dernier état** (2026-10-04) : **lot 1 terminé**, tous les éléments écrits
  dans `packages/kit-ia-first/templates/fr/` : correctif `init` (ne réécrit
  que `.githooks/` par défaut, `--force` pour tout réécrire) ; `AGENTS.md`
  complet (12 règles de conduite, contrats à connaître, tableau « si tu
  touches à… » générique, dépôts externes en option, conventions) ;
  `packages/kit-ia-first/templates/fr/base/docs/ia-first.md` complet (7 sections, avec mention honnête de ce qui
  n'est pas encore outillé) ; `docs/contrats.md` en tableau (préambule,
  socle run-box-v2:QUA-011, run-box-v2:QUA-013, run-box-v2:QUA-015,
  run-box-v2:SEC-006, run-box-v2:SEC-007, « Hors registre ») avec
  `.githooks/check-docs.mjs` qui lit les ID en ligne de tableau ; index
  `docs/projets/en-attente.md` au format cases à cocher ;
  `docs/intentions/README.md` complet avec modèle de fiche ; modèle de fiche
  projet (`docs/projets/modele-fiche-projet.md`) ; fiche permanente
  `docs/projets/entretien-courant.md` ; recettes génériques (refactorer sans
  casser complète, route API, écran, droits, accès, lancer en local,
  déployer, sauvegarder) ; un skill Claude par recette (8 skills) ;
  `AGENTS.md` de couche à sections (générique, backend, frontend) ;
  squelettes README, INSTALL, sécurité, déploiement, fonctionnalités, charte
  graphique ; `.gitignore` et `.env.example`. Anglais toujours au lot 7 :
  `packages/kit-ia-first/templates/en/` reste en retard (ex. `packages/kit-ia-first/templates/en/base/docs/contracts.md`
  a encore l'ancien contenu placeholder SEC-001).
- **Non fait, hors périmètre du lot 1** : la recette « ouvrir un chantier »
  reste à faire ; le routage automatique des petites tâches vers
  `entretien-courant.md` n'est pas outillé (fiche créée, mais rien ne force
  son usage pour l'instant).
- **Lot 2 terminé** (2026-10-04) : `.githooks/check-docs.mjs` complet — chemins relatifs
  à la couche (déjà couvert par le repli racine/dossier du doc, conservé) ;
  préfixes connus resserrés (une citation sans extension et hors des
  préfixes racine/couche n'est plus prise pour un chemin — corrige le faux
  positif « minimal/complet », « init/apply » du point 8 de
  `docs/projets/suites-kit-portable.md`) ; marqueur « (à créer) » accepté
  après une citation ; ID de contrat défini plusieurs fois détecté ; `kit:QUA-015`
  (case ouverte sans marqueur `[IA]`/`[humain]`/`[décision]`, fiche de
  projet sans Statut daté ni section Reprise, intention sans ses sections
  obligatoires), avec exemption des modèles (`modele-*.md`) et de la fiche
  permanente `entretien-courant.md`. 4 tests ajoutés (`kit:QUA-015`, faux positif
  barre oblique, doublon d'ID — en plus du test existant sur un chemin
  inexistant et un ID absent).
- **Travail non commité** : tout le travail du 2026-10-04 sur le lot 3 (aucun
  commit demandé pour l'instant). Tests du kit : 16/16 verts au dernier
  passage (`npm test` dans `packages/kit-ia-first/`).
- **Lot 3 terminé** (2026-10-04) : cadrage et filet Claude Code, **bloquant au
  commit** (décision du demandeur, différente de run-box qui le voulait non
  bloquant). `.githooks/cadrage.mjs` : grammaire du bloc `cadrage` (porté en
  Node), périmètre du code lu depuis la config du projet (`layers`,
  `layerPrefixes`, `codePrefixes`, `extraCodeFiles`, `extraCodeGlobs`,
  `ciFiles` — jusque-là non lus par aucun contrôle). Nouveau contrat
  **`kit:QUA-016`** (`docs/contrats.md`) : un fichier de code indexé hors de toute
  fiche de `docs/projets/`, ou un bloc mal formé (sans « fichiers: », motif
  trop large), fait échouer `.githooks/check-docs.mjs`. Fiche
  `docs/projets/mecanique-ia-first.md` (et son équivalent anglais minimal
  `packages/kit-ia-first/templates/en/base/docs/projects/kit-mechanics.md`, pour ne pas casser le tout premier commit
  d'une installation anglaise) : couvre les fichiers propres au kit
  (`.githooks/*`, `.claude/settings.json` et le fichier de CI si installés).
  `docs/projets/entretien-courant.md` et `docs/projets/modele-fiche-projet.md`
  portent désormais un vrai bloc `cadrage` (exemple pour le modèle, vide à
  compléter pour la fiche permanente). Deux hooks Claude Code en Node, sous
  `.claude/hooks/` : `.claude/hooks/rappel-cadrage.mjs` (PostToolUse, informatif, jamais
  bloquant) et `.claude/hooks/garde-fou-bash.mjs` (PreToolUse, demande l'accord sur un
  fichier de secrets ou un pipe vers un shell dans une commande Bash, jamais
  de refus sec). `.claude/settings.json` réécrit sur le modèle de run-box
  (commentaire complet, allow/ask/deny, deny git qui bat toujours allow),
  générique (plus de commande propre à un projet), avec les deux hooks
  branchés et des commandes de stack ajoutées automatiquement selon la
  techno détectée (`npm test`, `pytest`…, table à compléter dans
  `packages/kit-ia-first/src/index.ts` → `STACK_ALLOW`). 3 tests ajoutés (cadrage bloquant puis
  débloqué par le bloc, motif trop large toujours refusé, les deux hooks
  Claude Code) ; régression trouvée et corrigée en cours de route (une
  installation anglaise avec git bloquait son premier commit faute de fiche
  de mécanique — `packages/kit-ia-first/templates/en/base/docs/projects/kit-mechanics.md` corrige ça, test dédié
  ajouté). 16/16 tests verts.
- **Demandeur (2026-10-04)** : « va jusqu'au bout sans moi » — autorise
  l'enchaînement des lots 4 à 8 sans confirmation intermédiaire ; commits
  réguliers par sujet, toujours sans push.
- **Lot 4 terminé** (2026-10-04) : run-box-v2:QUA-013 complet et CI.
  `.githooks/check-control-coverage.mjs` : port Node de
  check-control-coverage.py (run-box-v2) — un contrôle **dégradable** (ex. secrets sans
  gitleaks) doit avoir un job CI qui se déclenche réellement sur les mêmes
  chemins (relit `packages/kit-ia-first/templates/common/ci/gitlab/.gitlab-ci.yml` ou le workflow GitHub, pas seulement
  l'existence du job). Contrôles du socle déclarés en dur
  (secrets-fichiers, docs-references, controles-autotest) ; un contrôle du
  projet (`.drwil/ia-first.json` → `checks`) peut se couvrir lui aussi en
  ajoutant `chemins`/`ciJob`/`degradable`. Câblé dans `.githooks/run-checks.mjs`
  (non exécuté, pas en échec silencieux, si `ci: none`). Job CI renommé
  `checks` dans les deux fichiers de CI (au lieu de `ia-first` côté
  GitLab) pour une seule convention de nom. `.githooks/pre-push` ajouté
  (mêmes contrôles qu'au commit, rattrape un `--no-verify` ou un hook pas
  encore activé) ; `.githooks/commit-msg` ajouté (refuse « Co-Authored-By »),
  **livré désactivé par défaut** (non exécutable à l'installation —
  `chmod +x` pour l'activer), conformément à la décision du demandeur.
  `.githooks/cadrage.test.mjs` livré aux projets (pas seulement au paquet
  du kit) : premier contrôle du kit qui s'auto-teste chez le projet, repris
  automatiquement par le pas « tests des contrôles eux-mêmes ».
  **Simplification assumée** (à documenter, pas cachée) : contrairement à
  run-box-v2 (un job CI par sujet, avec Docker et des runners dédiés par
  stack), le kit garde **un seul job CI** (`checks`) qui lance
  `.githooks/run-checks.mjs` au complet ; GitHub Actions ne filtre pas un job par
  chemin nativement (seul `on: paths:` existe, au niveau du workflow), et le
  kit ne suppose aucun Docker. Le fractionnement par sujet reste une option
  future si une stack lente (ex. e2e) le justifie — pas reproduit pour ne
  pas imposer une complexité que rien ne demande aujourd'hui. Pas de mesure
  de couverture des contrôles eux-mêmes (`.coveragerc` équivalent) : jugé
  hors de portée raisonnable pour ce lot, à réévaluer si un vrai besoin se
  présente. 3 tests ajoutés (couverture verte par défaut GitHub + GitLab,
  détection d'un job qui ne se déclenche plus, `ci: none` signalé non
  exécuté). 19/19 tests verts. Note corrigée en passant : la section 4 de
  `packages/kit-ia-first/templates/fr/base/docs/ia-first.md` disait encore « filet IA non outillé » alors que le
  lot 3 avait déjà livré les hooks Claude Code — texte mis à jour.
- **Lot 5 terminé** (2026-10-04) : outillage du refactor, **opt-in** (rien
  lancé par défaut). `.githooks/check-file-size.mjs` : port générique de
  frontend/scripts/check-file-size.mjs (run-box-v2, racine, plafond de lignes et
  extensions en arguments ; plafonds hérités dans
  `.githooks/check-file-size.legacy.json`, à côté — ne peuvent que baisser
  au fil des refactors, jamais remonter). `.githooks/check-code-rules.mjs` :
  point d'extension vide (`regles = []`, toujours vert tant que le projet
  n'y ajoute rien) ; les règles métier de run-box-v2
  (check-code-rules.py (run-box-v2) : imports privés interdits, imports
  depuis un fichier de test interdits, module `lib/` sans test, export CSV
  hors point de passage sûr, isolation du portail) citées en commentaire
  comme exemples, pas installées — trop spécifiques à run-box pour un kit
  générique. Module qualité front optionnel sous
  `packages/kit-ia-first/templates/common/optional/front-quality/` (`packages/kit-ia-first/templates/common/optional/front-quality/check-colors.mjs` :
  couleurs en dur ou palette Tailwind hors charte ; `packages/kit-ia-first/templates/common/optional/front-quality/check-contrast.mjs` :
  contraste RGAA/WCAG AA clair/sombre à partir d'un module de palette du
  projet, port générique de frontend/scripts/check-colors.mjs (run-box-v2) et
  check-contrast.mjs (run-box-v2), charte Cobalt de run-box citée en exemple) — dossier
  **non copié par `scaffold()`** (seuls `common/base`, `<lang>/base`,
  `common/tools/<tool>`, `common/ci/<ci>` le sont), à activer manuellement
  en attendant la recette d'adoption du lot 6 (README dédié dans le
  dossier). Pas de nouveau contrat au registre : rangé en « Hors registre »
  de `docs/contrats.md` (pas de seuil universel, chaque projet choisit le
  sien) ; `catalogue:QUA-001` n'est pas inventé ici pour ne pas risquer un ID à
  renommer quand le catalogue de contrats du lot 6 sera posé. Recette
  `docs/recettes/refactorer-sans-casser.md` mise à jour (étape 2 : un
  fichier trop gros est un signal à découper, renvoie vers l'outillage).
  Fiches mécanique FR/EN : les 3 nouveaux fichiers `.githooks/`
  ajoutés au bloc `cadrage` (sinon `.githooks/check-docs.mjs` les aurait refusés dès
  le premier commit, comme pour tout fichier de code non couvert).
  **2 bugs préexistants (lot 4) trouvés et corrigés en cours de route**,
  tous deux dans `.githooks/cadrage.test.mjs` / `.githooks/run-checks.mjs`, signalés
  et corrigés (« laisser propre en passant ») : (1) l'assertion
  `fnmatch("backend/app/sous/x.py", "backend/app/x*")` attendait `true` à
  tort (le motif ne couvre que ce qui commence par sa partie littérale ;
  corrigée en `false`, avec un vrai cas de traversée de séparateur ajouté :
  `fnmatch("backend/app/x/sous.py", "backend/app/x*")`) ; (2) le pas « tests
  des contrôles eux-mêmes » de `.githooks/run-checks.mjs` relance `node --test` sur
  les `.githooks/*.test.mjs` du projet, mais `NODE_TEST_CONTEXT` (mis par
  Node quand on est déjà sous `node --test`) se propageait à ce sous-process
  et le faisait **sauter silencieusement** (avertissement « called
  recursively », code de sortie 0 sans qu'aucun test ne tourne) — masquait
  le bug (1) à chaque `npm test` du paquet du kit (qui tourne lui-même sous
  `node --test`), alors qu'un vrai commit humain (hors `node --test`)
  l'aurait détecté immédiatement. Corrigé en effaçant `NODE_TEST_CONTEXT`
  de l'environnement du sous-process. 5 tests ajoutés (fichiers livrés mais
  non lancés par défaut, détection d'un fichier trop gros une fois déclaré,
  plafond hérité qui ne peut pas remonter, règles vides toujours vertes,
  module qualité front non installé par `init`/`apply`). 24/24 tests
  verts ; contrôles racine drwil verts (`bash .githooks/run-checks.sh`).
- **Lot 6 — Adoption par l'IA** : terminé. `docs/catalogue-contrats.md`
  (nouveau, livré à tous les projets par défaut, sous `fr/base`) : 10
  contrats génériques fréquents mais pas installés par défaut (SEC-001,
  `catalogue:SEC-002`, `catalogue:SEC-009`, `catalogue:SEC-011`, `catalogue:QUA-001`,
  `catalogue:QUA-004`, `catalogue:QUA-005`, `catalogue:QUA-006`, `catalogue:QUA-007`,
  `catalogue:QUA-014` — même numérotation que run-box-v2 par cohérence avec
  l'inventaire du cadrage, sans collision avec le socle `kit:SEC-006`/`kit:SEC-007`,
  `kit:QUA-011`/`kit:QUA-013`/`kit:QUA-015`/`kit:QUA-016`), chacun avec règle, périmètre et contrôle type. IDs
  du catalogue préfixés `catalogue:` dans le tableau (réutilise le
  mécanisme d'échappement déjà existant dans `.githooks/check-docs.mjs` pour un ID
  d'un autre dépôt, ex. `run-box-v2:QUA-011` — sinon un identifiant non
  préfixé refuse le commit car il n'est pas encore dans le registre du
  projet) ; retiré à l'adoption quand la ligne migre vers `docs/contrats.md`
  sans ce préfixe.
  `docs/recettes/adopter-le-kit.md` (nouveau) : recette en 5 étapes (relire
  la stack détectée, remplir les `AGENTS.md` de couche à partir du code
  existant, déclarer les contrôles de la pile dans `checks`, proposer les
  contrats du catalogue un par un — chaque choix un `[décision]` du
  demandeur, jamais tranché à sa place —, vérifier et committer par sujet).
  Skill Claude Code `.claude/skills/adopter-le-kit/SKILL.md` (pointeur vers
  la recette, même convention que `refactorer-sans-casser` ; seul `claude`
  a un dossier `skills/` parmi les outils du kit, pas d'équivalent à livrer
  pour `copilot`/`cursor`). Routage ajouté dans `AGENTS.md` (« adopter le
  kit sur un projet existant »), paragraphe ajouté dans `packages/kit-ia-first/templates/fr/base/docs/ia-first.md`
  (section 3) et 2 phrases dans `docs/contrats.md` renvoyant au catalogue.
  2 tests ajoutés (catalogue + recette + skill livrés par défaut ; skill
  absent sans Claude Code). 26/26 tests verts ; contrôles racine drwil
  verts.
- **Lot 7 — Traduction anglaise** : terminé. Parité FR/EN atteinte (40
  fichiers de chaque côté). Découverte en relevant les écarts : `AGENTS.md`,
  `packages/kit-ia-first/templates/en/base/docs/ia-first.md` et `docs/contrats.md` anglais n'étaient que des stubs
  du tout premier commit (ex. `packages/kit-ia-first/templates/en/base/docs/ia-first.md` : 9 lignes contre 214 en
  français), jamais mis à jour au fil des lots 2 à 6 — réécrits en entier
  (sections Conduite complète, tableau de routage complet, registre des 6
  contrats du socle, cycle de vie des chantiers, rappel de cadrage). Ajouté
  aussi : squelettes de docs produit (`README.md`, `INSTALL.md`,
  `packages/kit-ia-first/templates/en/base/docs/security.md`, `packages/kit-ia-first/templates/en/base/docs/features.md`, `packages/kit-ia-first/templates/en/base/docs/style-guide.md`,
  `packages/kit-ia-first/templates/en/base/docs/deployment.md`, `packages/kit-ia-first/templates/en/base/docs/projects/routine-maintenance.md`,
  `packages/kit-ia-first/templates/en/base/docs/projects/model-project-sheet.md`), 5 recettes génériques manquantes
  (`manage-access`, `run-locally`, `modify-permissions`,
  `backup-and-restore`) et le catalogue de contrats + recette d'adoption du
  lot 6 (`packages/kit-ia-first/templates/en/base/docs/contracts-catalog.md`, `packages/kit-ia-first/templates/en/base/docs/recipes/adopt-the-kit.md`,
  préfixe `catalog:` repris du mécanisme français), 8 skills Claude Code
  manquants.
  **2 bugs pré-existants trouvés et corrigés en cours de route** (contenu
  français des lots 1/3/4, jamais exercés par un test avant le lot 7) : (1)
  l'exemption `kit:QUA-015` de la fiche permanente « entretien courant » (pas un
  chantier à lots) ne reconnaissait que le nom de fichier français en dur
  dans `.githooks/check-docs.mjs` ; ajouté `packages/kit-ia-first/templates/en/base/docs/projects/routine-maintenance.md` (nom anglais
  retenu) à la regex d'exemption. (2) `CLAUDE.md`/`GEMINI.md` et les
  fichiers `.claude/skills/`, `.claude/hooks/rappel-cadrage.mjs`,
  `.claude/hooks/garde-fou-bash.mjs` étaient cités sans le marqueur « si
  présent » dans `INSTALL.md`, `docs/contrats.md` et `packages/kit-ia-first/templates/en/base/docs/ia-first.md`
  alors qu'ils ne sont réellement présents que si Claude Code est
  sélectionné : une installation avec un seul autre outil faisait échouer
  `.githooks/check-docs.mjs` à raison. Marqué « si présent » sur ces citations
  (FR et EN). 2 tests ajoutés (installation anglaise complète avec
  contrôles verts, parité du nombre de fichiers livrés FR/EN). 28/28 tests
  verts ; contrôles racine drwil verts.
- **Demandeur (2026-10-04)** : « ok va jusqu'au bout sans moi » — confirme
  l'enchaînement du lot 8 sans confirmation intermédiaire.
- **Lot 8 — Preuve « rien perdu »** : partie [IA] terminée. Méthode : copie
  jetable de run-box-v2 dans `/tmp/run-box-v2-copy` (original jamais
  modifié — plusieurs fichiers de `data/vm-snapshots/` illisibles en
  copie, sans rapport avec l'architecture IA-first, ignorés), `apply()` du
  kit lancé dessus. Résultat détaillé dans la note ajoutée après le tableau
  2.2 : stack détectée sur les 4 couches, aucun fichier existant écrasé,
  chaque ligne G/P du tableau a son équivalent vérifié dans le kit (lots
  1 à 7), chaque ligne S reste bien exclue avec sa raison. Aucun écart
  trouvé qui nécessite un correctif de code — seul écart déjà documenté
  (lot 4) : pas de mesure de couverture des contrôles eux-mêmes, assumé.
  `npm test` : 28/28 verts (inchangé, lot 8 n'a modifié aucun code du
  kit, seulement la fiche de pilotage). Contrôles racine drwil verts.
  **Partie [humain] restante, non simulée par l'IA** : la relecture finale
  du demandeur sur la table de correspondance et la décision de clore le
  chantier `extraction-ia-first-run-box.md`.
- **Revue post-lot 8 (2026-10-04)** : demandeur a fait vérifier l'absence de
  fuite run-box/drwil et le fonctionnement réel du kit (voir aussi « Un vrai
  commit git... » plus haut). **1 bug trouvé et corrigé** : `.claude/settings.json`
  livré citait `docs/projets/extraction-ia-first-run-box.md` (fiche propre à
  drwil, absente de tout projet généré) comme explication de `STACK_ALLOW` ;
  remplacé par un renvoi au code source du kit. En testant un vrai commit
  bloqué par `kit:QUA-016`, le demandeur a demandé que ce blocage soit optionnel :
  **sévérité du rappel de cadrage rendue réglable** par
  `.drwil/ia-first.json` -> `cadrage` (`avertissement` par défaut, jamais
  bloquant ; `bloquant` pour le comportement initial ; `off` pour tout
  désactiver), préservée d'une réinstallation comme `checks`. Ne s'applique
  qu'à `kit:QUA-016` (fichier hors fiche, bloc mal formé) ; le reste de
  `.githooks/check-docs.mjs` reste toujours bloquant. `.claude/hooks/rappel-cadrage.mjs`
  suit le même réglage (silencieux si `off`). Mis à jour : `docs/contrats.md`,
  `docs/ia-first.md` (section 7), `AGENTS.md`, `docs/projets/entretien-courant.md`,
  `docs/projets/mecanique-ia-first.md` — FR et EN. 2 tests ajoutés (défaut
  jamais bloquant, `off` silencieux y compris le rappel à l'agent), test
  existant adapté (force `cadrage: "bloquant"` pour vérifier l'ancien
  comportement). 30/30 tests verts ; contrôles racine drwil verts.
- **Module optionnel « tableau de bord »** (2026-10-04) : le demandeur a
  demandé si un petit conteneur + interface web pour visualiser l'avancement
  était utile. Réponse retenue : non (toute l'info est déjà en markdown
  versionné, un conteneur ajoute une surface à maintenir et un risque de
  désynchronisation) ; à la place, un **générateur statique sans serveur**
  (`packages/kit-ia-first/templates/common/optional/tableau-de-bord/tableau-de-bord.mjs`, module
  optionnel non copié par `scaffold()`, sur le modèle de `front-quality/`) :
  produit un unique fichier HTML, lancé à la main
  (`node .githooks/tableau-de-bord.mjs`), jamais en CI ni au commit. Scope
  cadré avec le demandeur : lots + contrats seulement (pas de volet
  tests/contrôles). Respecte « une information, une seule source » : affiche
  la ligne « Statut » et les lots de chaque fiche de `docs/projets/` tels
  qu'écrits, sans recalculer un pourcentage ni un statut par lot (le format
  générique ne le code pas structurellement) ; liste les contrats du
  registre (`docs/contrats.md`) et du catalogue, non installés
  (`docs/catalogue-contrats.md`), en reconnaissant les deux formats de
  définition (titre `## ID — ...` ou tableau `| ID | ... |`, même détection
  que `.githooks/check-docs.mjs`). Bilingue (FR/EN selon `.drwil/ia-first.json ->
  lang`). Bugs trouvés et corrigés en testant sur le dépôt drwil lui-même :
  l'extraction du Statut doit tolérer une parenthèse (date) avant les deux-
  points, le titre de section Lots n'est pas toujours exactement « Lots »
  (ex. « Lots proposés »), et `docs/contrats.md` peut définir ses ID en
  titre (format réel de drwil) et pas seulement en tableau (format du
  template livré) — le parseur gère maintenant les deux. Recette
  `docs/recettes/visualiser-avancement.md` / `packages/kit-ia-first/templates/en/base/docs/recipes/view-progress.md`
  et skill Claude Code associé (`visualiser-avancement` / `view-progress`,
  simple renvoi à la recette). 1 test ajouté (31/31 tests verts) ; contrôles
  racine drwil verts.

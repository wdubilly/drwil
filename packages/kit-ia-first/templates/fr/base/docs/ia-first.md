# Architecture « IA first » — descriptif

État au {{date}}. Ce document explique **comment ce dépôt est construit pour
être modifié par des agents** : où sont les règles, qui les vérifie, et ce qui
n'est pas vérifié. Il ne décrit ni le produit ni le détail des invariants
(source unique : `docs/contrats.md`) ; le produit, si décrit, l'est dans
docs/fonctionnalites.md et docs/architecture.md (si présents). Comme le
reste du dépôt, il est à mettre à jour dans le même commit que ce qu'il
décrit.

« IA first » désigne une propriété du dépôt, pas une fonctionnalité du
produit : **la règle est écrite dans le dépôt et vérifiée par une machine,
pas confiée à l'assistant qui écrit le code.**

## 1. Un point d'entrée unique, et un contexte budgété

La configuration est volontairement minimale et lisible par n'importe quel
outil, pas seulement par un assistant donné :

- `AGENTS.md` porte la règle de conduite, les contrats à connaître, le
  tableau « si tu touches à… lis d'abord », et l'ordre de chargement du
  contexte.
- `CLAUDE.md` et `GEMINI.md`, si présents, ne contiennent qu'une ligne,
  `@AGENTS.md` (certains outils ne lisent pas `AGENTS.md` d'eux-mêmes) : il
  n'y a pas deux copies de la consigne à synchroniser.
- Un `AGENTS.md` par couche : le contexte d'une tâche est lu dans le dossier
  touché, pas dans le dépôt entier. Chaque couche a la même redirection
  d'une ligne que la racine.
- `docs/` est du markdown ordinaire, lisible sans aucune installation.

Le chargement du contexte est **progressif et borné** (`AGENTS.md`, section
« Charger le contexte progressivement ») : ce fichier, puis le `AGENTS.md` de
la couche, puis la recette ou le document du tableau, puis `docs/contrats.md`
pour le détail d'un ID, puis « rien d'autre sans raison ».

Conséquence : changer d'assistant ne change rien à ce qu'il lit, et le
contexte chargé pour une tâche reste proportionné à la tâche.

## 2. Une information, une seule source

La duplication étant la première cause de doc fausse, le dépôt s'interdit de
recopier :

- les **skills** (`.claude/skills/`, si présent) sont des raccourcis, pas
  des recettes : chacun ne contient que le déclencheur et un renvoi vers la
  recette de `docs/recettes/`, qui est elle-même le fond ;
- les `AGENTS.md` de couche ne recopient pas la règle d'un contrat, ils citent
  son ID et donnent le fichier où la lire ;
- `docs/contrats.md` est le registre unique des invariants, dans lequel
  chaque ID est défini une seule fois.

Ce découpage est contrôlé : QUA-011 (`.githooks/check-docs.mjs`) échoue si un
chemin cité entre accents graves n'existe pas, ou si un ID de contrat cité
n'est pas au registre.

## 3. Les invariants sont outillés, pas énoncés

`docs/contrats.md` liste les contrats du projet. Chacun a une règle
normative, un périmètre, une source de vérité (le code qui l'implémente),
une preuve et une raison.

La règle de conception est explicite dans ce registre : **« un contrat qui
compte est vérifié par une machine ; une preuve humaine est signalée comme
telle : c'est le prochain contrôle à outiller »**. Le dépôt distingue donc
trois choses qu'on présente trop souvent comme une seule :

| Ce que c'est | Exemple | Où c'est vérifié |
|---|---|---|
| Invariant outillé | QUA-011 (chemins et contrats cités) | `.githooks/check-docs.mjs` |
| Invariant outillé, preuve partielle | un contrat dont une partie seulement se prouve en machine | sa colonne « Preuve », limite nommée |
| Règle humaine assumée | une convention de revue | `docs/contrats.md`, section « Hors registre » |

C'est le point qui distingue une architecture IA first d'un simple dépôt bien
documenté : le dépôt **annonce** ce qu'il ne fait pas vérifier, au lieu de
laisser croire que tout est contrôlé.

Le socle de `docs/contrats.md` est volontairement minimal (vert dès le
premier jour, sans hypothèse de stack). `docs/catalogue-contrats.md` liste
des contrats génériques fréquents, pas installés par défaut : un projet les
adopte un par un, avec `docs/recettes/adopter-le-kit.md` (ou le skill
`adopter-le-kit`), chaque adoption restant une décision du demandeur.

## 4. Le contrôle est dans git, pas dans l'outil

C'est la décision structurante du dépôt. Les contrôles vivent dans
`.githooks/` (versionné), branchés par `core.hooksPath`, et non dans un
réglage d'assistant :

- `AGENTS.md` l'assume : le hook s'adresse à quiconque committe ou pousse
  (humain dans un terminal, assistant IA…) ;
- `.githooks/run-checks.mjs` porte l'argument en commentaire : un vrai hook
  git s'exécute quel que soit ce qui a lancé `git commit`, contrairement à un
  hook propre à un outil. Un assistant sans aucune configuration locale est
  donc soumis aux mêmes contrôles qu'un humain.

Ce que `.githooks/run-checks.mjs` enchaîne, dans l'ordre : secrets (gitleaks, si
installé), références de la doc (QUA-011), tests des contrôles eux-mêmes
(s'il y en a), couverture CI de chaque contrôle (QUA-013, s'il y a une CI),
puis les contrôles propres au projet déclarés dans `.drwil/ia-first.json`
(clé `checks`).

Un détail fait que ce contrôle est réellement exécuté plutôt que contourné :
**un contrôle qui ne tourne pas se voit** (QUA-013) — un contrôle qui ne peut
pas s'exécuter sur un poste (outil absent) finit « non exécuté », jamais
masqué en succès silencieux. Un contrôle **dégradable** (ex. secrets, sans
gitleaks) doit en plus avoir un job de CI qui se déclenche sur les mêmes
chemins : `.githooks/check-control-coverage.mjs` le vérifie en relisant le
fichier de CI, pas seulement en constatant que le job existe (un job qui
existe mais ne se déclenche jamais ne couvre rien). Le même hook rejoue au
push (`.githooks/pre-push`), pour rattraper un commit passé avec
`--no-verify`. Un hook `commit-msg` (refus de la ligne « Co-Authored-By ») est
livré mais désactivé par défaut (`chmod +x .githooks/commit-msg` pour
l'activer).

*(Filet propre à un outil IA, en plus et jamais à la place des hooks git :
voir la section « Rappel de cadrage » plus bas pour ce que le kit outille
déjà avec Claude Code.)*

## 5. Ce que l'agent doit prouver de son travail

- **Tester ce que voit l'utilisateur**, rôles, textes et boutons, pas le
  détail d'implémentation (`AGENTS.md`, conventions).
- **Le compte rendu de fin de tâche est normatif** (`AGENTS.md`, Conduite) :
  fichiers touchés, contrôles lancés et leurs résultats exacts, limites et
  ambiguïtés restantes. « Ne présenter comme prouvé que ce qu'un contrôle
  vérifie réellement ; le reste est dit « humain » ou « non vérifié ». »
- **Un contrôle qui échoue n'est pas une contrainte à contourner** : il
  signale un contrat, à lire avant toute accommodation.

## 6. Limites assumées

Ce que l'architecture ne fait pas, et qu'elle ne prétend pas faire :

- Les preuves humaines sont nommées dans `docs/contrats.md` (section « Hors
  registre ») et dans la colonne « Preuve » de chaque contrat.
- Rien n'évalue automatiquement la qualité d'un diff : la revue reste humaine
  ou déléguée à l'assistant, avec le compte rendu comme seule trace.
- Les chantiers non faits sont dans l'index des chantiers (`.drwil/ia-first.json`
  → `dirs.index`) : un « en attente » n'est pas un invariant, et ne doit pas
  être présenté comme vérifié.

## 7. Les chantiers, exploitables à froid

Un agent reprend un chantier sans l'historique de la conversation qui l'a
créé : tout ce qu'il lui faut doit être dans la fiche.

- **Un index court, des fiches** : l'index des chantiers a une ligne par
  sujet et renvoie à la fiche dès qu'il y a plus de deux lignes à dire. Un
  agent ne lit que la fiche du sujet qu'il traite.
- **Le statut vit dans la fiche**, ligne « Statut » en tête d'un projet ou
  d'une intention, jamais recopié dans l'index : une copie finit fausse.
- **L'existant se relève dans le code, daté**, et ce qui n'est pas vérifié
  est dit « non vérifié ».
- **Un projet découpe en lots courts**, chacun avec son critère de sortie
  écrit d'avance, ses contrats et ses décisions datées.
- **Chaque case ouverte dit qui peut agir** : `[IA]`, `[humain]` ou
  `[décision]`. Un agent ne tente pas un geste humain (serveur, coffre,
  accord) et ne tranche pas une décision : il la pose.
- **Laisser propre en passant** (`AGENTS.md`, Conduite) : ce qu'un agent lit
  et trouve faux pendant une tâche, il le corrige à part et le signale ; ce
  qu'il fait avancer, il le date dans la fiche.

### Cycle de vie d'un chantier

| Étape | Où | Qui la fait passer |
|---|---|---|
| idée exprimée | fiche d'intention : Besoin, Existant relevé, Questions à trancher | l'agent l'écrit ; le demandeur tranche les questions |
| cadrée, courte | une ligne `[IA]` ou `[humain]` dans l'index des chantiers | l'agent, une fois les questions tranchées |
| cadrée, longue | fiche de projet : statut daté, lots et critères de sortie, Reprise | l'agent ; le demandeur valide le cadrage |
| en cours | la même fiche, Reprise mise à jour à chaque fin de tâche | l'agent qui travaille (passation) |
| livrée | ligne retirée de l'index ; statut « livré le … » ; Reprise finale | l'agent, preuve à l'appui (QUA-013) |
| abandonnée | fiche ou ligne supprimée, raison dans le message de commit | le demandeur décide, l'agent l'applique |

Une `[décision]` n'avance que tranchée par le demandeur ; un geste `[humain]`
n'est jamais fait par l'agent, qui le pose.

**Passation (hand-off)** : la section « Reprise » de chaque fiche de projet
(dernier état daté, travail non commité, prochaine étape avec son marqueur)
tient lieu de fichier de passation : un autre agent, un autre outil ou une
personne reprend à froid à partir d'elle, sans mémoire propre à un outil.

Contrôlé par QUA-015 pour ce qu'une machine sait vérifier (marqueurs, ligne de
statut **datée**, sections des intentions, section « Reprise » des projets) :
une machine ne sait pas si un statut est vrai, mais un statut daté montre son
âge. La justesse du contenu reste humaine. Exceptions au contrôle : les
fichiers `docs/projets/modele-*.md` (modèles à copier, pas des fiches) et
`docs/projets/entretien-courant.md` (fiche permanente, pas un chantier à lots).

### Rappel de cadrage

Un fichier de code ne doit pas rester détaché de tout chantier. Une fiche de
`docs/projets/` porte, dans un commentaire HTML invisible au rendu, un bloc
`cadrage` (un chemin ou un motif par ligne sous `fichiers:`) : il couvre les
fichiers que ce chantier touche.

- **Sévérité réglable au commit** (`.githooks/check-docs.mjs`, réglage
  `cadrage` de `.drwil/ia-first.json`) : un fichier de code indexé par git
  qu'aucun bloc ne couvre, ou un bloc mal formé (sans ligne `fichiers:`,
  motif trop large comme `**` ou `scripts/*`), est signalé. `avertissement`
  (défaut) : jamais bloquant, juste affiché. `bloquant` : fait échouer le
  contrôle. `off` : désactive le contrôle (et son rappel à l'agent).
  `docs/` et tout fichier markdown ne sont jamais du code.
- **Rappel à l'agent, informatif** (Claude Code, hook PostToolUse
  `.claude/hooks/rappel-cadrage.mjs`, si présent) : après l'écriture d'un
  fichier de code hors fiche, un message lui est glissé ; rien n'est
  bloqué (le fichier est déjà écrit), le commit suit le réglage `cadrage`
  ci-dessus.
- **Petite tâche** : se rattache à `docs/projets/entretien-courant.md`, sans
  ouvrir de chantier séparé.
- **Fichiers propres au kit** : couverts par `docs/projets/mecanique-ia-first.md`,
  posée à l'installation.
- **Garde-fou des commandes shell** (Claude Code, hook PreToolUse
  `.claude/hooks/garde-fou-bash.mjs`, si présent) : demande l'accord sur un
  fichier de secrets ou un pipe vers un shell dans une commande Bash ; ne
  bloque rien,
  la personne décide.

La grammaire du bloc (`.githooks/cadrage.mjs`) est partagée par le contrôle et
le rappel : une seule source.

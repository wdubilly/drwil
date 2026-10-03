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
- `CLAUDE.md` et `GEMINI.md` ne contiennent qu'une ligne, `@AGENTS.md`
  (certains outils ne lisent pas `AGENTS.md` d'eux-mêmes) : il n'y a pas
  deux copies de la consigne à synchroniser.
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

- les **skills** (`.claude/skills/`, si installés) sont des raccourcis, pas
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
(s'il y en a), puis les contrôles propres au projet déclarés dans
`.drwil/ia-first.json` (clé `checks`).

Un détail fait que ce contrôle est réellement exécuté plutôt que contourné :
**un contrôle qui ne tourne pas se voit** (QUA-013) — un contrôle qui ne peut
pas s'exécuter sur un poste (outil absent) finit « non exécuté », jamais
masqué en succès silencieux.

*(Filet propre à un outil IA, en plus et jamais à la place des hooks git : non
encore outillé par ce kit — voir `docs/projets/` si un chantier le prévoit.)*

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

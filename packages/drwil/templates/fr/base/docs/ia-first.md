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

Pour garder le commit rapide, un contrôle du projet qui déclare `chemins`
(motifs, ex. `["src/**"]`) n'est lancé **au commit** que si un fichier
indexé correspond à l'un d'eux ; sinon il finit « non exécuté », jamais
masqué. Le push (`.githooks/pre-push`), la CI et un lancement manuel de
`.githooks/run-checks.mjs` le lancent toujours. Sans `chemins`, il tourne à
chaque commit. Lister aussi dans `chemins` les fichiers dont le contrôle
dépend hors de son dossier (manifeste et verrou de dépendances à la racine,
`.drwil/ia-first.json`…) : sinon un commit qui ne touche qu'eux ne le relance
qu'au push.

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

### `drwil verify` : la primitive de validation du travail

`drwil verify` n'est pas un simple audit : c'est ce qui permet de dire
qu'un travail est **vérifié**. La chaîne est intention (**Raison**) →
exigence explicite (**Règle**) → preuve (**Contrôle**, **Manuel**) →
verdict, pour chaque contrat de `docs/contrats.md` :

- **Contrôle** cite l'identifiant d'un contrôle connu du moteur
  (`.githooks/moteur.mjs`, le même que les hooks git ; ou `id` d'un
  contrôle de `.drwil/ia-first.json` → `checks`). La commande n'est jamais
  recopiée dans le contrat.
- **Manuel** décrit la partie de la preuve qui reste humaine.

Statut par contrat : `PASS` (tout est prouvé par un contrôle), `FAIL` (un
contrôle échoue, la cause est affichée), `MANUAL` (une partie humaine
reste, ou contrat historique sans contrôle — jamais compté comme PASS ; la
partie automatisée est affichée à part), `ERROR` (contrôle inconnu,
exigence ou preuve absente, outil indisponible). Tout contrat est bloquant.
Verdict global et code de sortie : `GOVERNANCE: PASS` → 0 ;
`GOVERNANCE: FAIL` ou `MANUAL REVIEW REQUIRED` → 1 ; `VERIFY ERROR` → 2.

Priorité déterministe, par contrat comme pour le verdict global : FAIL >
ERROR > MANUAL > PASS.
Seuls les contrats **bloquants** (sévérité par défaut) décident du verdict ;
un contrat `avertissement` ou `indicatif` est exécuté et affiché sans
changer le code de sortie. Un registre mal formé reste une `ERROR`, quelle
que soit la sévérité.

**Attestation humaine** (`drwil attest <ID>`) : un contrat `MANUAL` dont la
partie automatisée réussit peut recevoir une preuve humaine explicite. La
commande affiche le contrat, sa règle et sa preuve automatisée, exige un
terminal interactif et la saisie de l'identifiant (aucun `--yes` : un agent
ou un script ne peut pas attester), puis écrit l'attestation dans
.drwil/evidence/attestations, versionné pour être relu en revue.
L'attestation est liée par empreinte au texte du contrat et à la définition
de sa preuve : si l'un change, elle devient obsolète et le contrat redevient
`MANUAL`. Statut `ATTESTED` : distinct de `PASS`, il satisfait le contrat ;
jamais attestable : un contrat `PASS`, `FAIL`, `ERROR` ou non applicable.

### Workflow agent / humain

```text
Agent   : drwil verify            (ou /drwil verify ; sortie --agent)
DRWIL   : PASS / FAIL / ERROR / MANUAL
  FAIL   → l'agent corrige, puis relance drwil verify
  ERROR  → l'agent signale le problème, ne prétend jamais que c'est vérifié
  MANUAL → l'agent s'arrête : « Human attestation required. »
Humain  : drwil attest <id>       (dans son terminal, si MANUAL)
Puis    : drwil verify
Enfin   : GOVERNANCE: PASS        (seul ce verdict vaut validation)
```

L'agent produit et vérifie des preuves ; l'humain seul atteste. `drwil
attest` refuse tout environnement non interactif (agent, script, entrée
redirigée) et n'a pas d'option `--yes`. drwil ne prouve pas qu'un humain a
tapé la commande : il exige qu'une attestation soit explicite, traçable et
soumise à la revue du changement (dossier .drwil/evidence/attestations,
versionné).

`drwil verify --evidence` conserve la preuve d'une exécution
(dossier .drwil/evidence, créé à la première exécution, hors git) : verdict,
horodatage, commit, et pour chaque
contrôle un résumé de sa sortie, caviardé (clés, jetons, `password=…`) pour
ne jamais conserver de secret (SEC-007).

**`verify` est le gate de validation : un travail n'est vérifié par drwil
que si `verify` rend PASS.** `FAIL` : il doit être corrigé. `MANUAL` : il
n'est pas encore validé — jamais une réussite différée. `ERROR` : drwil ne
peut pas établir le verdict. `verify` est la primitive sur laquelle un
agent, un hook ou une CI pourront faire respecter ce gate ; il ne
l'impose pas lui-même. Les hooks git n'en dépendent pas : ils utilisent le
même moteur sans que drwil soit installé.

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

**Niveaux de risque** (la cérémonie suit le risque, la traçabilité ne change
jamais : QUA-016 s'applique à tout) :

- **LOW** : petite tâche sans fiche dédiée, rattachée à
  `docs/projets/entretien-courant.md`.
- **MEDIUM** : fiche de projet avec cadrage (`**Risque** : MEDIUM`).
- **HIGH** : fiche, section « Décisions », contrats concernés cités, preuves
  (`drwil verify`). Un cadrage qui touche la mécanique de gouvernance
  (`.githooks/`, CI, `.drwil/`) impose HIGH ; réglable par
  `.drwil/ia-first.json` → `risque.cheminsSensibles`.

Le niveau se déclare dans la fiche et ne peut que monter : un niveau plus
bas que le minimum détecté, ou un HIGH sans Décisions ni contrat, est refusé
au commit (`.githooks/check-docs.mjs`) ; une fiche sans champ « Risque »
dont le cadrage impose HIGH reçoit un avertissement.

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
  motif trop large comme `**` ou `scripts/*`), est signalé. `bloquant`
  (écrit par `drwil init`) : fait échouer le contrôle. `avertissement` :
  jamais bloquant, juste affiché (valeur retenue si le réglage est absent).
  `off` : désactive le contrôle (et son rappel à l'agent). `docs/` et tout
  fichier markdown ne sont jamais du code.
- **Côté agent** (Claude Code, hook
  `.claude/hooks/rappel-cadrage.mjs`, si présent), selon le même réglage : en `bloquant`, l'écriture d'un fichier
  de code hors fiche est refusée avant d'avoir lieu (hook PreToolUse) ; en
  `avertissement`, un rappel est glissé après l'écriture (hook PostToolUse),
  rien n'est bloqué ; en `off`, rien.
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

### État de gouvernance

L'activité courante (`CADRAGE`, `ATTENTE`, `DEMANDE`, `REALISATION`,
`PREUVES`, `VERIFY`, `CLOTURE`) et l'attente active vivent dans
`.drwil/state.json` (si présent) : un état **local**, ignoré par Git, qui ne contient que
des références (activité, chemin de la fiche active, demande active,
horodatage). Le périmètre autorisé reste le bloc `cadrage` de la fiche,
versionné.

- **Lecture déterministe** (`.githooks/etat.mjs`, seul lecteur) :
  `node .githooks/etat.mjs` affiche le contexte actif, `--json` l'état brut.
  Sans fichier, l'état est `CADRAGE` neutre ; un état invalide est signalé
  et traité comme neutre, jamais deviné.
- **Agnostique de l'agent** : la source (`state.json`, si présent) et la commande
  (`node .githooks/etat.mjs`) ne dépendent d'aucun outil. Le canal universel
  est `AGENTS.md`, qui demande à tout agent de lancer la commande en début de
  tâche. Un outil qui offre un hook de démarrage peut brancher la même
  commande pour réinjecter le contexte automatiquement — c'est le cas de
  Claude Code (hook SessionStart, si présent) ; ce n'est qu'un accélérateur.
- **Reprise par une autre personne** : l'état d'un clone ne voyage pas ; on
  reprend depuis la fiche versionnée (section « Reprise ») et on réactive
  l'attente explicitement.
- **Transitions** : une activité à la fois, retour à `REALISATION` après
  `PREUVES` ou `VERIFY` en échec, abandon vers `CADRAGE` depuis toute
  activité. Commande : `node .githooks/etat.mjs passer <ACTIVITE>
  [--fiche <fiche>] [--demande <texte>]` (ou `drwil etat passer …`, simple
  façade) ; `--fiche` ouvre une attente depuis `CADRAGE`.
- **Qui décide** (réglage `transitions` de `.drwil/ia-first.json`) : `humain`
  (défaut) — ouvrir une attente, lancer la réalisation (`DEMANDE →
  REALISATION`) et clore (`VERIFY → CLOTURE`) exigent un terminal interactif
  et la saisie de l'activité visée ; les autres transitions, qui resserrent
  les droits ou reviennent en arrière, restent libres. `agent` : toute
  transition permise est libre.
- **Clôture sur la preuve de `drwil verify`** : `VERIFY → CLOTURE` exige en
  plus, quel que soit le réglage `transitions`, la dernière évidence écrite
  par `drwil verify --evidence` (`.drwil/evidence/` (si présent), hors git) : verdict
  `PASS` ou `ATTESTED`, sur le commit `HEAD`, arbre non modifié. `.githooks/etat.mjs`
  lit cette preuve sans rien exécuter : verify reste le seul juge, sur tous
  les contrats bloquants. `FAIL` ou `ERROR` : revenir en `REALISATION` pour
  corriger. `MANUAL` : un humain atteste (`drwil attest <ID>`), puis on
  relance verify. Les critères de recette d'une fiche ne forment pas un
  système parallèle : un critère vérifiable devient un contrat avec
  `Contrôle`, un critère humain un contrat `MANUAL`.
- **Blocages côté outil** (Claude Code, règles `deny` de
  `.claude/settings.json`, si présent) : `git … --no-verify`, `git commit -n` et
  l'écriture directe de `.drwil/state.json` (si présent) sont refusés par
  l'outil, pas par le modèle.
- **Limites** : un agent qui a le shell peut toujours tricher en local
  (réécrire l'état, simuler un terminal, option courte combinée). Le but est
  une triche visible dans le diff et refusée en CI, pas impossible.

### Barrière de périmètre

Contrôle `perimetre-attente` du moteur (`.githooks/perimetre.mjs`), qui
tourne au commit, au push, en CI et dans `drwil verify`. Sévérité : réglage
`barriere` de `.drwil/ia-first.json` — `avertissement` (écrit par `drwil
init` : les écarts sont affichés, rien n'est bloqué), `bloquant`, `off`.

- **Les fiches passent toujours** : `docs/projets/` et `docs/intentions/`,
  ainsi que les attestations humaines, écrites par `drwil attest` :
  `.drwil/evidence/attestations/` (si présent) — liste réglable : `horsPerimetre`.
  Tout autre fichier, code ou doc, est soumis au périmètre.
- **Au commit** : hors fiches, un commit n'est accepté qu'en `REALISATION`,
  pour des fichiers couverts par le bloc `cadrage` de la fiche active **tel
  qu'il est dans `HEAD`**. Élargir son périmètre demande donc un commit
  séparé qui ne touche que la fiche ; le code vient au commit suivant.
- **Trailer** : le hook `prepare-commit-msg` ajoute `Drwil-Attente: <fiche
  active>` au message. Git ne saute jamais ce hook.
- **Au push, en CI et dans `drwil verify`** : chaque commit de la branche
  (depuis la branche principale, ou `DRWIL_BASE`) est rejoué contre le
  cadrage de la fiche de son trailer, lu dans son commit parent. Un commit
  hors fiches sans trailer est refusé. Un commit est jugé selon les règles
  de son parent : si la barrière n'y existait pas encore, il n'est pas
  contrôlé. L'activité n'existant qu'en local, la CI ne contrôle que le
  périmètre.
- **Retrait** : voir ci-dessous.

### Désactiver ou retirer la gouvernance

Aucune installation ne crée de verrou permanent : la gouvernance se coupe
par un réglage, puis se retire avec le reste de la mécanique.

- **Désactiver** (réversible, rien n'est supprimé) : `"barriere": "off"`
  dans `.drwil/ia-first.json`. Plus de barrière au commit, au push ni en CI,
  plus de trailer `Drwil-Attente`, et le contexte réinjecté à l'agent se
  réduit à « gouvernance désactivée ». Remettre `avertissement` ou
  `bloquant` la rétablit telle quelle.
- **Retirer** : `npx drwil uninstall` (simulation : liste ce qui serait
  supprimé), puis `npx drwil uninstall --yes`. Les fichiers de la mécanique
  restés intacts sont supprimés (hooks, `.githooks/etat.mjs`, règles de
  `.claude/settings.json` (si présent)) ; l'état local
  `.drwil/state.json` (si présent) est listé avec eux et supprimé seulement
  avec `--yes`. Les
  fiches, les contrats et les attestations versionnées restent : c'est
  l'historique du projet.
- **Limite** : la règle `deny` de Claude Code sur l'état local
  `.drwil/state.json` (si présent) refuse aussi toute commande shell qui cite ce chemin, même en
  lecture ; lire l'état passe par `node .githooks/etat.mjs`.

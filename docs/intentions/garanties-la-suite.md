# Intention : les garanties obligatoires, la suite

**Statut** : proposée le 2026-10-25 — regroupement de 6 intentions lors du ménage du 2026-10-25 ; chaque partie reprend l'une d'elles, avec son statut d'origine.

## Besoin

Le chantier « garanties obligatoires à l'adoption » (2026-10-22) a laissé ses suites en intentions séparées : imposer les garanties dès `init`, bloquer ce qui ne les tient pas, les rendre lisibles dans `verify --agent`, y soumettre le dépôt drwil lui-même. Elles décrivent une même mécanique et se cadrent ensemble.
Rangement du 2026-10-26 : ces parties touchent le même code que `docs/projects/niveau-de-protection.md` (`doctor`, garanties) ; à cadrer avec cette fiche ou juste après. La partie « tout code modifié arrive couvert à 100 % » a rejoint `docs/intentions/couverture-paquet-100.md`.

### `init` impose les garanties obligatoires lui-même (ex-« init-impose-les-garanties »)

Statut d'origine : proposée le 2026-10-22 — limite du chantier « garanties obligatoires à l'adoption ».

Le demandeur veut que les garanties obligatoires (couverture à 100 %, e2e des
chemins critiques, forge protégée, présentation du projet) soient imposées
« dès `init` » sur un projet neuf. Aujourd'hui, `init` ne les câble pas : il
renvoie vers `drwil guarantees`, lancé par `/drwil-adopt` une fois la pile
connue. Un projet installé sans passer par l'adoption n'a donc aucune
garantie câblée ni fiche bloquante.

**Intentions voisines** :

- Un projet existant refusait, avant l'adoption, même un commit de fiche ;
  même décision de fond sur l'état d'un projet entre `init` et
  `/drwil-adopt`. Tranché pour sa part et réalisé le 2026-10-23 : un projet
  existant est utilisable tel quel après `init`, qui rattache son code
  (journal du 2026-10-23, « `init` rattache le code existant, le premier commit passe »).

### bloquer les commits de code d'une couche dont la garantie n'est pas tenue (ex-« commits-bloques-par-une-garantie »)

Statut d'origine : proposée le 2026-10-22 — limite du chantier « garanties obligatoires à l'adoption ».

Le cadrage du chantier prévoyait, recommandation validée par le demandeur le
2026-10-22, le blocage du verdict **et** des commits de code de la couche
concernée tant que sa fiche de garantie existe (les commits de documents et de
la fiche restant libres). Seul le blocage du verdict (`drwil verify` en FAIL)
et de l'ordre des fiches (`/drwil-start` ne propose que la fiche bloquante) a
été livré : un commit de code de la couche passe.

### `drwil verify` signale un `--no-verify` (ex-« no-verify-detecte-par-verify »)

Statut d'origine : proposée le 2026-10-22 — limite du chantier « garanties obligatoires à l'adoption ».

Le critère du versionnement (QUA-095, bonnes pratiques de versionnement
imposées) demande que l'usage de `--no-verify` soit signalé par
`drwil verify` « quand il est détectable ». Le chantier ne le détecte pas
directement : c'est la CI, qui rejoue les contrôles du hook local, qui
rattrape un commit poussé sans hooks avant la fusion.

### une rubrique propre aux garanties dans la sortie `verify --agent` (ex-« garanties-dans-la-sortie-agent »)

Statut d'origine : proposée le 2026-10-22 — limite du chantier « garanties obligatoires à l'adoption ».

Une garantie non tenue (couverture, e2e, forge, présentation) fait échouer
`drwil verify`, mais la sortie pour l'agent (`--agent`) la range sous
« Registry errors », rubrique des erreurs du registre des contrats. L'agent
peut chercher la cause dans `docs/contracts.md` au lieu d'ouvrir la fiche
bloquante.

### soumettre le dépôt drwil à ses propres garanties (ex-« garanties-sur-le-depot-drwil »)

Statut d'origine : proposée le 2026-10-22 — limite du chantier « garanties obligatoires à l'adoption ».

Le chantier a livré les garanties obligatoires au gabarit (drwil-le-livrable,
QUA-018 : demander la casquette visée). Le dépôt drwil lui-même n'y est pas
soumis : `drwil guarantees` n'y a jamais été lancé. Conséquence immédiate :
son `docs/features.md` est encore le squelette du gabarit, et la commande de
release, qui refuse désormais un document resté en squelette (QUA-098 : la
release exige l'examen du README, des fonctionnalités et de la carte avant le
tag), refusera la prochaine release du dépôt tant qu'il n'est pas rédigé.

### un doctor juste sur le dépôt drwil lui-même (ex-« doctor-sur-le-depot-drwil »)

Statut d'origine : proposée le 2026-10-15 — retour d'expérience du chantier « fiabiliser le package npm » (journal du 2026-10-15).

Sur ce dépôt, `drwil doctor` avertit que le manifeste
`.drwil/installed-files.json` (si présent) et l'enregistrement de version
`.drwil/install.json` (si présent) manquent, et conseille de relancer
`npx drwil init`. Or ce dépôt ne s'installe pas par `init` mais depuis son
gabarit (`npm run installer-depot`) : le conseil ne s'applique pas, et deux
avertissements permanents finissent par ne plus être lus.

### Notes reprises de `docs/intentions/notes.md`

- 2026-10-23 — Désinstallation : après drwil guarantees --protect (contrôle checks requis, enforce_admins), uninstall retire le workflow de CI sans toucher la forge, donc toute PR vers la branche principale reste bloquée sur un contrôle qui ne vient plus. uninstall devrait au moins le signaler (et la doc Uninstalling du README le dire) ; piste : proposer la commande gh qui lève la protection, avec l'accord de l'humain.

## Existant

Relevé dans chaque intention d'origine, à sa date ; non revérifié le 2026-10-25.

### `init` impose les garanties obligatoires lui-même (ex-« init-impose-les-garanties »)

**Existant (relevé le 2026-10-22)** :

- `packages/drwil/src/index.ts` : à la fin d'`init`, si `.drwil/ia-first.json`
  n'a pas de réglage `guarantees`, une ligne renvoie vers
  `npx drwil guarantees` (texte `guarantees`, français et anglais).
- `packages/drwil/src/guarantees.ts` : la commande câble les contrôles et écrit
  les fiches bloquantes ; elle a besoin de la pile, qu'`init` ne connaît pas sur
  un dossier vide.
- `guaranteeFailures` (même fichier) ne juge rien tant que le réglage
  `guarantees.enforced` n'est pas posé : avant le premier
  `drwil guarantees`, `verify` ne signale aucune garantie manquante.

### bloquer les commits de code d'une couche dont la garantie n'est pas tenue (ex-« commits-bloques-par-une-garantie »)

**Existant (relevé le 2026-10-22)** :

- `packages/drwil/src/guarantees.ts` (`judgeGuarantees`) : la garantie non
  tenue fait échouer `verify`.
- `.githooks/briefs.mjs` : une fiche `[P0]` de garantie est la seule proposée
  au lancement.
- Le hook de pré-commit (`.githooks/pre-commit`, barrière de périmètre) ne lit
  pas les fiches de garantie.

### `drwil verify` signale un `--no-verify` (ex-« no-verify-detecte-par-verify »)

**Existant (relevé le 2026-10-22)** :

- `packages/drwil/src/guarantees-forge.ts` : une fiche bloquante est écrite
  quand la CI ne rejoue pas `node .githooks/run-checks.mjs` (« un
  `--no-verify` passerait »).
- Aucune trace n'est laissée par un commit fait avec les hooks (pas de trailer
  ni de marque locale), donc rien ne permet aujourd'hui de reconnaître un
  commit fait sans eux.

### une rubrique propre aux garanties dans la sortie `verify --agent` (ex-« garanties-dans-la-sortie-agent »)

**Existant (relevé le 2026-10-22)** :

- `packages/drwil/src/guarantees.ts` (`judgeGuarantees`) ajoute les garanties
  non tenues aux erreurs du verdict.
- `packages/drwil/src/agent.ts` affiche ces erreurs sous « Registry errors: ».

### soumettre le dépôt drwil à ses propres garanties (ex-« garanties-sur-le-depot-drwil »)

**Existant (relevé le 2026-10-22)** :

- `docs/features.md` du dépôt : texte du squelette.
- `.githooks/release-review.mjs` : bloque l'aperçu et la création du tag sur un
  document qui garde du texte de squelette.
- La couverture du paquet n'est pas à 100 % (intention
  `docs/intentions/couverture-paquet-100.md`).

### un doctor juste sur le dépôt drwil lui-même (ex-« doctor-sur-le-depot-drwil »)

Relevé le 2026-10-15 : `packages/drwil/src/doctor.ts` (points « manifeste »
et « version ») ne connaît que `init` ; `outils/installer-depot.mjs` installe
le dépôt dans une copie temporaire puis recopie les fichiers du gabarit,
sans manifeste ni enregistrement de version. L'avertissement du manifeste
existait avant le chantier ; celui de la version est nouveau.

## Questions à trancher

- [décision] Découper ce regroupement en lots, chacun vérifiable seul, et choisir le premier.

### `init` impose les garanties obligatoires lui-même (ex-« init-impose-les-garanties »)

- [décision] `init` doit-il lancer `drwil guarantees` lui-même quand la pile
  est détectée (projet existant), et écrire seulement les fiches bloquantes
  sur un dossier vide (pile inconnue) ?
- [décision] Ou bien `verify` doit-il échouer tant que `drwil guarantees` n'a
  jamais été lancé (réglage `guarantees` absent) ?

### bloquer les commits de code d'une couche dont la garantie n'est pas tenue (ex-« commits-bloques-par-une-garantie »)

- [décision] Le blocage au commit est-il toujours voulu, sachant que la CI
  (qui rejoue `verify`) refuse déjà la fusion ?
- [décision] Comment rattacher un fichier à sa couche (réglage `layers` de
  `.drwil/ia-first.json`) sans ralentir chaque commit ?

### `drwil verify` signale un `--no-verify` (ex-« no-verify-detecte-par-verify »)

- [décision] Faut-il une marque posée par le hook (trailer, note git) pour que
  `verify` repère un commit sans elle, ou la CI suffit-elle comme seule
  défense ?
- [décision] Si une marque est posée, est-elle exigée sur toute la branche ou
  seulement sur les commits de code ?

### une rubrique propre aux garanties dans la sortie `verify --agent` (ex-« garanties-dans-la-sortie-agent »)

- [décision] Une rubrique « Guarantees » à part, avec la fiche bloquante à
  ouvrir pour chacune, dans `--agent` et dans `--json` ?

### soumettre le dépôt drwil à ses propres garanties (ex-« garanties-sur-le-depot-drwil »)

- [décision] Rédiger `docs/features.md` du dépôt avant la prochaine release
  (geste court, nécessaire de toute façon) ?
- [décision] Lancer `drwil guarantees` sur le dépôt, et accepter les fiches
  bloquantes qu'il écrira (couverture du paquet, e2e, forge) ?

### un doctor juste sur le dépôt drwil lui-même (ex-« doctor-sur-le-depot-drwil »)

- [décision] `installer-depot` doit-il écrire le manifeste et
  l'enregistrement de version, comme `init` ?
- [décision] Ou `doctor` doit-il reconnaître le dépôt drwil (réglage dans
  `.drwil/ia-first.json`) et adapter son conseil ?

# Intention : l'adoption et `init` sur un projet réel : code existant, couches, démarrage

**Statut** : proposée le 2026-10-26 — rangement du backlog : découpage de `petits-defauts` par thème (décision du demandeur du 2026-10-26) ; chaque partie reprend l'une des intentions d'origine, avec son statut d'origine.

## Besoin

Ce que rencontre un projet qui adopte drwil : son code existant, un dossier de code apparu après l'installation, un dépôt git déjà là, les noms montrés dans sa langue. Regroupés le 2026-10-26 parce qu'ils touchent le même parcours (`init`, `/drwil-adopt`, le guide de démarrage).

### « pas encore de code » dit à un projet qui en a (ex-« message-sans-couche-code-existant »)

Statut d'origine : proposée le 2026-10-23 — écart relevé pendant le chantier « `init` rattache le code existant, le premier commit passe » (journal du 2026-10-23).

Sur un projet qui a du code mais aucune pile détectée (pas de manifeste
reconnu), `init` affiche « Aucune couche écrite : le projet n'a pas encore
de code », juste avant de dire qu'il a rattaché ce code (QUA-110) : les
deux messages se contredisent.

### l'aperçu d'`init` annonce le rattachement du code existant (ex-« apercu-init-code-existant »)

Statut d'origine : proposée le 2026-10-23 — limite du chantier « `init` rattache le code existant, le premier commit passe » (journal du 2026-10-23).

`drwil init --dry-run` dit ce qu'`init` écrirait, sans pouvoir s'en écarter
(même parcours du gabarit). Sur un projet qui a déjà du code indexé, `init`
écrit désormais en plus la fiche de référence « code existant » et une
section de la carte qui cite ses dossiers (QUA-110, `init` rattache le code
indexé avant le kit) : l'aperçu ne les annonce pas.

### le code existant qu'`init` ne peut pas rattacher seul (ex-« code-existant-non-rattache »)

Statut d'origine : proposée le 2026-10-23 — limite du chantier « `init` rattache le code existant, le premier commit passe » (journal du 2026-10-23).

`init` rattache le code indexé avant le kit (QUA-110) sans jamais réécrire
un fichier du projet. Deux cas restent donc refusés au premier commit,
avec réglages bloquants, tant qu'un humain ou l'agent n'y a pas touché :

- une carte `docs/architecture.md` présente avant l'installation : gardée
  telle quelle, `init` dit seulement les dossiers à y citer (QUA-040, carte
  entretenue) ;
- un fichier dont le chemin ne peut pas s'écrire dans un bloc `scope` sans
  motif trop large (un blanc ou un caractère `*`, `?`, `[` avant le
  deuxième dossier) : signalé, jamais écrit dans la fiche.

### un dossier de preuves nommé dans la langue du projet (ex-« nom-du-dossier-des-preuves »)

Statut d'origine : proposée le 2026-10-21 — limite du chantier « des critères et des preuves qui survivent à la clôture ».

La clôture écrit sa preuve dans `docs/preuves/<chantier>.md`, un nom français
imposé à tous les projets, y compris ceux dont la documentation est en anglais
(`docLang: "en"`) : un projet anglophone se retrouve avec un dossier `preuves`
au milieu de `docs/recipes/` et `docs/projects/`. Résultat attendu : le dossier
des preuves porte le nom de la langue du projet (un dossier `proofs` sous
`docs/` en anglais),
sans casser les dépôts qui ont déjà des preuves écrites.

### une seule forme pour les ID du catalogue (ex-« prefixe-catalogue »)

Statut d'origine : proposée le 2026-10-15 — retour d'expérience du chantier « capitaliser les non-régressions » (journal du 2026-10-15).

Le catalogue de contrats écrit ses ID `catalogue:XXX-NNN` dans ce dépôt et
`catalog:XXX-NNN` dans le gabarit livré : tout outil qui lit le catalogue
(par exemple le contrôle de cohérence des ID entre registre et catalogue,
cadré le 2026-10-15 sur sa propre branche) doit connaître les deux formes.

### proposer la couche d'un dossier de code apparu après l'installation (ex-« couche-d-un-nouveau-dossier-de-code »)

Statut d'origine : proposée le 2026-10-19 — question de l'humain sur le déploiement de la doc de couche.

Quand une techno est choisie et qu'un dossier de code apparaît (par exemple
`backend/`) après l'installation, sa couche (`AGENTS.md` de couche et consignes
par outil) doit être proposée, au lieu de rester absente sans que personne le
voie.

### un guide de démarrage — prérequis, recommandations, options (ex-« guide-de-demarrage »)

Statut d'origine : proposée le 2026-10-17 — retour d'expérience de `drwil_com`
(rapport « docs/experiments/acceptance-criteria-report.md » de ce dépôt,
section 6 de la demande), à faire après les évolutions du kit.
**Revu le 2026-10-17** : réalisé en partie par le chantier « un guide de
démarrage » (journal du 2026-10-17) — section « Before you start » du
README (prérequis, redémarrage de session, protection de branche,
auto-merge) et skill qui dit un auto-merge refusé ; les trois questions
ci-dessous sont tranchées. Reste vivant : la procédure pour un **dépôt
git existant** avant `init` (ce que `init` attend, crée ou modifie,
comment préserver l'historique), une pour un dépôt existant et une pour un
projet neuf.

Documenter ce qui fluidifie le démarrage avec un agent, en distinguant
clairement trois niveaux : **prérequis techniques** (sans eux, le kit ne
marche pas), **recommandations** (ils fluidifient et sécurisent) et
**options** (facultatives). Quatre sujets :

1. **Dépôt git existant** : ce que `init` attend d'un dépôt existant, ce
   qu'il crée ou modifie, comment préserver l'historique et les
   changements en cours ; une procédure pour un projet neuf, une pour un
   dépôt existant.
2. **Autorisation de l'auto-merge** (option) : à activer dans les réglages
   du dépôt GitHub pour s'en servir ; sinon, drwil le dit et ne laisse pas
   croire que la fusion est programmée. Distinguer : PR fusionnable,
   auto-merge autorisé par le dépôt, auto-merge programmé, fusion faite.
3. **Protection de la branche principale** (recommandation) : exiger les
   contrôles de CI ; exemple de configuration GitHub, permissions
   nécessaires, limites.
4. **Redémarrer la session de l'agent** après l'installation ou un
   changement de hooks (constaté le 2026-10-17 et confirmé par le
   demandeur le même jour : la session `drwil_com` avait été ouverte avant
   `init`, aucun hook n'était actif). Le présenter comme dépendant de
   l'outil, avec un contrôle
   simple : au démarrage, l'agent affiche « État de gouvernance… ».

## Existant

Relevé dans chaque intention d'origine, à sa date ; non revérifié le 2026-10-26.

### « pas encore de code » dit à un projet qui en a (ex-« message-sans-couche-code-existant »)

**Existant (vérifié le 2026-10-23)** :

- `packages/drwil/src/index.ts` (`reportStack`, texte `noLayers`) : le
  message suit l'absence de pile détectée, pas l'absence de code
  (QUA-038, un projet neuf commence par son cadrage global).

### l'aperçu d'`init` annonce le rattachement du code existant (ex-« apercu-init-code-existant »)

**Existant (vérifié le 2026-10-23)** :

- `packages/drwil/src/preview.ts` (`previewInit`) : liste les fichiers créés,
  gardés et remplacés par le parcours du gabarit ; le rattachement
  (`packages/drwil/src/existing-code.ts`) tourne après, hors de ce parcours.
- `findExistingCode` lit déjà sans rien écrire : réutilisable par l'aperçu,
  mais il juge avec la grammaire installée (`.githooks/scope.mjs`), absente
  d'un projet que l'aperçu n'a pas encore équipé.

### le code existant qu'`init` ne peut pas rattacher seul (ex-« code-existant-non-rattache »)

**Existant (vérifié le 2026-10-23)** :

- `packages/drwil/src/existing-code.ts` : message « existait avant
  l'installation » avec la liste des dossiers ; message « Fichiers de code
  non rattachés ».
- `.githooks/scope.mjs` : une entrée de bloc ne contient aucun blanc
  (`ENTRY_RE`), un motif doit nommer deux dossiers avant son premier joker
  (`tooBroad`) ; la grammaire n'a pas d'échappement.

### un dossier de preuves nommé dans la langue du projet (ex-« nom-du-dossier-des-preuves »)

**Existant (relevé le 2026-10-21)** :

- `packages/drwil/src/closure.ts` lit le dossier par `proofsDir(config)`, qui
  accepte déjà un réglage `dirs.proofs` de `.drwil/ia-first.json` et retombe sur
  `docs/preuves` ; `.githooks/closure-proof.mjs` écrit au même endroit.
- Aucun gabarit ne pose `dirs.proofs` : le défaut français s'applique partout.
- Le `README.md` du dossier est livré en deux langues, mais le nom du dossier
  qui le contient, non.

### une seule forme pour les ID du catalogue (ex-« prefixe-catalogue »)

Relevé le 2026-10-15 : les deux catalogues divergent volontairement (écart
déclaré dans `outils/miroirs.json` : contenu propre au dépôt, en français,
QUA-001 et QUA-004 adoptés donc retirés). La divergence du contenu est
légitime ; seule la double forme du préfixe est en question.

### proposer la couche d'un dossier de code apparu après l'installation (ex-« couche-d-un-nouveau-dossier-de-code »)

**Existant (vérifié le 2026-10-19)** :

- Dossier avec du code à l'installation : `drwil init` détecte la stack par
  sous-dossier et écrit chaque couche (`packages/drwil/src/install.ts`).
- Dossier vide ou projet neuf : aucune couche inventée (QUA-038) ; elles se
  déclarent au cadrage (`/drwil-adopt`) ou avec `drwil init --layers`.
- Trou : un dossier de code créé ensuite, sans repasser par `/drwil-adopt` ni
  `--layers`, n'a pas de couche, et rien ne le détecte ni ne le signale.

### un guide de démarrage — prérequis, recommandations, options (ex-« guide-de-demarrage »)

**Existant (vérifié le 2026-10-17)** :

- `README.md`, section « Installation » : une seule procédure pour dossier
  vide, projet existant et mise à jour ; « Good to know » dit que `init`
  active les hooks s'il trouve un dépôt git.
- Rien sur le redémarrage de session ni sur l'autorisation de
  l'auto-merge (`README.md`, README du paquet, recettes).
- Skill `/drwil-start`, étape 4 : vérifie déjà que la fusion est
  programmée (`gh pr view --json autoMergeRequest`) avant de revenir en
  SCOPING.
- Fiches voisines : premier essai propre (installation par l'URL de la
  release, même section du README) et sondage de lancement dans tous les
  cas (sans message `[drwil]`, la skill dit déjà de redémarrer la
  session), faits en 0.6.2, journal du 2026-10-17.

## Questions à trancher

### « pas encore de code » dit à un projet qui en a (ex-« message-sans-couche-code-existant »)

- [décision] Distinguer « pile non détectée » et « pas de code » dans ce
  message (le code indexé se lit déjà), ou le laisser tel quel ?

### l'aperçu d'`init` annonce le rattachement du code existant (ex-« apercu-init-code-existant »)

- [décision] L'aperçu annonce-t-il la fiche et les dossiers cités, jugés avec
  la grammaire du paquet faute de celle du projet, ou dit-il seulement que
  le code indexé sera rattaché ?

### le code existant qu'`init` ne peut pas rattacher seul (ex-« code-existant-non-rattache »)

- [décision] Compléter une carte préexistante dans un bloc délimité (comme
  les fichiers qu'`init` complète déjà, retiré par `uninstall`), ou garder
  le seul signalement ?
- [décision] Donner à la grammaire du bloc `scope` un échappement (chemin
  entre guillemets), ou laisser ces fichiers à rattacher à la main ?

### un dossier de preuves nommé dans la langue du projet (ex-« nom-du-dossier-des-preuves »)

- Le défaut suit-il `docLang` (dossier `preuves` en français, `proofs` en
  anglais), ou le réglage `dirs.proofs` reste-t-il le seul moyen ?
- Que fait `doctor` d'un dépôt qui a des preuves dans l'ancien dossier : il le
  signale, il propose le déplacement, ou les deux dossiers sont lus ?

### une seule forme pour les ID du catalogue (ex-« prefixe-catalogue »)

- [décision] Garder les deux préfixes (lus tous deux), ou un préfixe
  unique quelle que soit la langue ?

### proposer la couche d'un dossier de code apparu après l'installation (ex-« couche-d-un-nouveau-dossier-de-code »)

- [décision] Où détecter : au commit (hook), dans `drwil doctor`, dans le
  rappel d'état en début de tâche, ou dans `verify` ?
- [décision] Signal ou blocage : un avertissement, ou un contrôle bloquant
  quand un dossier de code n'a pas de couche déclarée ?
- [décision] Qui crée la couche : l'agent propose et l'humain valide, ou
  `drwil init` la crée seul pour la stack détectée ?
- [décision] Que faire d'un dossier détecté mais volontairement sans couche
  (exclusion déclarée dans `.drwil/ia-first.json`) ?

### un guide de démarrage — prérequis, recommandations, options (ex-« guide-de-demarrage »)

- [décision] Où vit le guide : une section du README (source unique), ou
  un document à part, à créer, cité par le README ?
- [décision] Auto-merge refusé par le dépôt : seulement documenté, ou
  aussi détecté par `doctor` et dit par la skill de lancement ?
- [décision] La protection de branche : seulement documentée ici, sa
  vérification relevant de `docs/intentions/forge-dans-le-livrable.md` ?

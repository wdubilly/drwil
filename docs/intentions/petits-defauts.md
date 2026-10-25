# Intention : les petits défauts relevés, corrigés en un chantier d'entretien

**Statut** : proposée le 2026-10-25 — regroupement de 15 intentions et 5 note(s) lors du ménage du 2026-10-25 ; chaque partie reprend l'une d'elles, avec son statut d'origine.

## Besoin

Des écarts d'une ligne ou d'un message, relevés pendant les chantiers, ont chacun reçu leur intention : texte de contrat à aligner, message faux, renvoi manquant, doc en retard. Aucun ne justifie une fiche seul ; ensemble, ils font un chantier d'entretien (ou plusieurs passages de l'entretien courant), chaque point vérifiable seul.

### citer le module de note de recette dans la fiche des mécaniques livrée et le README du module (ex-« recette-note-dans-la-fiche-des-mecaniques »)

Statut d'origine : proposée le 2026-10-21 — limite non traitée de la clôture « note de recette par version » (journal du 2026-10-21).

`.githooks/recette-note.mjs`, livré avec le module de release, n'est cité ni par la
fiche des mécaniques livrée au kit (le périmètre d'un projet qui
active le module ne le couvre pas, son premier commit est refusé) ni par le
README du module. Le chantier ne pouvait pas les toucher : hors de son cadrage.

### aligner le texte de QUA-048 sur la reconnaissance par squash (ex-« qua-048-aligne-sur-squash »)

Statut d'origine : proposée le 2026-10-19 — limite du chantier « les branches fusionnées par squash reconnues » (journal du 2026-10-19, 0.6.6, 2 sur 4).

QUA-048 (une clôture en un geste) dit encore que les branches fusionnées
sont supprimées au lancement par `git branch -d`. Depuis QUA-058 (une
branche dont la PR est fusionnée sur GitHub est reconnue fusionnée, squash
compris), une branche dont la fusion par squash est prouvée par `gh` est
supprimée par `git branch -D`. Les deux contrats ne se contredisent pas
(QUA-058 précise le cas), mais le texte de QUA-048 n'est plus complet.

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

### les recettes et skills qui renvoient encore au registre entier (ex-« recettes-qui-lisent-le-registre-entier »)

Statut d'origine : proposée le 2026-10-24 — limite du chantier « réduire le contexte relu par chantier ».

Le chantier a fait pointer `AGENTS.md` et les recettes de clôture vers la
lecture ciblée (QUA-124 : `node .githooks/glossary.mjs --contract <ID>`,
`--contracts`, `--journal <chantier>`). D'autres textes citent encore
`docs/contracts.md` comme une lecture, ce qui invite un agent d'un autre outil
que Claude Code (sans garde de lecture, QUA-132) à le lire en entier.

### une annonce juste du oui à l'ouverture d'un détour qui cite le registre (ex-« annonce-oui-registre-detour »)

Statut d'origine : proposée le 2026-10-19 — limite du chantier « un contrat ajouté pendant un détour, sans arrêter la file » (journal du 2026-10-19, 0.6.6, 3 sur 4).

Pendant un détour, un ajout pur au registre des contrats passe désormais
sans le oui de l'humain (QUA-050, un détour pour une correction
intercalée). Mais à l'ouverture, `node .githooks/detour.mjs open … --files
docs/contracts.md` annonce encore « le oui de l'humain sera demandé » pour
le registre, alors qu'il ne le sera que si un contrat existant est modifié
ou retiré : l'annonce peut faire s'arrêter un sous-agent pour rien.

### la clôture signale aussi les citations d'une intention retirée (ex-« cloture-signale-intention-retiree »)

Statut d'origine : proposée le 2026-10-19 — écart relevé pendant le chantier « les branches fusionnées par squash reconnues » (journal du 2026-10-19, 0.6.6, 2 sur 4).

À la clôture, `node .githooks/close.mjs --check` signale les références à
la fiche qui deviendraient mortes (QUA-048, une clôture en un geste), mais
pas celles à l'intention d'origine qu'on retire quand elle est couverte.
Le 2026-10-19, deux anciennes entrées du journal citaient l'intention
retirée : `--check` disait « Rien ne ferait échouer la clôture », puis le
commit de clôture a été refusé par check-docs (chemin introuvable).

### retirer les citations de fiche restées dans le code non modifié (ex-« citations-de-fiche-heritees »)

Statut d'origine : proposée le 2026-10-18 — limite du chantier « une clôture allégée, sans encombrants » (journal du 2026-10-18, 0.6.5, 3 sur 4).

Le code cite le contrat qu'il sert, jamais une fiche de chantier (QUA-049).
La règle ne bloque que les fichiers modifiés : les citations du code
inchangé sont résumées en un avertissement. Neuf restent dans ce dépôt,
hors du cadrage du chantier qui a créé la règle.

### compter `package.json` parmi les seuils d'un détour (ex-« seuils-dans-package-json »)

Statut d'origine : proposée le 2026-10-18 — limite du chantier « un détour pour une correction intercalée » (journal du 2026-10-18, 0.6.5, 4 sur 4).

Un détour qui change un seuil demande le oui de l'humain (QUA-050, un
détour pour une correction intercalée). Les seuils reconnus sont ceux de
`.drwil/ia-first.json` ; or un seuil peut vivre ailleurs : dans ce dépôt,
le seuil de couverture des hooks à 100 % (QUA-004, seuil de couverture de
test) est écrit dans un script de `package.json`. Un détour qui le
baisserait passerait sans oui.

### une seule forme pour les ID du catalogue (ex-« prefixe-catalogue »)

Statut d'origine : proposée le 2026-10-15 — retour d'expérience du chantier « capitaliser les non-régressions » (journal du 2026-10-15).

Le catalogue de contrats écrit ses ID `catalogue:XXX-NNN` dans ce dépôt et
`catalog:XXX-NNN` dans le gabarit livré : tout outil qui lit le catalogue
(par exemple le contrôle de cohérence des ID entre registre et catalogue,
cadré le 2026-10-15 sur sa propre branche) doit connaître les deux formes.

### un doctor juste sur le dépôt drwil lui-même (ex-« doctor-sur-le-depot-drwil »)

Statut d'origine : proposée le 2026-10-15 — retour d'expérience du chantier « fiabiliser le package npm » (journal du 2026-10-15).

Sur ce dépôt, `drwil doctor` avertit que le manifeste
`.drwil/installed-files.json` (si présent) et l'enregistrement de version
`.drwil/install.json` (si présent) manquent, et conseille de relancer
`npx drwil init`. Or ce dépôt ne s'installe pas par `init` mais depuis son
gabarit (`npm run installer-depot`) : le conseil ne s'applique pas, et deux
avertissements permanents finissent par ne plus être lus.

### détecter un intitulé d'index ou un paragraphe de version devenu faux (ex-« intitule-d-index-devenu-faux »)

Statut d'origine : proposée le 2026-10-21 — limite non traitée de la clôture « la clôture vérifie la cohérence de la documentation » (journal du 2026-10-21).

La clôture refuse désormais une case contredisant le statut de sa fiche, mais
pas un intitulé d'index devenu faux (« 4 sur 5 » alors que la version a été
réduite à trois outils), ni le paragraphe d'une version de l'index qui ne suit
plus ses cases. Ces écarts sont de la prose : aucune règle sûre ne les détecte
aujourd'hui.

### ce que lit un visiteur reste juste sans dépendre de la mémoire de l'agent (ex-« doc-visiteur-juste »)

Statut d'origine : proposée le 2026-10-17 — limite de l'entretien courant du 2026-10-17 (README racine en retard, PR #120) ; élargie le même jour à la cérémonie de clôture (section « Toute clôture fait l'exercice »).

Le 2026-10-17, le README racine était faux sur trois points après la
clôture du chantier consommation (journal du 2026-10-16) : l'étape
CLOSING sans la consommation, la ligne `/drwil-usage` d'avant la mesure
automatique, et « Current status » qui présentait la 0.6.0 comme sortie
alors que la dernière release était la 0.5.1. Aucun contrôle ne l'a vu ;
c'est le demandeur qui a posé la question. Deux causes :

1. **Contenu en double** : le cycle d'un chantier (SCOPING → CLOSING),
   l'installation et les commandes (`init`, `verify`, `attest`,
   `doctor`, `uninstall`) sont écrits à la fois dans `README.md` et dans
   `packages/drwil/README.md`. La clôture a mis à jour l'un, pas l'autre,
   contre la règle « une information a une seule source » (`AGENTS.md`).
2. **Version annoncée non contrôlée** : rien ne compare ce que le README
   dit de la version (sortie ou à venir) au dernier tag publié.

**Toute clôture fait l'exercice (ajouté le 2026-10-17)** :

Même cause de fond : la clôture de l'entretien courant du 2026-10-17 a
sauté la boucle des intentions. L'agent avait tronqué la sortie de
`node .githooks/state.mjs move CLOSING` et n'a pas lu la règle ; une
limite relevée dans son compte rendu (« Current status » à réécrire à la
release) est restée dans le chat. Rien ne l'a rattrapé :

- QUA-036 (la clôture boucle les intentions) dit « à la clôture d'un
  chantier », sans dire si l'entretien courant en est ;
- son seul garde-fou avertit un commit qui supprime une fiche sans
  toucher son intention : la fiche d'entretien courant n'est jamais
  supprimée et n'a pas de champ `**Intention**`, il ne se déclenche
  jamais pour elle ;
- le rappel CLOSING parle de condenser ou supprimer la fiche, ce qui ne
  s'applique pas à l'entretien courant.

**Décision (demandeur, 2026-10-17)** : toute clôture est contrainte à
l'exercice, entretien courant compris — limites non traitées en
intentions, ce que lit l'utilisateur tenu à jour, consommation consignée.

### Notes reprises de `docs/intentions/notes.md`

- 2026-10-21 — Documenter dans le README la commande de note (node .githooks/note.mjs, QUA-071), absente du README alors que le changelog 0.6.9 l'annonce
- 2026-10-22 — Le passage BUILD → EVIDENCE sur l'entretien courant (fiche permanente) annonce sa suppression et liste ~40 faux avertissements « cite docs/projects/routine-maintenance.md, qui sera supprimée » : le signal de clôture devrait exempter la fiche permanente.
- 2026-10-23 — Désinstallation : après drwil guarantees --protect (contrôle checks requis, enforce_admins), uninstall retire le workflow de CI sans toucher la forge, donc toute PR vers la branche principale reste bloquée sur un contrôle qui ne vient plus. uninstall devrait au moins le signaler (et la doc Uninstalling du README le dire) ; piste : proposer la commande gh qui lève la protection, avec l'accord de l'humain.
- 2026-10-23 — Un lancement intercalé efface la file en silence : le 2026-10-24, lancer l'entretien courant par /drwil-start (pour corriger la PR #218 bloquée en CLOSING) a remplacé la file décidée au lancement (reouvrir-apres-cloture, contournements-completes) ; state.mjs next a ensuite refusé, sans dire que la file avait disparu. Attendu : un lancement intercalé suspend la file (ou demande), et next/state disent clairement qu'il n'y a plus de file et pourquoi.
- 2026-10-24 — Scripts propres au dépôt (outils/*.mjs, .github/scripts/ci-multi-os.mjs) : point d'entrée qui ne résout que process.argv[1] (realpathSync d'un seul côté), hors du test anti-récidive de QUA-044 (points d'entrée livrés comparés par chemins réels) qui ne parcourt que le gabarit — à aligner et à couvrir

## Existant

Relevé dans chaque intention d'origine, à sa date ; non revérifié le 2026-10-25.

### citer le module de note de recette dans la fiche des mécaniques livrée et le README du module (ex-« recette-note-dans-la-fiche-des-mecaniques »)

**Existant (relevé le 2026-10-21)** :

- `docs/projects/kit-mechanics.md` cite `.githooks/recette-note.mjs` (ajouté à
  la clôture) ; sa copie livrée
  `packages/drwil/templates/common/base/docs/projects/kit-mechanics.md` cite
  chaque script du module sauf lui.
- `packages/drwil/templates/common/optional/create-release/README.md` liste
  les scripts à copier sans `.githooks/recette-note.mjs` : un projet qui copie moins que
  la liste obtient une erreur d'import au lancement de `.githooks/create-release.mjs`.
- Le test du kit (`packages/drwil/test/kit.test.mjs`) ajoute la ligne dans le
  projet de test pour contourner le manque.

### aligner le texte de QUA-048 sur la reconnaissance par squash (ex-« qua-048-aligne-sur-squash »)

**Existant (vérifié le 2026-10-19)** :

- `docs/contracts.md`, QUA-048 : « supprimées (`git branch -d`) — jamais
  la branche principale, la courante, une branche encore au sommet de la
  principale ni une branche non fusionnée ».
- Modifier un contrat existant demande sa déclaration dans la section
  « Contrats modifiés » d'une fiche, validée par le demandeur (QUA-023,
  régression ou évolution d'un contrat) : le chantier ne l'a pas fait.

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

### les recettes et skills qui renvoient encore au registre entier (ex-« recettes-qui-lisent-le-registre-entier »)

**Existant (relevé le 2026-10-24)** :

- `AGENTS.md` (gabarit et dépôt), tableau « Si tu touches à… » : ligne « un
  défaut à corriger », colonne « Lis d'abord » = `docs/contracts.md`.
- Recettes du gabarit (`packages/drwil/templates/common/base/docs/recipes/`) :
  `docs/recipes/audit-risks-and-debt.md` (« Invariants »),
  `docs/recipes/modify-permissions.md`, `docs/recipes/corriger-un-defaut.md`,
  `docs/recipes/adopt-the-kit.md`, `docs/recipes/view-progress.md` (certaines
  mentions sont descriptives, pas des lectures).
- Skills Claude Code : `add-an-api-route`, `add-a-frontend-screen`,
  `adopt-the-kit`.

### une annonce juste du oui à l'ouverture d'un détour qui cite le registre (ex-« annonce-oui-registre-detour »)

**Existant (vérifié le 2026-10-19)** :

- `.githooks/detour.mjs` (`open`, texte `rulesAhead`) : liste les fichiers
  de `--files` reconnus par `rulesFiles`, registre compris, sans nuance.
- `.githooks/scope-gate.mjs` : juge le registre indexé contre HEAD
  (`contractsAddedOnly`) au moment du commit.

### la clôture signale aussi les citations d'une intention retirée (ex-« cloture-signale-intention-retiree »)

**Existant (vérifié le 2026-10-19)** :

- `.githooks/close.mjs` (`closingSignals`) : cherche les citations de la
  fiche active seulement.
- L'intention d'origine est connue (champ `**Intention**` de la fiche).

### retirer les citations de fiche restées dans le code non modifié (ex-« citations-de-fiche-heritees »)

**Existant (vérifié le 2026-10-18)** :

- `.github/scripts/ci-multi-os.mjs`, `.github/workflows/ia-first.yml`,
  `outils/installer-depot.mjs`, `outils/tester-tarball.mjs`,
  `packages/drwil/test/migration.test.mjs` : neuf commentaires citent une
  fiche, souvent déjà supprimée.
- check-docs les liste à chaque passage, en un avertissement non bloquant.

### compter `package.json` parmi les seuils d'un détour (ex-« seuils-dans-package-json »)

**Existant (vérifié le 2026-10-18)** :

- `.githooks/detour.mjs` (`RULES`) : `.githooks/*`, `.drwil/ia-first.json`,
  `.github/workflows/*`, le fichier de CI GitLab, plus le registre et les
  `ciFiles` réglés ; `package.json` n'y est pas.
- `package.json` : script `test:hooks:coverage`, `c8 --check-coverage
  --lines 100 --branches 100 --functions 100 --statements 100`.
- Un projet installé peut aussi porter ses seuils dans `package.json`, un
  fichier de configuration d'outil (`.c8rc`, `vitest.config.*`…) ou sa CI.

### une seule forme pour les ID du catalogue (ex-« prefixe-catalogue »)

Relevé le 2026-10-15 : les deux catalogues divergent volontairement (écart
déclaré dans `outils/miroirs.json` : contenu propre au dépôt, en français,
QUA-001 et QUA-004 adoptés donc retirés). La divergence du contenu est
légitime ; seule la double forme du préfixe est en question.

### un doctor juste sur le dépôt drwil lui-même (ex-« doctor-sur-le-depot-drwil »)

Relevé le 2026-10-15 : `packages/drwil/src/doctor.ts` (points « manifeste »
et « version ») ne connaît que `init` ; `outils/installer-depot.mjs` installe
le dépôt dans une copie temporaire puis recopie les fichiers du gabarit,
sans manifeste ni enregistrement de version. L'avertissement du manifeste
existait avant le chantier ; celui de la version est nouveau.

### détecter un intitulé d'index ou un paragraphe de version devenu faux (ex-« intitule-d-index-devenu-faux »)

**Existant (relevé le 2026-10-21)** :

- `.githooks/doc-coherence.mjs` ne lit que les cases, les statuts de fiche,
  les références mortes et les citations de fiche dans le code.
- Les cas rencontrés le 2026-10-19 sont restés à la vigilance de l'agent.

### ce que lit un visiteur reste juste sans dépendre de la mémoire de l'agent (ex-« doc-visiteur-juste »)

**Existant (vérifié le 2026-10-17)** :

- QUA-040 (drwil entretient la carte, le README et le changelog) : le
  contrôle `architecture-map` ne vérifie que la carte ; pour le README et
  le changelog, c'est une consigne de clôture.
- QUA-041 (la documentation lue par un nouvel utilisateur dit vrai) :
  satisfait par une attestation humaine, pas par un contrôle automatique.
- La release renomme la section « Unreleased » du changelog
  (`docs/recipes/create-a-release.md`), sans toucher au README.
- La table des skills n'existe que dans `README.md` (pas en double).

## Questions à trancher

- [décision] Découper ce regroupement en lots, chacun vérifiable seul, et choisir le premier.

### citer le module de note de recette dans la fiche des mécaniques livrée et le README du module (ex-« recette-note-dans-la-fiche-des-mecaniques »)

- Ajouter les deux citations dans un chantier court (fiche à cadrer), puis
  retirer le contournement du test du kit.

### aligner le texte de QUA-048 sur la reconnaissance par squash (ex-« qua-048-aligne-sur-squash »)

- [décision] Réécrire la phrase de QUA-048 en renvoyant à QUA-058 et
  QUA-059 (évolution déclarée dans une fiche), ou la laisser telle quelle,
  QUA-058 faisant foi pour le squash ?

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

### les recettes et skills qui renvoient encore au registre entier (ex-« recettes-qui-lisent-le-registre-entier »)

- Remplacer chaque mention qui est une lecture par la lecture ciblée, et
  garder les mentions descriptives ?
- Faut-il un contrôle (doc-coherence) qui refuse une consigne de lecture du
  registre entier dans une recette livrée ?

### une annonce juste du oui à l'ouverture d'un détour qui cite le registre (ex-« annonce-oui-registre-detour »)

- [décision] Nuancer l'annonce pour le registre (« seulement si un contrat
  existant est modifié ou retiré »), ou retirer le registre de l'annonce ?

### la clôture signale aussi les citations d'une intention retirée (ex-« cloture-signale-intention-retiree »)

- [décision] Signaler aussi les citations de l'intention d'origine (« si
  vous la retirez, ces lignes deviendront mortes »), ou laisser check-docs
  les attraper au commit ?

### retirer les citations de fiche restées dans le code non modifié (ex-« citations-de-fiche-heritees »)

- [décision] Les corriger d'un coup (entretien courant, cadrage de ces cinq
  fichiers) ou au fil des chantiers qui touchent chaque fichier ?

### compter `package.json` parmi les seuils d'un détour (ex-« seuils-dans-package-json »)

- [décision] Ajouter `package.json` entier aux règles du jeu (simple, mais
  tout changement de dépendance demanderait le oui), ne regarder que ses
  scripts, ou laisser chaque projet déclarer ses fichiers de seuils dans
  `.drwil/ia-first.json` (comme `ciFiles`) ?

### une seule forme pour les ID du catalogue (ex-« prefixe-catalogue »)

- [décision] Garder les deux préfixes (lus tous deux), ou un préfixe
  unique quelle que soit la langue ?

### un doctor juste sur le dépôt drwil lui-même (ex-« doctor-sur-le-depot-drwil »)

- [décision] `installer-depot` doit-il écrire le manifeste et
  l'enregistrement de version, comme `init` ?
- [décision] Ou `doctor` doit-il reconnaître le dépôt drwil (réglage dans
  `.drwil/ia-first.json`) et adapter son conseil ?

### détecter un intitulé d'index ou un paragraphe de version devenu faux (ex-« intitule-d-index-devenu-faux »)

- Un format structuré (compteur ou liste de cases rattachées à une version) rendrait-il l'écart détectable sans heuristique ?
- Un avertissement à la clôture, ou un contrôle bloquant ?

### ce que lit un visiteur reste juste sans dépendre de la mémoire de l'agent (ex-« doc-visiteur-juste »)

- [décision] Source unique : le détail (cycle, installation, commandes)
  vit dans un seul des deux README, l'autre y renvoie — lequel, sachant
  que `packages/drwil/README.md` est la page affichée par npm une fois le
  paquet publié ? Ou bien un contrôle qui compare les passages communs ?
- [décision] Version annoncée : un contrôle qui compare la version citée
  par le README (et la section « Current status ») au dernier tag, ou une
  étape de la recette de release qui la réécrit ?
- [décision] Livrable ou dépôt : ces contrôles servent-ils aussi chez un
  projet client (son README et ses tags), ou seulement à ce dépôt ?
- [décision] Comment contraindre la clôture, sans dépendre de la
  lecture du rappel : par exemple, refuser le retour en SCOPING (ou
  avertir) tant que le commit de clôture ne déclare pas ses limites —
  une intention citée, ou « Limites : aucune » explicite (dans « Limites
  connues » du journal pour un chantier, dans la ligne du journal de la
  fiche pour l'entretien courant) ? Refus ou avertissement ?
- [décision] Le rappel CLOSING distingue-t-il l'entretien courant (pas de
  condensation ni de suppression, mais le reste de l'exercice) ?

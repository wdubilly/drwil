# Intention : les contournements encore ouverts

**Statut** : proposée le 2026-10-25 — regroupement de 5 intentions lors du ménage du 2026-10-25 ; chaque partie reprend l'une d'elles, avec son statut d'origine.

## Besoin

Le chantier « les contournements restants fermés ou assumés » (journal du 2026-10-24) et celui de CODEOWNERS ont laissé des contournements connus, une intention chacun. Ils se jugent ensemble : lesquels fermer, lesquels assumer et documenter. Rangement du 2026-10-26 : le clone superficiel et l'auto-élargissement du cadrage (ex-`contournements-a-completer`), le juge du banc qui lit le texte des commandes (ex-`banc-juge-motif-textuel`, même problème que la garde shell : juger l'effet, pas le texte) et les seuils d'un détour sont repris ici.

### l'étape de rejeu ne se retire pas du workflow par la PR elle-même (ex-« rejeu-retirable-du-workflow »)

Statut d'origine : proposée le 2026-10-24 — limite du chantier « les contournements restants fermés ou assumés » (journal du 2026-10-24).

QUA-113 (sur une PR, la CI rejoue les contrôles avec les hooks de la
branche principale) rejoue `.githooks/` de la branche principale, mais
l'étape qui lance ce rejeu vit dans le workflow de la branche contrôlée
(`.github/workflows/ia-first.yml` ; dans le gabarit,
`packages/drwil/templates/common/ci/gitlab/.gitlab-ci.yml`). Une PR qui retire ou
neutralise cette étape se valide donc encore elle-même : seule la relecture
la retient.

### un contrôle redéfini sous le même nom est comparé (ex-« controle-redefini-meme-nom »)

Statut d'origine : proposée le 2026-10-24 — limite du chantier « les contournements restants fermés ou assumés » (journal du 2026-10-24).

Le rejeu par la branche principale (QUA-113, sur une PR, la CI rejoue les
contrôles avec les hooks de la branche principale) refuse un contrôle
retiré de `.drwil/ia-first.json` sans déclaration dans « Contrats
modifiés ». Il ne compare que les identifiants (`id`, à défaut `name`) : un contrôle gardé sous le même identifiant
mais dont la commande est affaiblie (filtre plus étroit, `|| true`,
commande vide) passe sans être signalé.

### la garde shell juge l'effet d'une commande, pas son texte (ex-« garde-shell-par-le-texte »)

Statut d'origine : proposée le 2026-10-24 — limite du chantier « les contournements restants fermés ou assumés » (journal du 2026-10-24).

La garde shell de Claude Code (QUA-114, refus du saut des hooks et de
l'écriture de `core.hooksPath`) lit le texte de la commande. Elle se trompe
dans les deux sens :

- **trompée** par une commande construite avec des variables
  (`o=--no-verify; git commit $o`, nom de réglage assemblé) : elle passe ;
- **trop stricte** sur un texte entre guillemets qui ne fait que citer une
  telle commande : un heredoc qui écrivait de la documentation la citant a
  été refusé pendant le chantier.

La CI rattrape le premier cas (rejeu des contrôles) ; le second gêne
l'agent sans protéger.

### les tests de la garde shell à côté de leur hook (ex-« tests-garde-shell-a-leur-place »)

Statut d'origine : proposée le 2026-10-24 — limite du chantier « les contournements restants fermés ou assumés » (journal du 2026-10-24).

Les tests de QUA-114 (la garde shell de Claude Code refuse le saut des hooks
et l'écriture de `core.hooksPath`) sont dans
`packages/drwil/test/kit.test.mjs`, et non dans un fichier de test à côté
de la garde, dans .claude/hooks/, comme prévu au cadrage : un test placé
dans `.claude/hooks/` y serait pris pour une copie du gabarit, et sa
déclaration dans `outils/miroirs.json` (écarts admis des copies installées)
sortait du cadrage. Ils restent plus loin de leur code qu'ailleurs dans le
dépôt.

### lire les erreurs que GitHub relève dans CODEOWNERS (ex-« codeowners-erreurs-github »)

Statut d'origine : proposée le 2026-10-24 — limite du chantier « CODEOWNERS protège le registre sous son nom actuel » (journal du 2026-10-24).

Le contrôle `codeowners` (QUA-112, chaque ligne de CODEOWNERS cite un
chemin suivi par Git) ne juge que les chemins. Une ligne au chemin juste
reste sans effet si son propriétaire n'existe pas ou n'a pas d'accès en
écriture, ou si GitHub lit autrement une syntaxe : la revue obligatoire
tombe alors en silence, comme avec l'ancien nom du registre.

### compléter la suite des contournements testés (ex-« contournements-a-completer »)

Statut d'origine : proposée le 2026-10-22 — revue externe du dépôt ; inventaire
de l'existant fait le même jour ;
cadrée le 2026-10-23, réalisée le 2026-10-24 (journal du 2026-10-24, « Les
contournements restants fermés ou assumés ») : les trois questions sont
tranchées ; restent ici le clone superficiel et l'agent qui élargit son
cadrage.

Démontrer que les règles existantes résistent à une erreur ou à une tentative
de contournement avant d'en ajouter de nouvelles. Chaque scénario dit le
résultat qu'il exige : refus, échec en CI, ou état explicitement « non
exécuté ». Une alerte ne compte jamais comme un blocage.

**Trous relevés** :

Traités le 2026-10-24 (QUA-113, la CI rejoue les contrôles avec les hooks de
la branche principale ; QUA-114, la garde shell refuse le saut des hooks ;
QUA-115, `bypass_actors` vérifié avec le jeton de l'humain) : hooks modifiés
dans la PR, `core.hooksPath` en local, `bypass_actors`. Leurs limites ont
leurs propres intentions, citées par le journal. Restent :

- **Clone superficiel** : non testé. La CI fait `fetch-depth: 0`, dans ce
  dépôt comme dans le gabarit.
- **Un agent qui élargit lui-même son cadrage puis code** : voulu, seulement
  visible en relecture.

### le juge du banc relève les contournements sur le texte des commandes (ex-« banc-juge-motif-textuel »)

Statut d'origine : proposée le 2026-10-23 — limite du chantier « Mini-banc : copie
« avec » adoptée, juge et raison d'erreur corrigés » (journal du 2026-10-23).

Le juge (QUA-102, juge du mini-banc indépendant de drwil) ne compte plus la
lecture du réglage des hooks, seulement son écriture, sa suppression ou sa
surcharge (`ecritHooks`, `outils/banc-juge.mjs`). Il reste une lecture du
texte des commandes et des lignes ajoutées, pas de l'effet :

- une ligne de documentation qui cite une surcharge (`git -c
  core.hooksPath=…`), ou une commande d'écriture hors bloc de code, compte
  comme contournement ; une citation en code Markdown (`` `git config …` ``)
  ne compte pas ;
- un contournement masqué (variable, script généré, alias git) échappe au
  motif.

### compter `package.json` parmi les seuils d'un détour (ex-« seuils-dans-package-json »)

Statut d'origine : proposée le 2026-10-18 — limite du chantier « un détour pour une correction intercalée » (journal du 2026-10-18, 0.6.5, 4 sur 4).

Un détour qui change un seuil demande le oui de l'humain (QUA-050, un
détour pour une correction intercalée). Les seuils reconnus sont ceux de
`.drwil/ia-first.json` ; or un seuil peut vivre ailleurs : dans ce dépôt,
le seuil de couverture des hooks à 100 % (QUA-004, seuil de couverture de
test) est écrit dans un script de `package.json`. Un détour qui le
baisserait passerait sans oui.

### Notes reprises de `docs/intentions/notes.md`

- 2026-10-24 — Scripts propres au dépôt (outils/*.mjs, .github/scripts/ci-multi-os.mjs) : point d'entrée qui ne résout que process.argv[1] (realpathSync d'un seul côté), hors du test anti-récidive de QUA-044 (points d'entrée livrés comparés par chemins réels) qui ne parcourt que le gabarit — à aligner et à couvrir

## Existant

Relevé dans chaque intention d'origine, à sa date ; non revérifié le 2026-10-25.

### l'étape de rejeu ne se retire pas du workflow par la PR elle-même (ex-« rejeu-retirable-du-workflow »)

**Existant (relevé le 2026-10-24)** :

- Ce dépôt : `.github/CODEOWNERS` exige la revue du propriétaire sur le
  workflow ; un projet adopté n'a pas de CODEOWNERS
  (`docs/intentions/forge-dans-le-livrable.md`).
- GitHub sait exiger un workflow par un ruleset d'organisation (« required
  workflows »), hors de portée d'un dépôt personnel.

### un contrôle redéfini sous le même nom est comparé (ex-« controle-redefini-meme-nom »)

**Existant (relevé le 2026-10-24)** :

- `.githooks/base-checks.mjs` lit la liste de contrôles de la PR et celle
  de la branche principale, et compare leurs identifiants.

### la garde shell juge l'effet d'une commande, pas son texte (ex-« garde-shell-par-le-texte »)

**Existant (relevé le 2026-10-24)** :

- `packages/drwil/templates/common/tools/claude/.claude/hooks/bash-guard.mjs`
  (`skipsHooks`) découpe la commande composée et les `sh -c`, sans
  évaluer les variables ni distinguer un argument cité d'une commande.
- Même limite côté banc : partie « le juge du banc relève les contournements sur le texte des commandes » ci-dessous.

### les tests de la garde shell à côté de leur hook (ex-« tests-garde-shell-a-leur-place »)

**Existant (relevé le 2026-10-24)** :

- Le contrôle `tests-qua-114` filtre les tests par l'ID dans
  `packages/drwil/test/kit.test.mjs`.
- Les autres hooks du dépôt ont leurs tests à côté
  (`.githooks/*.test.mjs`).

### lire les erreurs que GitHub relève dans CODEOWNERS (ex-« codeowners-erreurs-github »)

**Existant (relevé le 2026-10-24)** :

- GitHub expose les erreurs qu'il relève dans le fichier
  (`gh api repos/<propriétaire>/<dépôt>/codeowners/errors`).
- Le contrôle `codeowners` tourne hors ligne, au commit et en CI, sans
  appel à la forge.

### compléter la suite des contournements testés (ex-« contournements-a-completer »)

**Existant (inventaire du 2026-10-22)** :

Couverts, avec le résultat exigé :

- `--no-verify`, commit sans hooks, `core.hooksPath` détourné : repris au push
  et en CI (`packages/drwil/test/cycle.test.mjs`, « contournements : un commit
  passé avec --no-verify ou sans hooks… »).
- État local falsifié : le cadrage est rejoué sur la branche (même fichier).
- Commit sans trailer `Drwil-Brief` : refusé en CI
  (`.githooks/scope-gate.test.mjs`) ; vécu avec la PR #199.
- Cadrage et code dans le même commit : refusé au commit (même fichier).
- Base de comparaison absente : « non exécuté » (même fichier).
- Travail ou push direct sur la branche principale (QUA-017) :
  `packages/drwil/test/kit.test.mjs`, `.githooks/engine.test.mjs`.
- Attestation forgée ou périmée : `packages/drwil/test/kit.test.mjs`
  (« attest : aucun contournement… ») et `packages/drwil/test/cycle.test.mjs` (QUA-032, QUA-081).

### le juge du banc relève les contournements sur le texte des commandes (ex-« banc-juge-motif-textuel »)

**Existant (vérifié le 2026-10-23)** :

- `ecritHooks` : segments de commande, `git config` avec ou sans valeur,
  `--unset`, `set`/`unset`, `-c core.hooksPath=`, variables `GIT_CONFIG_*`,
  édition de `.git/config` par `sed -i`, `tee` ou redirection.

### compter `package.json` parmi les seuils d'un détour (ex-« seuils-dans-package-json »)

**Existant (vérifié le 2026-10-18)** :

- `.githooks/detour.mjs` (`RULES`) : `.githooks/*`, `.drwil/ia-first.json`,
  `.github/workflows/*`, le fichier de CI GitLab, plus le registre et les
  `ciFiles` réglés ; `package.json` n'y est pas.
- `package.json` : script `test:hooks:coverage`, `c8 --check-coverage
  --lines 100 --branches 100 --functions 100 --statements 100`.
- Un projet installé peut aussi porter ses seuils dans `package.json`, un
  fichier de configuration d'outil (`.c8rc`, `vitest.config.*`…) ou sa CI.

## Questions à trancher

- [décision] Découper ce regroupement en lots, chacun vérifiable seul, et choisir le premier.

### l'étape de rejeu ne se retire pas du workflow par la PR elle-même (ex-« rejeu-retirable-du-workflow »)

- [décision] Faire vérifier par le rejeu lui-même que le workflow de la PR
  contient encore l'étape (comparaison avec celui de la branche
  principale), exiger un workflow par la forge quand elle le permet, ou
  assumer la limite par écrit ?

### un contrôle redéfini sous le même nom est comparé (ex-« controle-redefini-meme-nom »)

- [décision] Comparer aussi la commande (toute différence déclarée dans
  « Contrats modifiés »), au risque de demander une déclaration pour une
  simple amélioration, ou seulement signaler la différence sans bloquer ?

### la garde shell juge l'effet d'une commande, pas son texte (ex-« garde-shell-par-le-texte »)

- [décision] Ignorer le contenu d'un heredoc et d'un argument cité qui
  n'est pas lui-même exécuté (`sh -c`, `eval`), refuser toute commande git
  dont un argument vient d'une variable, ou assumer les deux limites,
  la CI restant le filet ?

### les tests de la garde shell à côté de leur hook (ex-« tests-garde-shell-a-leur-place »)

- [décision] Déplacer les tests dans un fichier à créer à côté de la
  garde, dans .claude/hooks/, et déclarer le fichier dans
  `outils/miroirs.json`, ou les laisser dans
  les tests du kit ?

### lire les erreurs que GitHub relève dans CODEOWNERS (ex-« codeowners-erreurs-github »)

- [décision] Interroger cette API en CI (jeton, forge joignable, échec
  réseau en erreur et non en succès, QUA-013 — contrôle non exécuté n'est
  pas passé), ou s'en tenir au contrôle hors ligne ?

### compléter la suite des contournements testés (ex-« contournements-a-completer »)

- [décision] Tester un clone superficiel (la CI le refuse-t-elle en « non
  exécuté »), ou assumer `fetch-depth: 0` comme seule défense ?
- [décision] Un élargissement de cadrage par l'agent doit-il être signalé à
  l'humain au-delà de la relecture ?

### le juge du banc relève les contournements sur le texte des commandes (ex-« banc-juge-motif-textuel »)

- [décision] Juger aussi l'effet : relire `git config core.hooksPath` de la
  copie après le passage (réglage changé ou retiré), en plus du texte ?

### compter `package.json` parmi les seuils d'un détour (ex-« seuils-dans-package-json »)

- [décision] Ajouter `package.json` entier aux règles du jeu (simple, mais
  tout changement de dépendance demanderait le oui), ne regarder que ses
  scripts, ou laisser chaque projet déclarer ses fichiers de seuils dans
  `.drwil/ia-first.json` (comme `ciFiles`) ?

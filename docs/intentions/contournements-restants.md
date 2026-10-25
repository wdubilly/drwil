# Intention : les contournements encore ouverts

**Statut** : proposée le 2026-10-25 — regroupement de 5 intentions lors du ménage du 2026-10-25 ; chaque partie reprend l'une d'elles, avec son statut d'origine.

## Besoin

Le chantier « les contournements restants fermés ou assumés » (journal du 2026-10-24) et celui de CODEOWNERS ont laissé des contournements connus, une intention chacun. Ils se jugent ensemble : lesquels fermer, lesquels assumer et documenter. Le clone superficiel et l'auto-élargissement du cadrage restent dans `docs/intentions/contournements-a-completer.md`.

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
- Même limite côté banc : `docs/intentions/banc-juge-motif-textuel.md`.

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

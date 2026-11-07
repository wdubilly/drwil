# Fonctionnalités

Ce que fait drwil, fonctionnalité par fonctionnalité, du point de vue de
la personne qui l'utilise sur son projet. Le détail des commandes est dans
`README.md` ; les invariants, dans `docs/contracts.md`.

## Installation et mise à jour (`drwil init`)

Équipe un dossier vide, un projet existant ou un projet déjà équipé, sans
jamais écraser un fichier du projet. `--dry-run` montre ce qui serait
écrit. Une mise à jour rafraîchit ce que le kit a installé et que le projet
n'a pas modifié ; sur un projet qui a déjà du code, `init` le rattache à une
fiche « code existant » pour que le premier commit passe. L'installation
sur un dossier vide et la mise à jour d'un projet équipé sont commitées par
`init` lui-même, sur leur propre branche ; une nouvelle installation pose la
barrière de périmètre en mode bloquant. Un fichier que la mise à jour
complète (ligne du `.gitignore`, bloc de la fiche de mécanique) garde son
empreinte, au manifeste s'il était intact, à part s'il a été retouché : le
commit de mise à jour passe la barrière. Un fichier du kit
modifié à la main est signalé en dérive et repris par `drwil resolve-drift`
(diff, confirmation, sauvegarde `.bak`).
`drwil uninstall` ne retire que ce que le kit a installé et garde
l'historique de gouvernance (`.drwil/`).

## Adoption (`/drwil-adopt`)

Sur un dossier vide, cadre le projet d'abord (besoin, première version,
pile, règles métier, risque) ; sur un code existant, construit la carte
d'architecture et propose les contrats du catalogue un par un, chaque choix
restant une décision du demandeur.

## Garanties obligatoires (`drwil guarantees`)

Lancées par `/drwil-adopt` une fois la pile connue : couverture à 100 % par
couche (cliquet au niveau mesuré sur un projet existant en dette de tests,
100 % du code neuf ou modifié), contrôle `e2e` des parcours critiques,
forge protégée avec une CI qui rejoue le hook, README qui présente le
produit. Chaque garantie non tenue écrit une fiche bloquante `[P0]` et
`drwil verify` reste en FAIL tant qu'elle ne l'est pas. `--protect` pose la
protection de la branche principale, avec l'accord de l'humain seulement.

## Vérification (`drwil verify`)

Exécute les contrôles des contrats et rend un verdict de gouvernance, en
texte, en JSON (`--json`) ou pour un agent (`--agent`, seul
`GOVERNANCE: PASS` vaut validation). Un contrôle non exécuté n'est jamais
compté comme passé ; un critère de la fiche active sans preuve fait tomber
le verdict. Le verdict d'un contrôle est repris quand ce qu'il juge n'a pas
changé (`run-checks`, `drwil verify`, le pre-push, et en CI la passe d'une
PR qui le demande, sur les verdicts de la dernière CI de la branche
principale, dans la CI du dépôt comme dans celles livrées, GitHub et GitLab ; le push sur la branche principale rejoue tout, `--no-reuse` et
`--replay-all` aussi), et la sortie dit repris ou rejoué ;
`verify` peut jouer ses contrôles en parallèle, et chaque contrôle dit sa
durée. `drwil doctor` diagnostique l'installation, `drwil contracts`
valide le registre sans rien exécuter. `drwil verify --failed` ne rejoue
que les contrats en échec (verdict partiel, jamais une preuve de clôture) ;
`drwil doctor` dit le niveau de protection réellement tenu.
`drwil contracts add` écrit un contrat propre au projet, `drwil contracts
adopt <ID>` reprend un contrat du catalogue. `drwil report` imprime un
rapport de défaut du kit sans donnée du projet.

## Attestation humaine (`drwil attest`)

Un contrat `MANUAL` se valide par l'humain, d'abord par le sondage
d'attestation dans le chat, sinon dans son propre terminal (`drwil attest`) ;
l'attestation est versionnée et tombe quand un fichier qu'elle couvre
change. Un agent ne l'atteste jamais. `drwil attest-poll` prépare le
sondage dans l'outil de l'agent (recette `docs/recipes/attest-a-contract.md`) :
seule la réponse de l'humain, lue par le hook, l'enregistre ; hors Claude Code (Copilot, Gemini,
Codex, Cursor par `drwil cursor-acp`), ce n'est prouvé que par des tests.

## Cycle de chantier

État de gouvernance (cadrage, réalisation, clôture) lu par chaque agent et
rappelé par les hooks ; lancement par un sondage dont l'humain choisit la
réponse (`/drwil-start`), file de chantiers, barrière de périmètre au
commit, détour pour un défaut préalable, clôture en un geste
(`.githooks/close.mjs`) avec preuve versionnée et consommation de tokens
mesurée ; un hook modifié sans être déclaré est signalé avant la clôture,
qui le refuse. Un chantier peut se lancer dans son propre worktree, et une
file de chantiers en parallèle, un worktree par fiche (au plus
`maxParallel` à la fois, fiches dont les périmètres se recoupent
refusées). Avec la fusion automatique, programmée par `.githooks/merge-auto.mjs`, le
retour au cadrage et la suite de la file attendent la fusion de la PR ; en
cadrage, seule la réponse de l'humain au sondage `/drwil-scope` l'autorise.
Une fiche à plusieurs lots se mène lot par lot (`node .githooks/state.mjs
lot`). Un chantier dont la PR révèle un défaut après la clôture se
rouvre d'une commande (`node .githooks/state.mjs reopen`). Sur un autre clone
ou une autre machine, placé sur la branche du chantier, `node .githooks/state.mjs
resume` reconstruit l'état local d'après l'historique Git (BUILD, ou CLOSING
si la clôture est commitée, lot courant compris), sans jamais reprendre une
décision humaine ; la fusion automatique se redonne alors par un sondage
`drwil-merge` dont l'humain choisit la réponse. Une limite dans le cadre de la fiche se traite sur le champ ;
une limite hors cadre est soumise à l'humain, à la fin de la réalisation, par
un sondage `drwil-limite` (« Traiter maintenant » ou « Noter en intention »),
et la clôture refuse une fiche d'intention née sur la branche sans ce choix ;
ces deux sondages sont lus par le hook sous Claude Code, Copilot CLI, Gemini CLI,
Codex et le client ACP de Cursor.
Une idée se note
à tout moment sans changer d'activité (`/drwil-note`).

## Garde-fous contre le contournement

Sur une PR, la CI rejoue les contrôles avec les hooks de la branche
principale : un hook affaibli ou un contrôle retiré échoue. Avec Claude
Code, la garde shell refuse le saut des hooks (`--no-verify`, écriture de
`core.hooksPath`) ; `drwil guarantees` et `drwil doctor` vérifient la liste
de contournement (`bypass_actors`) des règles de la branche principale.

## Contexte de l'agent

Lecture ciblée du registre et du journal (`node .githooks/glossary.mjs
--contract <ID>`, `--contracts`, `--journal <fiche>`) ; avec Claude Code,
leur lecture entière est refusée. `run-checks` n'affiche que les contrôles
en échec ; un sous-agent `drwil-checks` lance les contrôles longs et ne rend
que le verdict. L'`AGENTS.md` installé est un aiguillage court : il renvoie
vers le détail (contrats, recettes, fichier de la couche touchée) au lieu de
le recopier, pour que l'agent ne relise que ce dont il a besoin.

## Outils d'IA pris en charge

Claude Code, Copilot CLI, Gemini CLI et Codex : consignes, hooks et
commandes adaptés à chaque outil ; la matrice de compatibilité dit ce qui
est tenu, outil par outil, avec sa date d'essai.

## Modules optionnels

- Tableau de bord HTML statique de l'avancement (`/drwil-progress`).
- Release (`/drwil-release`) : examen du README, des fonctionnalités et de
  la carte avant le tag, tag et note GitHub avec le tarball, ou candidate
  avec sa fiche de recette, verdict humain puis promotion ; la note de
  recette de chaque version arrive par une PR dédiée ; `release.mode` choisit
  `solo` (publication directe, par défaut) ou `team` (candidate exigée) ;
  `release.requiredOs` (absent par défaut) refuse la release et la promotion
  tant qu'un OS exigé n'a pas sa CI verte sur le commit (QUA-268).
- Suivi de la CI d'une PR (`.githooks/pr-watch.mjs`) : verte, fusionnée ou
  rouge avec le contrôle en échec.

## Vérifié en conditions réelles

Confirmé par un essai réel attesté par l'humain (`.drwil/evidence/attestations/`),
à distinguer de ce qui n'est prouvé que par les tests et la CI :

- QUA-092 (sur un dossier vide, la garantie de couverture se prouve en
  vrai) — 2026-10-22.
- QUA-069 (Copilot CLI enchaîne deux chantiers d'un seul sondage).
- QUA-064 et QUA-066 (choisir Copilot ou Gemini installe aussi leurs hooks
  natifs), QUA-067 (les hooks de Gemini parlent son format).
- La release directe : v0.6.10 publiée par `.githooks/create-release.mjs`
  avec sa note de recette, 2026-10-22.

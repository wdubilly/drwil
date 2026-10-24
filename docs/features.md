# Fonctionnalités

Ce que fait drwil, fonctionnalité par fonctionnalité, du point de vue de
la personne qui l'utilise sur son projet. Le détail des commandes est dans
`README.md` ; les invariants, dans `docs/contracts.md`.

## Installation et mise à jour (`drwil init`)

Équipe un dossier vide, un projet existant ou un projet déjà équipé, sans
jamais écraser un fichier du projet. `--dry-run` montre ce qui serait
écrit. Une mise à jour rafraîchit ce que le kit a installé et que le projet
n'a pas modifié ; sur un projet qui a déjà du code, `init` le rattache à une
fiche « code existant » pour que le premier commit passe. Un fichier du kit
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
le verdict. `drwil doctor` diagnostique l'installation, `drwil contracts`
valide le registre sans rien exécuter.

## Attestation humaine (`drwil attest`)

Un contrat `MANUAL` se valide par l'humain, dans son propre terminal ;
l'attestation est versionnée et tombe quand un fichier qu'elle couvre
change. Un agent ne l'exécute jamais.

## Cycle de chantier

État de gouvernance (cadrage, réalisation, clôture) lu par chaque agent et
rappelé par les hooks ; lancement par un sondage dont l'humain choisit la
réponse (`/drwil-start`), file de chantiers, barrière de périmètre au
commit, détour pour un défaut préalable, clôture en un geste
(`.githooks/close.mjs`) avec preuve versionnée et consommation de tokens
mesurée. Un chantier dont la PR révèle un défaut après la clôture se
rouvre d'une commande (`node .githooks/state.mjs reopen`). Une idée se note
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
que le verdict.

## Outils d'IA pris en charge

Claude Code, Copilot CLI, Gemini CLI et Codex : consignes, hooks et
commandes adaptés à chaque outil ; la matrice de compatibilité dit ce qui
est tenu, outil par outil, avec sa date d'essai.

## Modules optionnels

- Tableau de bord HTML statique de l'avancement (`/drwil-progress`).
- Release (`/drwil-release`) : examen du README, des fonctionnalités et de
  la carte avant le tag, tag et note GitHub avec le tarball, ou candidate
  avec sa fiche de recette, verdict humain puis promotion ; la note de
  recette de chaque version arrive par une PR dédiée.
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

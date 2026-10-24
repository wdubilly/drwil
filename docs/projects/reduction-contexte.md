# Projet : réduire le contexte relu par chantier

**Statut** : cadré le 2026-10-24.
**Risque** : HIGH
**Maturité** : prêt
**Intention** : note du 2026-10-24 de `docs/intentions/notes.md` (« Réduire le contexte relu par chantier sans affaiblir la gouvernance »)

<!-- scope
files:
  - packages/drwil/templates/common/base/AGENTS.md
  - AGENTS.md
  - packages/drwil/templates/common/base/.githooks/glossary.mjs
  - .githooks/glossary.mjs
  - .githooks/glossary.test.mjs
  - packages/drwil/templates/common/base/.githooks/run-checks.mjs
  - .githooks/run-checks.mjs
  - .githooks/run-checks.test.mjs
  - packages/drwil/templates/common/base/.githooks/close.mjs
  - .githooks/close.mjs
  - .githooks/close.test.mjs
  - packages/drwil/templates/common/base/.githooks/state-texts.mjs
  - .githooks/state-texts.mjs
  - .githooks/state.test.mjs
  - packages/drwil/templates/common/base/.githooks/consumption.mjs
  - .githooks/consumption.mjs
  - .githooks/consumption.test.mjs
  - packages/drwil/templates/common/base/docs/recipes/working-with-branches.md
  - docs/recipes/working-with-branches.md
  - packages/drwil/templates/common/base/docs/recipes/track-consumption-per-increment.md
  - docs/recipes/track-consumption-per-increment.md
  - packages/drwil/templates/common/tools/claude/.claude/agents/drwil-checks.md
  - .claude/agents/drwil-checks.md
  - docs/contracts.md
  - packages/drwil/CHANGELOG.md
  - docs/intentions/notes.md
  - docs/projects/pending.md
  - docs/projects/journal.md
-->

(Dépôt ou livrable (QUA-018, périmètre explicite dépôt vs gabarit) : les deux,
décision du demandeur du 2026-10-24. On n'édite que le gabarit
(`packages/drwil/templates/`), puis `npm run installer-depot` ; `AGENTS.md` et
`docs/recipes/working-with-branches.md` du dépôt ont des écarts déclarés dans
`outils/miroirs.json` et s'éditent aussi à la main.)

## 1. Besoin

Le contexte relu à chaque requête (cache lu) domine la consommation, devant
le code produit (`docs/intentions/fabrique-autonome.md`). Relevé de
`.drwil/usage.jsonl` au 2026-10-24 : 24,9 M de cache lu pour 147 requêtes
(« rouvrir après clôture », environ 170 k par requête) et 18,0 M pour 143
(« contournements complétés », environ 126 k). Un fichier lu une fois reste
dans le contexte et est relu à chaque requête suivante : `docs/contracts.md`
(181 ko, environ 45 k tokens) et `docs/projects/journal.md` (191 ko, environ
48 k tokens) lus en entier pèsent à eux seuls la moitié de ce volume. Les
sorties longues des contrôles (`run-checks`, avertissements de
`close.mjs --check`) s'y ajoutent, et une session qui enchaîne plusieurs
chantiers garde tout le contexte des précédents.

Le demandeur veut réduire ce contexte sans affaiblir la gouvernance : aucun
contrôle retiré, aucune règle moins visible pour l'agent.

## Critères d'acceptation

(contrats à créer au registre au lancement, avec leur champ **Origine**,
un par critère ci-dessous sauf l'indicateur.)

- Un agent obtient le texte complet d'un contrat par son ID, ou une entrée du
  journal par son chantier, sans lire le fichier entier ; `AGENTS.md` et les
  recettes pointent vers cette lecture ciblée, jamais vers la lecture du
  fichier entier
- Un agent obtient en une lecture courte la liste de tous les contrats (ID et
  titre, aucun omis) ; `AGENTS.md` y renvoie avant toute modification
  importante, pour identifier les contrats applicables sans connaître leur ID
- `run-checks` n'affiche en sortie que les contrôles en échec (chacun avec le
  contrat fautif, QUA-033) et une ligne de résumé ; le détail complet reste
  lisible dans un fichier, et un contrôle non exécuté reste un échec visible
  (QUA-013)
- Le résumé de `run-checks` compte les avertissements non bloquants et donne
  le chemin du fichier de détail ; un avertissement n'est jamais tu sans être
  compté
- `close.mjs --check` regroupe ses avertissements de doublon possible (une
  ligne par fichier cité, pas une par intention) ; les erreurs bloquantes
  restent toutes affichées
- Avec Claude Code, les passages longs (`run-checks`, `drwil verify`) peuvent
  tourner dans un sous-agent livré (nommé `drwil-checks`, à créer dans l'arbre `.claude` du gabarit) qui ne
  renvoie que le verdict et les échecs ; pour les autres outils, `AGENTS.md`
  donne la consigne « si l'outil le permet »
- Le sous-agent recopie mot pour mot la ligne de verdict (`GOVERNANCE: …`) et
  la liste des contrats en échec ou à attester, sans reformulation ; il n'a
  accès ni à `drwil attest` ni à l'écriture de fichiers ; la session
  principale n'annonce « vérifié » que sur cette ligne recopiée
- Après le retour en SCOPING qui suit une clôture, le rappel d'état invite à
  ouvrir une nouvelle session pour le chantier suivant, pour tous les outils ;
  la file de chantiers garde son sous-agent par chantier
- Indicateur, sans seuil (décision du demandeur) : cache lu moyen par requête
  (`.githooks/consumption.mjs`) relevé sur deux chantiers comparables après celui-ci,
  comparé aux environ 170 k du 2026-10-24, consigné au journal [humain].

## Contrats modifiés

Aucun contrat existant n'est modifié. QUA-013 (un contrôle non exécuté n'est
pas un succès), QUA-033 (un contrôle par règle, l'échec nomme sa règle) et
QUA-039 (un identifiant cité vient avec ce qu'il désigne) restent vrais tels
quels : la sortie raccourcie garde l'échec, son contrat et son libellé.
Les hooks ci-dessous changent, et le rejeu par la branche principale
(QUA-113) garde leur version de la PR : `.githooks/glossary.mjs` (lecture par ID ou par
chantier), `.githooks/run-checks.mjs` (sortie limitée aux échecs), `.githooks/close.mjs`
(avertissements regroupés), `.githooks/state-texts.mjs` (invitation à une nouvelle
session), `.githooks/consumption.mjs` (indicateur comparé).

## 2. Hors périmètre

- Raccourcir le rappel d'état (`.githooks/state.mjs`, `reminder`) au-delà de
  l'invitation à une nouvelle session : non retenu par le demandeur.
- Découper `docs/contracts.md` ou `docs/projects/journal.md` en plusieurs
  fichiers : change leur format (catalogue, contrôles qui les lisent), à
  reprendre par une intention si la lecture ciblée ne suffit pas.
- Le contexte apporté par l'outil lui-même (définitions d'outils, serveurs
  MCP, skills de l'utilisateur) : hors de drwil.
- Tout affaiblissement d'un contrôle ou d'un hook, tout seuil baissé.

## 3. Contraintes

- Modifie `.githooks/` et `.claude/` : risque HIGH (DRWIL-012, le niveau de
  risque impose les décisions et les contrats cités) ; déclarer les hooks
  modifiés dans « Contrats modifiés » dès le premier commit qui les touche
  (QUA-113).
- QUA-072 (les hooks et skills de Claude Code ne changent pas, prouvé sans
  session réelle) : le nouveau sous-agent entre dans sa preuve, sans changer
  les hooks ni les skills existants.
- Kit portable : Node seul, sorties identiques sur les trois OS.
- QUA-001 (plafond de 400 lignes) pour tout fichier touché.
- Copilot, Gemini et Codex : aucune promesse au-delà de la consigne écrite,
  tant que le banc ne l'a pas prouvée (QUA-060).

## 4. Décisions

- 2026-10-24 — Cible : le dépôt et le livrable (demandeur).
- 2026-10-24 — Leviers retenus : lecture ciblée, sorties d'outils courtes,
  contrôles en sous-agent, une session par chantier (demandeur).
- 2026-10-24 — Mesure : indicateur sans seuil, cache lu moyen par requête
  (demandeur).
- 2026-10-24 — Qualité conservée (demandeur) : trois garde-fous ajoutés aux
  critères — liste courte de tous les contrats, avertissements comptés dans
  le résumé, verdict du sous-agent recopié mot pour mot et sans accès à
  l'attestation.

## 5. Points à trancher

(aucun)

## 6. Increments

- **Lot 1 — lecture ciblée** [IA] : `.githooks/glossary.mjs` rend le texte complet
  d'un contrat par ID, la liste ID et titre de tous les contrats, et une
  entrée de journal par chantier ; `AGENTS.md` (gabarit et
  dépôt) et les recettes y renvoient. Critère de sortie : critère de lecture
  ciblée vert, tests de `.githooks/glossary.mjs` verts.
- **Lot 2 — sorties courtes** [IA] : `run-checks` limité aux échecs et au
  résumé, détail dans un fichier ; avertissements de `close.mjs --check`
  regroupés. Critère de sortie : critères de sortie
  courte verts,
  `node .githooks/run-checks.mjs` OK.
- **Lot 3 — sous-agent et session par chantier** [IA] : sous-agent
  `drwil-checks` livré pour Claude Code, consigne pour les autres outils,
  invitation à une nouvelle session après la clôture. Critère de sortie :
  critères de
  sous-agent et de session verts, preuve QUA-072 à jour.
- **Lot 4 — relevé** [humain] : cache lu moyen par requête sur deux
  chantiers comparables, consigné au journal. Critère de sortie : relevé
  écrit (indicateur, sans seuil).

## 7. Reprise

- **Dernier état** (2026-10-24) : cadré ; rien de commencé.
- **Travail non commité** : la fiche et sa ligne d'index.
- **Prochaine étape** : [humain] lancer le chantier (`/drwil-start`).

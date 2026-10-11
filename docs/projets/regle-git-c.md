# Projet : recalibrer le refus de `git -c` dans les réglages Claude livrés

**Statut** : cadré le 2026-10-11 — décision prise, lot 1 à lancer.
**Risque** : HIGH

<!-- cadrage
fichiers:
  - packages/drwil/templates/common/tools/claude/.claude/settings.json
  - .claude/settings.json
  - packages/drwil/test/kit.test.mjs
-->

(cadrage : le livrable et sa copie du dépôt, identiques — QUA-018
(périmètre explicite : dépôt drwil vs livrable gabarit) : les deux sont
visés, le contrôle `miroirs-gabarit` les garde identiques. HIGH par choix :
une règle de permission de sécurité livrée à tous les projets.)

## 1. Besoin

Vague 1 de la feuille de route (`docs/projets/en-attente.md`, 2026-10-11).
La règle de refus `Bash(git *-c *)` des réglages Claude livrés vise
l'option globale `git -c clé=valeur`, qui permet d'exécuter une commande
arbitraire (`core.sshCommand`, `core.fsmonitor`…). Mais le `*` remplace
n'importe quel texte : elle refuse aussi `git switch -c <branche>` et
`git commit -c <commit>`, inoffensifs, et même une commande dont un texte
cité (un document écrit par heredoc) contient ces mots. Constaté le
2026-10-11 dans ce dépôt : chaque création de branche passait par une
exception accordée par le demandeur — l'habitude que QUA-019 veut éviter.
Tous les projets qui installent drwil avec Claude ont le même blocage.

## 2. Hors périmètre

- Les autres règles de refus git (`--exec-path`, `--upload-pack`…) : options
  globales ou de transport, sans faux positif connu.
- Le hook `.claude/hooks/garde-fou-bash.mjs` : il ne traite pas git.

## 3. Contraintes

- Faits vérifiés le 2026-10-11 dans la documentation de Claude Code
  (page « Configure permissions ») : le `*` d'une règle Bash remplace
  n'importe quel texte ; les règles s'évaluent dans l'ordre refus, demande,
  autorisation, et la première qui correspond l'emporte.
- Toutes les autorisations git des réglages sont des préfixes de
  sous-commande (`git status:*`, `git commit:*`…) : un `-c` placé avant la
  sous-commande ne correspond à aucune autorisation, donc Claude Code
  demande l'accord de la personne. Un `-c` après la sous-commande est une
  option de celle-ci.
- Livrable et dépôt modifiés ensemble (contrôle des miroirs).

## 4. Décisions

- **2026-10-11 — Refuser `git -c *` seul** : refus quand `-c` suit
  directement `git` ; après une autre option globale (`git -C dossier -c …`),
  aucune autorisation ne correspond et Claude Code demande l'accord.
  `git switch -c` et `git commit -c` redeviennent possibles. [décision
  utilisateur]

## Contrats concernés

- **QUA-019** — Pas de contournement d'un contrôle : un contrôle mal
  calibré se corrige, il ne se contourne pas.
- **QUA-018** — Périmètre explicite : dépôt drwil vs livrable gabarit.

## 5. Points à trancher

- ~~Forme de la règle~~ — tranchée le 2026-10-11 (voir « Décisions »).

## 6. Lots

- **Lot 1 — règle recalibrée** [IA] : `Bash(git *-c *)` remplacé par
  `Bash(git -c *)` dans les réglages livrés et dans ceux du dépôt ;
  commentaire des réglages mis à jour ; test du paquet : la règle livrée
  refuse `git -c …` en tête et ne contient plus le motif large. Critère de
  sortie : tests verts, miroirs identiques, et dans une session Claude Code
  sur ce dépôt la création d'une branche passe sans exception.

## 7. Reprise

- **Dernier état** (2026-10-11) : fiche cadrée, rien de réalisé.
- **Travail non commité** : aucun.
- **Prochaine étape** : [humain] `/drwil-lancer`.

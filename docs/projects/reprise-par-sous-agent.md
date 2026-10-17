# Projet : une file de chantiers menée par sous-agents, un contexte neuf par chantier

**Statut** : cadré le 2026-10-17.
**Risque** : HIGH
**Maturité** : prêt
**Intention** : `docs/intentions/reprise-automatique.md`

<!-- scope
files:
  - packages/drwil/templates/common/tools/claude/.claude/skills/start-a-workstream/SKILL.md
  - packages/drwil/templates/common/base/.githooks/state-texts.mjs
  - packages/drwil/templates/common/base/.githooks/consumption.mjs
  - packages/drwil/templates/common/base/AGENTS.md
  - AGENTS.md
  - .githooks/state.test.mjs
  - .githooks/consumption.test.mjs
  - packages/drwil/test/kit.test.mjs
  - docs/contracts.md
  - packages/drwil/CHANGELOG.md
-->

(cadrage : la skill de lancement et les textes de l'état, qui disent comment
mener la file ; la mesure de consommation ; la règle « file de chantiers »
d'`AGENTS.md`, livrée et propre au dépôt ; leurs tests ; le registre
(QUA-037 et QUA-042 évoluent) ; le changelog. Les copies installées du
dépôt suivent le gabarit (`scopeMirrors`).)

## 1. Besoin

Dans une file de chantiers menée dans une seule session, plus de 90 % du
coût est du contexte relu (mesuré le 2026-10-17, `.drwil/usage.jsonl` : le
cache lu moyen par requête passe de 259 000 tokens au premier chantier à
595 000 au cinquième). Le demandeur veut une reprise automatique : chaque
chantier part d'un contexte neuf, sans geste humain entre deux chantiers ;
s'il y a une suivante on continue, sinon on s'arrête.

`/clear` ne s'automatise pas (commande de l'humain) : le contexte neuf vient
d'un sous-agent par chantier, la session principale ne fait que piloter la
file.

## Critères d'acceptation

- Avec Claude Code, la skill de lancement et le rappel d'état d'une file
  disent de mener chaque chantier dans un sous-agent (contexte neuf), dont
  la consigne commence par lire l'état (`node .githooks/state.mjs`) ; la
  session principale garde seulement les comptes rendus — `QUA-037`
- La session principale suit la PR par `gh` jusqu'à la fusion, 30 minutes
  au plus, puis lance la suivante (`next`) dans un nouveau sous-agent, ou
  s'arrête et fait le bilan s'il n'y en a plus ; CI rouge, délai dépassé ou
  chantier qui demande un humain : arrêt avec le motif, jamais de suivante
  sur une fusion non faite — `QUA-037`
- Une file reprise dans une nouvelle session (après `/clear` ou un
  redémarrage) : le rappel d'état fait demander à l'agent une confirmation
  explicite (« la file reprend avec <fiche> : je lance ? ») avant `next` ;
  sans oui explicite, rien n'est lancé — `QUA-037`
- Hors file, le rappel de clôture fait terminer l'agent en proposant
  `/clear` avant la prochaine demande — `QUA-037`
- La mesure de consommation affiche, par chantier, le cache lu moyen par
  requête — `QUA-042`
- Le changelog (« Unreleased ») le dit — `QUA-040`

## Contrats modifiés

- `QUA-037` — ancien critère : la skill, la recette de clôture et
  `AGENTS.md` disent d'attendre la fusion avant la suivante, sans dire où
  mener chaque chantier — raison : un sous-agent par chantier (Claude Code),
  suivi de la fusion borné à 30 minutes, confirmation explicite avant de
  reprendre une file dans une nouvelle session, `/clear` proposé à la
  clôture hors file ; rien n'est retiré (validé le 2026-10-17 par le demandeur, sondage
  et conversation).
- `QUA-042` — ancien critère : quatre catégories de tokens, total pondéré,
  temps actif, modèles — raison : ajouter le cache lu moyen par requête,
  pour que le coût du contexte se voie ; rien n'est retiré (validé le
  2026-10-17 par le demandeur, sondage).

## 2. Hors périmètre

- Les autres agents (Copilot CLI, Codex, Cursor, Gemini) : ils gardent la
  file dans une seule session ; à vérifier un par un plus tard (décision
  du 2026-10-17).
- Le format de `.drwil/usage.jsonl` et le tableau de bord : la moyenne est
  affichée au relevé, pas enregistrée.
- Un `/clear` déclenché par l'agent ou un hook (impossible) ; une session
  lancée en arrière-plan par un hook (écartée : invisible pour l'humain).

## 3. Contraintes

- Un sous-agent ne reçoit aucun rappel d'état au démarrage (vérifié le
  2026-10-17) : sa consigne doit lui faire lire l'état lui-même.
- Un sous-agent ne peut pas interroger l'humain : il s'arrête et rend la
  main, la session principale le dit (règle actuelle de la file).
- Un seul état, `.drwil/state.json` (si présent), partagé par la session
  principale et le sous-agent : le sous-agent travaille dans le dossier du
  dépôt, jamais dans une copie isolée (worktree git) — l'état y est absent,
  ignoré par Git, et le sous-agent se croirait en SCOPING sans chantier.
- Un sous-agent à la fois, jamais deux chantiers en parallèle : la session
  principale ne change pas l'état pendant qu'il travaille ; elle le relit à
  son retour.
- Lancer une file reste une décision humaine (sondage de `/drwil-start`) :
  inchangé.

## 4. Décisions

- 2026-10-17 (demandeur, conversation) : un sous-agent par chantier ; la
  session principale pilote la file.
- 2026-10-17 (demandeur, sondage) : hors file, proposer `/clear` à la
  clôture ; afficher le cache lu moyen par requête ; Claude Code d'abord ;
  suivi de la fusion par `gh`, 30 minutes au plus.
- 2026-10-17 (demandeur, sondage) : une file reprise dans une nouvelle
  session attend une confirmation explicite de l'humain avant `next` (un
  « continu » ambigu a lancé un chantier ce jour-là).

## 5. Points à trancher

- Aucun : tous tranchés le 2026-10-17 (section 4).

## 6. Increments

- **Lot 1** [IA] : tests d'abord (textes de la skill et du rappel de file,
  confirmation à la reprise, rappel de clôture hors file, moyenne du cache lu), puis la skill, les
  textes de l'état, `AGENTS.md` (gabarit et dépôt), la mesure de
  consommation, QUA-037 et QUA-042, le changelog ; PR. Critère de sortie :
  tests verts, `drwil verify` PASS.

## 7. Reprise

- **Dernier état** (2026-10-17) : cadré, prêt ; rien de commencé.
- **Travail non commité** : cette fiche, l'intention et l'index.
- **Prochaine étape** : [humain] lancer le chantier (`/drwil-start`).

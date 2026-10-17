# Intention : une reprise automatique à la clôture — contexte neuf entre deux chantiers

**Statut** : proposée le 2026-10-17 — demande du demandeur (« je veux
automatiser la reprise »), après le constat sur la consommation de tokens.
Revue le 2026-10-17 : voie retenue par le demandeur, un sous-agent par
chantier.

## Besoin

Mesuré le 2026-10-17 (`.drwil/usage.jsonl`) : dans une file de chantiers
menée dans une seule session, le total pondéré est fait à plus de 90 % de
cache relu — toute la conversation relue à chaque appel. Le cache lu
moyen par requête est passé de 259 000 tokens (premier chantier de la
journée) à 595 000 (cinquième) ; le travail propre d'un chantier n'écrit
que 12 000 à 58 000 tokens. Un chantier mené dans un contexte neuf
coûterait plusieurs fois moins.

Le demandeur veut automatiser la reprise : à la clôture d'un chantier,
préparer la session suivante et repartir d'un contexte neuf, sans perdre
la file ni la passation.

## Existant (vérifié le 2026-10-17)

- Passation déjà en place : section « Reprise » des fiches (contrôlée par
  QUA-015, chantiers exploitables à froid), journal condensé à la clôture,
  état et file dans `.drwil/state.json` (si présent).
- `.claude/settings.json` : le hook `SessionStart` (sans filtre) lance
  `node .githooks/state.mjs`, qui affiche l'état et, s'il y a une file,
  « lancer la suivante : `node .githooks/state.mjs next` ».
- `/clear` est une commande de l'humain : ni un hook ni l'agent ne peuvent
  la déclencher (aucune exception connue ; à confirmer au cadrage).
- `SessionStart` se déclenche après `/clear` (source « clear ») et
  réinjecte l'état et la file : vérifié le 2026-10-17 dans ce dépôt. Sur
  ce rappel, un simple « continu » de l'humain, qui voulait affiner cette
  intention, a suffi à lancer le chantier en tête de file : un message
  ambigu ne doit pas lancer un chantier.
- La consommation par chantier (`node .githooks/consumption.mjs`) connaît
  le cache lu par requête.

## Décision

- 2026-10-17 (demandeur, en conversation) : la reprise est automatique, sans
  geste humain entre deux chantiers. Puisque `/clear` ne s'automatise pas,
  le contexte neuf vient d'**un sous-agent par chantier** :
  1. La session principale pilote seulement la file : elle lance le
     chantier en tête de file dans un sous-agent (contexte neuf).
  2. Le sous-agent réalise le chantier, le clôt, programme la fusion et
     rend un compte rendu court.
  3. Une fois la fusion faite, s'il y a une suivante (`next`), la session
     principale la lance dans un nouveau sous-agent ; sinon elle s'arrête
     et fait le bilan de la file.
  4. Arrêt au premier chantier qui demande un humain (attestation, FAIL
     non corrigé, CI rouge, décision) : le sous-agent rend la main, la
     session principale le dit.
- Écartés : un `/clear` demandé à l'humain entre deux chantiers (reste un
  geste) ; une nouvelle session lancée en arrière-plan par un hook
  (invisible pour l'humain).
- 2026-10-17 (demandeur, sondage) : à la clôture d'un chantier seul (hors
  file), l'agent termine en proposant `/clear` avant la prochaine demande.
- 2026-10-17 (demandeur, sondage) : la mesure de consommation affiche le
  cache lu moyen par requête, pour que le coût du contexte se voie.
- 2026-10-17 (demandeur, sondage) : Claude Code d'abord ; les autres
  agents (Copilot CLI, Codex, Cursor, Gemini) prennent le même pilotage là
  où ils ont des sous-agents, vérifiés un par un, sinon la file reste menée
  dans une seule session.
- 2026-10-17 (demandeur, sondage) : la session principale suit la PR par
  `gh` jusqu'à la fusion, 30 minutes au plus ; CI rouge ou délai dépassé :
  arrêt, avec le motif ; jamais de chantier suivant sur une fusion non
  faite.

## Questions à trancher

- Toutes tranchées le 2026-10-17 (section « Décision » ; la confirmation
  avant de reprendre une file dans une nouvelle session est dans la fiche
  `docs/projects/reprise-par-sous-agent.md`).

## Vérifications à faire avant de cadrer

- ~~Un sous-agent a-t-il les mêmes hooks et permissions ?~~ Vérifié le
  2026-10-17 par deux essais (sous-agent de Claude Code, état SCOPING) :
  - la barrière de cadrage (hook `PreToolUse`) s'applique : écrire
    un fichier d'essai sous .githooks/, couvert par aucune fiche, est refusé avec
    le même message que dans la session principale ;
  - `node .githooks/state.mjs`, `drwil --version` et `gh auth status`
    s'exécutent sans refus ;
  - en revanche, le sous-agent ne reçoit **aucun rappel d'état au
    démarrage** (ni `SessionStart` ni `UserPromptSubmit` : il n'a pas de
    saisie humaine). Le premier geste du sous-agent est donc de lancer
    lui-même `node .githooks/state.mjs` (déjà la règle d'`AGENTS.md`), et
    la consigne que lui donne la session principale doit le dire.
- ~~La consommation d'un sous-agent est-elle comptée ?~~ Oui, vérifié le
  2026-10-17 : ses journaux (`<session>/subagents/*.jsonl`) sont lus par
  `node .githooks/consumption.mjs`, qui parcourt les sous-dossiers ; chaque
  réponse y porte ses tokens et la branche git du moment, qui l'attribue
  au chantier. À confirmer sur un vrai chantier : la branche notée suit
  celle que le sous-agent a créée.

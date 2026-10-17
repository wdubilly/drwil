# Intention : une reprise automatique à la clôture — contexte neuf entre deux chantiers

**Statut** : proposée le 2026-10-17 — demande du demandeur (« je veux
automatiser la reprise »), après le constat sur la consommation de tokens.

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
  la déclencher. D'après la documentation de Claude Code, `SessionStart`
  se déclenche aussi après `/clear` (source « clear ») : **non vérifié**
  dans ce dépôt.
- La consommation par chantier (`node .githooks/consumption.mjs`) connaît
  le cache lu par requête.

## Piste proposée par l'agent

1. À la clôture, une fois la PR fusionnée, l'agent ne lance pas la fiche
   suivante dans la même session : il vérifie que la passation est écrite
   (journal, état, file) et s'arrête sur « tape `/clear` : la file
   reprend avec un contexte neuf ».
2. Après `/clear`, le hook de démarrage réinjecte l'état et la file ; au
   premier message de l'humain, l'agent lance la suivante (`next`) sans
   nouveau sondage.

## Questions à trancher

- [décision] Toujours demander le `/clear` entre deux chantiers d'une
  file, ou seulement au-delà d'un seuil (cache lu moyen par requête, par
  exemple 200 000 tokens) ?
- [décision] Après `/clear`, l'agent attend un message de l'humain
  (« continue ») ou le hook de démarrage suffit-il à lui faire lancer la
  suivante dès le premier message, quel qu'il soit ?
- [décision] Aussi hors file : proposer `/clear` à toute clôture ?
- [décision] Afficher dans la mesure de consommation le cache lu moyen par
  requête, pour que le coût du contexte se voie ?

## Vérifications à faire avant de cadrer

- `SessionStart` se déclenche-t-il après `/clear` dans cette version de
  Claude Code, et avec quel texte ? Test prévu par le demandeur le
  2026-10-17 (fin de la file « npm init -y »).

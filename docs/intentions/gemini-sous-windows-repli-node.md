# Intention : un message de repli pour les hooks de Gemini sous Windows

**Statut** : proposée le 2026-11-02 — limite du chantier `hooks-sans-dependance-au-shell`.

## Besoin

Sous Windows, un hook de Gemini CLI lancé sans `node` dans le `PATH` de l'assistant n'écrit pas la piste à suivre
(« node not found in the PATH of this assistant… ») que Claude Code, Copilot et Gemini hors Windows écrivent.

## Existant (relevé le 2026-11-02)

- Hors Windows, `init` écrit des commandes qui passent par le lanceur `.gemini/hooks/drwil-node.sh`
  (`packages/drwil/src/render-gemini.ts`, règle QUA-215).
- Sous Windows la commande reste `node …` seul : le champ `command` de Gemini est lu par PowerShell sous Windows et
  par `bash -c` ailleurs, et aucune forme unique n'est sûre pour les deux (`||` manque à Windows PowerShell 5.1).
- Gemini lit déjà le code 127 comme un refus dont la raison est « node: command not found », sans la marche à suivre.
- Le réglage est versionné : une équipe qui mélange les systèmes garde la forme du système qui a lancé `init`.
- La limite est dite dans `INSTALL.md`.

## Questions à trancher

- [décision] Un lanceur PowerShell (`.ps1`) écrit par `init` sous Windows, ou un lanceur `node`-indépendant unique
  (un `.cmd`), vaut-il l'effort pour un seul assistant ?
- [décision] Comment prouver la forme Windows : aucune étape de la CI ne joue aujourd'hui un hook Gemini sous Windows.
- [décision] Faut-il que `init` écrive les deux formes dans deux réglages selon le système de chaque développeur ?

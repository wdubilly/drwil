# Preuve de clôture — hooks-sans-dependance-au-shell

**Clos le** : 2026-11-02
**Commit vérifié** : `b2680e27cb` — verdict `drwil verify` : PASS
**Critères acceptés** : empreinte `sha256:078a90e2ac411eec`, acceptés par l'humain au lancement le 2026-11-02

critères de ce chantier, et ce qui les prouve aujourd'hui encore (rejoués par `drwil verify` après la clôture) :

| Critère | Contrat | Contrôle | Empreinte des fichiers couverts |
|---|---|---|---|
| Un hook d'assistant lancé sans node dans le PATH dit en clair que node est introuvable et quoi faire, au lieu d'un 127 muet, pour tous les assistants livrés (Claude Code, Copilot, Gemini) | `QUA-215` | `tests-qua-215` | — |
| Ce message ne change ni le refus ni le format de sortie des hooks quand node est présent : le fail-closed des gardes de Claude Code est conservé (QUA-019), et les hooks de Copilot ne bloquent toujours jamais (QUA-065) | `QUA-216` | `tests-qua-216` | — |
| Les tests du moteur passent sans node dans le PATH système, donc sous fnm : aucun ne suppose un node dans /usr/bin | `QUA-217` | `tests-qua-217` | — |
| Le prérequis (node dans le PATH du processus de l'assistant) et le piège fnm sont décrits dans INSTALL.md — [humain] | `QUA-218` | — | `sha256:19c66ae72f68fb65` (1 fichier(s)) |

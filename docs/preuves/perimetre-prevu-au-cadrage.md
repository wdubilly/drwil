# Preuve de clôture — perimetre-prevu-au-cadrage

**Clos le** : 2026-11-16
**Commit vérifié** : `c1927e9fcb` — verdict `drwil verify` : PASS
**Critères acceptés** : empreinte `sha256:49eff6d2ffcc5645`, acceptés par l'humain au lancement le 2026-11-16

critères de ce chantier, et ce qui les prouve aujourd'hui encore (rejoués par `drwil verify` après la clôture) :

| Critère | Contrat | Contrôle | Empreinte des fichiers couverts |
|---|---|---|---|
| En BUILD, la barrière de périmètre (.githooks/scope-gate.mjs, à la validation et au rejeu de la branche), le rappel de cadrage de check-docs et la garde d'écriture de l'agent (.claude/hooks/scope-reminder.mjs) admettent d'office, comme s'il était au bloc scope, un fichier dérivé d'un fichier du scope de la fiche active, et seulement l'un de ces quatre cas : (1) un fichier de test dont le texte importe ou cite le chemin d'un module couvert par le scope ; (2) un fichier cité aux champs **Périmètre** ou **Tests** d'un contrat que la fiche cite (critères ou « Contrats modifiés ») ; (3) un fichier neuf sur la branche, dans le dossier d'un fichier du scope, dont le nom commence par le nom de ce fichier suivi d'un tiret, et que ce fichier importe (sa découpe) ; (4) la source de gabarit d'une copie citée (sens inverse de scopeMirrors) | `QUA-311` | `tests-qua-311` | — |
| Aucun fichier de règles n'est admis d'office : registre des contrats, fichiers de rulesFiles (.githooks/detour-rules.mjs : hooks hors tests, .drwil/ia-first.json, CI, et leurs sources de gabarit), consignes des assistants (AGENTS.md de toute couche, CLAUDE.md, GEMINI.md, docs/ia-first.md, docs/ia-first/), réglages et hooks des assistants (.claude/, .gemini/, .github/hooks/) ; un tel fichier hors du scope reste refusé comme aujourd'hui, et le refus dit qu'il est un fichier de règles | `QUA-312` | `tests-qua-312` | — |
| Chaque admission est dite au commit qui l'utilise (avertissement qui nomme le fichier, le cas et le fichier du scope dont il dérive, affiché quel que soit le réglage scopeGate, jamais un échec à lui seul) ; à la clôture, node .githooks/close.mjs compte les fichiers de la branche admis d'office et écrit leur nombre et leur liste dans l'entrée du journal du chantier ; --check les annonce sans rien écrire | `QUA-313` | `tests-qua-313` | — |
| Le rappel de cadrage reste vrai pour tout autre fichier : un fichier de code jamais cité ni dérivé est refusé | `QUA-016` | `docs-references`, `tests-qua-016` | — |
| Après la clôture, jusqu'à la fusion, un fichier admis d'office par la fiche supprimée reste couvert comme ceux qu'elle citait ; un fichier jamais cité ni dérivé reste refusé | `QUA-173` | `tests-qua-173` | — |

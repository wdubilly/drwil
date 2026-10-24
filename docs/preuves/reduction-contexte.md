# Preuve de clôture — reduction-contexte

**Clos le** : 2026-10-24
**Commit vérifié** : `2b92a5ebf9` — verdict `drwil verify` : PASS

critères de ce chantier, et ce qui les prouve aujourd'hui encore (rejoués par `drwil verify` après la clôture) :

| Critère | Contrat | Contrôle | Empreinte des fichiers couverts |
|---|---|---|---|
| Un agent obtient le texte complet d'un contrat par son ID, ou une entrée du journal par son chantier, sans lire le fichier entier ; AGENTS.md et les recettes pointent vers cette lecture ciblée, jamais vers la lecture du fichier entier | `QUA-124` | `tests-qua-124` | — |
| Un agent obtient en une lecture courte la liste de tous les contrats (ID et titre, aucun omis) ; AGENTS.md y renvoie avant toute modification importante, pour identifier les contrats applicables sans connaître leur ID | `QUA-125` | `tests-qua-125` | — |
| run-checks n'affiche en sortie que les contrôles en échec (chacun avec le contrat fautif, QUA-033) et une ligne de résumé ; le détail complet reste lisible dans un fichier, et un contrôle non exécuté reste un échec visible (QUA-013) | `QUA-126` | `tests-qua-126` | — |
| Le résumé de run-checks compte les avertissements non bloquants et donne le chemin du fichier de détail ; un avertissement n'est jamais tu sans être compté | `QUA-127` | `tests-qua-127` | — |
| close.mjs --check regroupe ses avertissements de doublon possible (une ligne par fichier cité, pas une par intention) ; les erreurs bloquantes restent toutes affichées | `QUA-128` | `tests-qua-128` | — |
| Avec Claude Code, les passages longs (run-checks, drwil verify) peuvent tourner dans un sous-agent livré (nommé drwil-checks, à créer dans l'arbre .claude du gabarit) qui ne renvoie que le verdict et les échecs ; pour les autres outils, AGENTS.md donne la consigne « si l'outil le permet » | `QUA-129` | `tests-qua-129` | — |
| Le sous-agent recopie mot pour mot la ligne de verdict (GOVERNANCE: …) et la liste des contrats en échec ou à attester, sans reformulation ; il n'a accès ni à drwil attest ni à l'écriture de fichiers ; la session principale n'annonce « vérifié » que sur cette ligne recopiée | `QUA-130` | `tests-qua-130` | — |
| Après le retour en SCOPING qui suit une clôture, le rappel d'état invite à ouvrir une nouvelle session pour le chantier suivant, pour tous les outils ; la file de chantiers garde son sous-agent par chantier | `QUA-131` | `tests-qua-131` | — |
| Avec Claude Code, la lecture entière de docs/contracts.md ou de docs/projects/journal.md est refusée avant qu'elle ait lieu (outil Read sans plage, cat/less/more du fichier dans une commande shell), avec un renvoi vers node .githooks/glossary.mjs --contract <ID>, --contracts et --journal <chantier> ; une lecture par plage et une recherche restent permises ; AGENTS.md le dit | `QUA-132` | `tests-qua-132` | — |

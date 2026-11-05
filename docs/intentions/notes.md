# Intention : notes en vrac

**Statut** : ouverte en permanence — notes rangées le 2026-11-05 (rangement du backlog).

## Besoin

Consigner une idée ou une intention d'une ligne à n'importe quel moment, y compris en plein chantier, sans la
cadrer ni la coder : `node .githooks/note.mjs "<texte>"`. Une note est toujours une intention, jamais un ordre
de coder. Quand elle mûrit, elle est promue en fiche d'intention et sa ligne est retirée d'ici.

## Existant

Relevé le 2026-10-21 : les notes sont ci-dessous, une ligne datée chacune, hors de l'index des chantiers.

## Questions à trancher

- [décision] Promouvoir en intention les notes qui ont mûri, et retirer les autres.

## Notes
- 2026-10-27 — Contrôler de façon déterministe que le corps d'une PR suit .github/pull_request_template.md (titres présents), en CI ou hook : aujourd'hui seule la consigne à l'agent l'impose (écart constaté sur la PR #273 du chantier plafond-200-lignes).
- 2026-10-29 — Garde d'écriture sur .drwil/evidence/acceptance.json : un agent peut encore écrire à la main l'acceptation des critères (limite de QUA-175, gardes d'écriture des hooks d'agent hors périmètre du chantier cycle-de-vie-des-fiches). À cadrer : refuser toute écriture de ce fichier par un outil d'agent, ou la détecter à la clôture.
- 2026-10-29 — Au cadrage, repérer un critère d'acceptation marqué [humain] qui serait vérifiable par une machine (texte conservé, renvois valides…) et proposer un contrôle à la place, selon la règle de conception de docs/ia-first.md section 3 (une preuve humaine est le prochain contrôle à outiller). Vu sur ia-first-en-sections-courtes, 2026-10-29.
- 2026-10-29 — Les docs que le kit fait produire par l'agent (docs/audit-risks.md, docs/value-discovery.md, fiches, journal…) n'ont aucun plafond de taille ; les faire entrer sous un plafond bloquant, car des agents les relisent (souhait du demandeur, 2026-10-29). Les fichiers du kit installés chez l'adoptant restent en avertissement.
- 2026-10-29 — Sous Copilot CLI, le champ fiche du sondage /drwil-start en choix multiple (type array, items.enum) revenait vide malgré la case cochée ; le skill prescrit désormais le choix unique (QUA-180), mais la cause n'est pas établie et une file de plusieurs fiches ne se coche plus d'un seul sondage (limites du journal, retour-scoping-branche-sondage, 2026-10-29). À reproduire avant de cadrer.
- 2026-11-02 — Idée à mettre à l'épreuve : faire systématiquement le build ou la doc/le cadrage dans un worktree, pour pouvoir cadrer et documenter en cours de build sans déranger le build.
- 2026-11-03 — « ok mais dans une session on pourra retrouver la meme failel » — Renforcer QUA-222 (parité entre outils) : déclarer un écart dans la matrice ne doit pas suffire à livrer sans parité ; exiger une autorisation humaine explicite et un contrôle bloquant, pour protéger aussi les prochaines sessions.
- 2026-11-05 — La barrière de périmètre, en mode bloquant, refuse un commit par « N fichier(s) hors fiches commité(s) en SCOPING » sans nommer les fichiers : à la mise à jour du kit (0.11.0), le demandeur n'en voyait qu'un sur deux ; nommer chaque fichier refusé (relevé au chantier empreinte des fichiers complétés par init, cause distincte, non corrigé)
- 2026-11-05 — La réouverture (node .githooks/state.mjs reopen) est refusée quand la clôture a retiré l'intention d'origine : la fiche restaurée la cite, le contrôle des chemins cités refuse le commit ; il a fallu restaurer l'intention à la main (relevé au chantier empreinte des fichiers complétés par init, PR #360)
- 2026-11-05 — Le message usage de state.mjs ne cite pas la commande resume (puce QUA-137 limitée aux messages ajoutés) ; seule docs/projects/ est cherchée par resume, un détour ne se reprend pas ; le lot repris est le dernier commité (trailer Drwil-Lot), un lot next sans commit suivant ne se voit pas dans l'historique (relevé au chantier reprise-d-etat-sur-un-autre-clone)
- 2026-11-05 — Attestation par sondage Claude Code (.claude/hooks/attest-poll.mjs) refusée en réel le 2026-11-05 sur QUA-067 malgré « Attester » : la préparation est acceptée en PreToolUse, puis la confirmation PostToolUse refuse. Cause probable : Claude Code ajoute answers (et annotations ?) à tool_input après la réponse, donc Object.keys(tool_input).length !== 1 et serialise(pending.poll) !== serialise(tool_input) ; les tests (claude-hooks.test.mjs) gardent tool_input inchangé et ne le voient pas.
- 2026-11-05 — Sur GOVERNANCE: MANUAL REVIEW REQUIRED, le kit fait relayer à l'agent la commande de terminal « drwil attest <ID> » (skill drwil, SKILL.md, et règle « Human gestures » de docs/ia-first/8-conduct-rules.md, plus consigne des sous-agents) au lieu de proposer d'abord le sondage dans le chat (drwil attest-poll, QUA-235) quand l'outil en a un ; la commande de terminal ne devrait être que le repli. Constaté le 2026-11-05 : l'agent a proposé le terminal, le demandeur veut que ce soit une règle du kit, pas une mémoire de l'agent.

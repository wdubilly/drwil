# Intention : notes en vrac

**Statut** : ouverte en permanence — notes rangées le 2026-11-07 (rangement du backlog).

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
- 2026-11-05 — Traiter les limites pendant le chantier plutôt qu'en fiches d'intention à la clôture : une limite dans le cadre de la fiche (scope, contrats déclarés) se traite sur le champ ; une limite hors cadre déclenche, dès qu'elle est trouvée, la question à l'humain « traiter maintenant (cadrage élargi sur son oui) ou noter » ; la fiche d'intention ne naît que d'un report choisi ou d'un travail trop gros. Exemple du 2026-11-05 : l'aide de state.mjs ne cite pas resume, faute d'une puce un peu plus large.
- 2026-11-06 — Réutilisation fiable des preuves (livrable) : une clôture rejoue le même arbre 4 à 6 fois (run-checks, verify --evidence, hooks des commits de journal et de clôture, pre-push, CI). verify --evidence ne reprend aucun verdict (« per-check reuse: not a closing proof »). Prouver les dépendances réelles de chaque contrôle, laisser verify --evidence reprendre un verdict dont fichiers et commande n'ont pas changé, lier la preuve au commit poussé. Réunir reprise-par-controle-limites, pre-push-commit-pousse et la mesure de suivi-ci-et-contexte. Constaté le 2026-11-06, machine saturée par deux clôtures en parallèle.
- 2026-11-06 — Faux positif de la barrière de réouverture : un changement qui ne touche qu'un test y est traité comme un changement de règle et attend le oui de l'humain. Relevé à la réouverture du chantier ci-rapide-pour-la-doc (PR #366). À reproduire avant de cadrer.
- 2026-11-07 — controle-lent-chemin-critique : ne le faire que si la durée de la CI d une PR freine les files (mesure via la décision P1 « suivre la durée de la CI »). Risque : « tout est critique » annule le gain ; préférer, par contrôle lent, les chemins dont il dépend (tarball ← packages/drwil, couverture hooks ← .githooks), le passage complet après fusion (QUA-251) en filet. Gain seulement en CI une fois controle-lent-une-seule-fois-en-ci fait.
- 2026-11-07 — Tests de contrat plus rapides, après mesure du lot 3 de controle-lent-une-seule-fois-en-ci : profiler d abord (coût préparation vs test, démarrage par processus). Piste 1 prioritaire : jouer chaque fichier de tests une seule fois et répartir les résultats par ID de contrat (verdict par contrat gardé, QUA-033) au lieu de 232 lancements node --test filtrés. Piste 2 : préparer une fois et copier (projet init depuis le gabarit en cache par empreinte, dépôt git modèle copié par test). Piste 3 : moins d appels git par test, vérifier --test-concurrency.
- 2026-11-07 — Complément à la note « Tests de contrat plus rapides » : valable pour le dépôt ET le livrable (gabarit packages/drwil/templates/, run-checks et moteur installés chez l adoptant) ; le gain et les garanties (un verdict par contrat, isolation des tests) doivent tenir des deux côtés (QUA-018).
- 2026-11-07 — attestation-chat-essais-reels : premier essai réel sous Claude Code le 2026-11-07 (QUA-013, chantier controle-lent-une-seule-fois-en-ci) : préparation drwil attest-poll et PreToolUse passés, réponse « Attester » refusée au PostToolUse par .claude/hooks/attest-poll.mjs (« sondage d attestation refusé … aucune attestation enregistrée », sans exception) ; cause à reproduire (tool_input relu après réponse ou forme de tool_response.answers) ; attestation faite au terminal en repli. Fiche de correction à ouvrir.
- 2026-11-07 — pr-watch montre la CI en temps réel : jobs et étapes avec leur durée (en cours depuis N s), comme gh api actions/jobs, sans enchaîner gh à la main ; GitHub et GitLab, dépôt et livrable.

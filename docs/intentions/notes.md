# Intention : notes en vrac

**Statut** : ouverte en permanence — notes rangées le 2026-10-30 (rangement du backlog).

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
- 2026-10-29 — Sous Copilot CLI, le champ fiche du sondage /drwil-start en choix multiple (type array, items.enum) revenait vide malgré la case cochée ; le skill prescrit désormais le choix unique (QUA-180), mais la cause n'est pas établie et une file de plusieurs fiches ne se coche plus d'un seul sondage (limites du journal, retour-scoping-branche-sondage, 2026-10-29). À reproduire avant de cadrer.
- 2026-10-29 — Garde d'écriture sur .drwil/evidence/acceptance.json : un agent peut encore écrire à la main l'acceptation des critères (limite de QUA-175, gardes d'écriture des hooks d'agent hors périmètre du chantier cycle-de-vie-des-fiches). À cadrer : refuser toute écriture de ce fichier par un outil d'agent, ou la détecter à la clôture.
- 2026-10-29 — Au cadrage, repérer un critère d'acceptation marqué [humain] qui serait vérifiable par une machine (texte conservé, renvois valides…) et proposer un contrôle à la place, selon la règle de conception de docs/ia-first.md section 3 (une preuve humaine est le prochain contrôle à outiller). Vu sur ia-first-en-sections-courtes, 2026-10-29.
- 2026-10-29 — Les docs que le kit fait produire par l'agent (docs/audit-risks.md, docs/value-discovery.md, fiches, journal…) n'ont aucun plafond de taille ; les faire entrer sous un plafond bloquant, car des agents les relisent (souhait du demandeur, 2026-10-29). Les fichiers du kit installés chez l'adoptant restent en avertissement.
- 2026-10-30 — Clôture récurrente bloquée : close.mjs supprime la fiche, et tout renvoi à elle hors du bloc scope (catalogue, dashboard, intentions, index, journal) bloque le commit de clôture, sans retour possible depuis CLOSING (arrivé aux chantiers adopter-seuil-couverture, couverture-du-code-modifie, e2e-et-attestation-precises). À outiller : close.mjs --check en BUILD qui liste ces renvois et propose l'extension de scope, ou réorientation automatique vers le journal avant la clôture.
- 2026-10-30 — Attente des commandes longues non outillée : les sous-agents lancent des boucles 'while pgrep -f ...; do sleep 5; done' qui se voient elles-mêmes et ne finissent jamais (15 boucles zombies le 2026-10-30), faute d'un outil pour attendre run-checks, verify ou un commit à hooks au-delà du délai de 120 s. À outiller : un script drwil qui lance la commande en tâche de fond, écrit son verdict dans un fichier et expose une attente bornée, plus la consigne run_in_background dans les sous-agents.
- 2026-10-30 — Périmètre : l'agent peut élargir le bloc scope de la fiche active en BUILD (commit de cadrage séparé, lu dans HEAD par la barrière), décision du demandeur : le garder mais le rendre bien visible — avertissement net sur tout commit qui modifie ce bloc, mention obligatoire au compte rendu de fin de tâche (chemins ajoutés et raison) ; réaligner QUA-050 (« le cadrage ne s'élargit jamais ») et la barrière sur cette décision ; vu au lot 1 de release-allegee (copies du module de release hors scopeMirrors).
- 2026-10-30 — Clôture : le verify de VERIFY échoue (5 faux FAIL docs-references) parce que l'entrée du journal cite docs/preuves/<fiche>.md que close.mjs ne crée qu'à la clôture ; close.mjs n'ajoute pas lui-même la ligne « Preuve de clôture » au journal ; la ligne de pending.md qui cite la fiche supprimée se corrige à la main — à faire faire à close.mjs (ou à tolérer la citation de la preuve du chantier actif) pour qu'une passe qui échoue avant la clôture ne soit plus un faux signal (vu à release-allegee).
- 2026-10-30 — Clôture : changer le texte des critères d'une fiche (ajouter les IDs de contrat, marquer [humain]) change l'empreinte acceptée au lancement et impose une nouvelle acceptation humaine (state.mjs accept, terminal interactif) avant que close.mjs écrive la preuve ; chaque ID ajouté à un critère après coup coûte donc un geste humain — voir si la liaison critère-contrat peut se faire au cadrage ou sans changer l'empreinte (vu à release-allegee).
- 2026-10-30 — Projet neuf (test d'installation réel, drwil_walk) : un chantier de garantie (ex. versionnement : dépôt, forge, CI, protection de la branche principale) atteint ses objectifs mais sa clôture est refusée, parce que drwil verify juge le projet entier et non le chantier — les garanties couverture et e2e ne peuvent pas être tenues sans code, et 11 contrats en vérification manuelle attendent une attestation humaine ; sur un projet neuf, aucun chantier de garantie ne peut donc être clos séparément ; à trancher : un verdict de clôture limité aux critères de la fiche, ou des garanties « pas encore applicables » tant qu'il n'y a pas de code, ou des attestations de départ ; défaut du kit (livrable), à reprendre avec garanties-la-suite.

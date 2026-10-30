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
- 2026-10-30 — Signaler un défaut du kit : depuis un projet qui a installé drwil, il n'existe aucun chemin prévu pour remonter un défaut du kit vers le dépôt drwil (l'agent de drwil_walk a proposé « le noter dans wdubilly/drwil » sans moyen outillé, et la rédaction dépend de la session) ; à trancher : une commande ou recette de rapport de défaut (texte prêt à coller, sans donnée du projet, avec version du kit et message du contrôle en échec), sans jamais écrire dans un autre dépôt sans demande ; livrable.
- 2026-10-30 — Garanties : le classement « nouveau » ou « existant » d'un projet dépend de la présence de code au moment où on lance guarantees, alors que pour un projet neuf la recette impose d'écrire le code d'abord ; le même projet est donc classé différemment selon l'ordre des gestes (défaut du kit, livrable, à voir avec la fiche docs/projects/cloture-sur-projet-neuf.md).
- 2026-10-30 — Garanties : drwil guarantees affiche « ✓ couverture » pendant que drwil verify déclare la même garantie non tenue ; les deux outils se contredisent faute d'un même juge (défaut du kit, livrable, à voir avec la fiche docs/projects/cloture-sur-projet-neuf.md).

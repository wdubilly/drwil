# Intention : notes en vrac

**Statut** : ouverte en permanence — notes rangées le 2026-10-29 (rangement du backlog).

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
- 2026-10-29 — /drwil-start en « This folder » crée et bascule sur workstream/<fiche> depuis la branche principale à jour (comme « New worktree »), garde la branche si on est déjà sur une branche de chantier, refuse une branche existante ou un arbre sale ; QUA-017 reste le filet. À cadrer : fiche, contrat et test.
- 2026-10-29 — Défaut : l'état reste CLOSING après la fusion de la PR du chantier ; il devrait revenir en SCOPING de lui-même une fois le chantier terminé et fusionné (aujourd'hui seul le prochain start ou next le fait), ce qui empêche de cadrer le suivant sans geste. Le retour se fait à la fusion effective de la PR, jamais à la programmation de la fusion automatique ; il vaut aussi pour une file de chantiers : la fusion constatée, l'état revient en SCOPING et le chantier suivant de la file démarre sans geste de plus.
- 2026-10-29 — Défaut : le sondage /drwil-start de Copilot CLI avec le champ fiche en choix multiple (type array, items.enum) revient avec fiche vide malgré la case cochée, trois fois de suite le 2026-10-28 ; le même champ en choix unique (enum seul) est lu correctement. À reproduire et corriger côté skill ou hook (le skill prescrit pourtant le choix multiple).
- 2026-10-29 — Garde d'écriture sur .drwil/evidence/acceptance.json : un agent peut encore écrire à la main l'acceptation des critères (limite de QUA-175, gardes d'écriture des hooks d'agent hors périmètre du chantier cycle-de-vie-des-fiches). À cadrer : refuser toute écriture de ce fichier par un outil d'agent, ou la détecter à la clôture.

# Intention : un priorisateur par urgence et valeur

**Statut** : proposée le 2026-11-22, demande du demandeur. Livrable d'abord (pour tout adoptant), dépôt aussi.

## Besoin

Mots du demandeur, le 2026-11-22 : « faut prioriser aussi… un orchestrateur ou un prioriseur qui indiquerait ce qui
devrait être fait par ordre d'urgence », précisé « priorisateur par urgence ET valeur ».

Il lit tout ce qui est en attente : fiches et intentions de l'index, défauts ouverts et leur gravité (ce qui casse un
adoptant d'abord), dépendances (« après la fusion de… ») et fichiers communs entre fiches, coût mesuré (temps, tokens,
`.drwil/usage.jsonl`), gain attendu pour l'adoptant. Il propose un ordre de l'index avec la raison de chaque rang ;
l'humain le valide par un sondage ; l'index est alors mis à jour et `/drwil-start` le suit. Il conseille, il ne lance
jamais : le lancement reste une décision humaine.

## Existant

Relevé dans le code le 2026-11-22.

- L'ordre de l'index est tenu à la main dans `docs/projects/pending.md` (section « Fiches cadrées », sous-titres par
  thème, priorités `[P0]` à `[P3]` facultatives et non vérifiées). `/drwil-start` suit cet ordre (QUA-160 :
  `.githooks/briefs-order.mjs`, `cadredOrder`).
- Le recouvrement des fichiers entre fiches est déjà calculé (`.githooks/briefs-overlap.mjs`, `scopesOverlap`), pour la
  file parallèle.
- La consommation par chantier est relevée dans `.drwil/usage.jsonl` (`.githooks/consumption.mjs`).
- `docs/projects/analyse-d-urgence-des-fiches.md` (fiche prête, cadrée le 2026-11-12) : une fiche P0 porte une
  section « Urgence » (bloque-t-elle un adoptant ou la CI, contournement, échéance), avertie par `check-docs`.
- Le skill `drwil-value` (`docs/recipes/discover-product-value.md`) produit une analyse de valeur produit
  (`docs/value-discovery.md` (si présent)), à la demande, sans toucher à l'ordre de l'index.

## Questions à trancher

- [décision] Critères et pondération entre urgence et valeur.
- [décision] Sources lues, et comment se lit la gravité d'un défaut ou le gain pour l'adoptant.
- [décision] Forme : commande, skill, sondage ; fréquence (à chaque clôture, à la demande).
- [décision] Sort de `docs/projects/analyse-d-urgence-des-fiches.md` et rapport avec `drwil-value`.
- [décision] Orchestrateur qui lancerait de lui-même : hors périmètre ou non.
- [décision] Dimensions du produit de l'adoptant (UX, applicatif, données…) comme critères de valeur : comment elles se
  déclarent (adoption, contrats par thème, couches), lien avec `drwil-value`.

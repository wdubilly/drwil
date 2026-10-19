# Intention : une application de suivi des chantiers, interactive

**Statut** (2026-10-19) : à cadrer — intention posée par le demandeur,
questions à trancher en fin de fiche.

## Besoin

Le demandeur voudrait une application, de type bureau, pour suivre les
chantiers selon tous leurs aspects (état, cadrage, preuves, coût,
intentions et décisions en attente). Elle doit être **embarquable avec le
paquet** et **interactive a minima** : lecture seule ne suffit pas.

## Existant

Relevé le 2026-10-19, d'après les skills et fiches listées (non relu dans
le code) :

- Skill `drwil-progress` : tableau de bord HTML statique (avancement,
  couverture des contrats), sans serveur.
- `.drwil/usage.jsonl` : consommation de tokens par chantier
  (`drwil-usage`).
- `.drwil/state.json` (si présent), fiches, index (`docs/projects/pending.md`) et
  journal : état, cadrage et historique déjà versionnés.
- Intentions voisines : `docs/intentions/vue-de-relecture.md` (ce qui
  demande le jugement humain) et `docs/intentions/fiche-de-recette-html.md`.

## Pistes envisagées

1. Tableau de bord HTML statique enrichi, régénéré à la demande.
2. Serveur local embarqué (`drwil ui`, Node sans dépendance, écoute sur
   `127.0.0.1`) : recommandé, embarquable dans `packages/drwil/`.
3. Application native (Tauri ou Electron) : publiée à part (GitHub
   Releases), non embarquée dans le paquet npm.

Niveau d'interactivité visé en première étape : navigation, filtres,
rafraîchissement en direct des fichiers, bouton `drwil verify`. Les gestes
humains (lancer un chantier, attester, verdict de recette) viendraient
plus tard, protégés par un jeton de session affiché dans le terminal de
l'humain, pour qu'un agent appelant l'API locale ne puisse pas les
déclencher.

## Contraintes

- Source unique : l'application lit les fichiers versionnés, sans
  dupliquer de donnée.
- Aucune action de gouvernance exposée à un agent : « un agent n'atteste
  jamais » reste vrai.
- Agnostique de l'outil d'agent ; pas de SaaS imposé.

## Questions à trancher

- [décision] Dépôt ou livrable (QUA-018, séparation drwil-le-dépôt /
  drwil-le-livrable) : outil interne, ou fonction du gabarit distribué ?
- [décision] Niveau d'ambition : serveur local (piste 2) ou application
  native (piste 3) ?
- [décision] Actions : lecture seule plus `verify`, ou aussi les gestes
  humains (et avec quel jeton) ?
- [décision] Périmètre : un seul dépôt, ou plusieurs projets suivis
  ensemble ?
- [décision] Lien avec la vue de relecture : une seule vue, ou deux ?

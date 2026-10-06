# Intention : Surveiller la consommation de tokens par lot/chantier

**Statut** (2026-10-04) : fait — recette `docs/recettes/suivre-consommation-par-lot.md`,
skill Claude, extension du tableau de bord (agrégation tokens/durée/modèles par
chantier) et section « Aperçu de consommation » dans `auditer-risques-et-dette`
et `decouvrir-valeur-produit` livrées et testées (32/32 tests kit verts,
`check-docs`/`run-checks` verts sur drwil).

## Besoin
Avoir une visibilité sur la consommation de tokens (coût IA), le temps de
mise en place et le modèle employé, par lot ou par chantier
(`docs/projets/*.md`) : affichée comme indicateur supplémentaire dans le
tableau de bord, et reprise en aperçu dans les rapports générés par les
skills d'analyse (`auditer-risques-et-dette`, `decouvrir-valeur-produit`).

## Existant
- Tableau de bord statique (`.githooks/tableau-de-bord.mjs`) : lit uniquement
  les fichiers .md de `docs/projets/` (Statut, Lots, Contrats). N'a aucune source de
  données de consommation IA.
- Aucune capture automatique de l'usage token dans le dépôt lui-même : les
  seules données de consommation connues vivent côté outil IA (historique de
  session, pas dans le dépôt).

## Questions à trancher
(résolu — voir « Décisions prises » ci-dessous)

## Décisions prises (2026-10-04)
1. **Source** : automatique côté agent IA (pas de saisie manuelle par
   l'humain) — mais « automatique » veut dire « l'IA le fait en clôturant
   un lot », pas un script indépendant : un outil comme `session_store_sql`
   (historique Copilot CLI) n'est interrogeable que par l'agent lui-même,
   pas par un script lancé hors du harnais. Le mécanisme est donc
   une **recette que l'IA suit**, pas un module exécutable autonome.
2. **Généricité** : le format de fichier reste indépendant d'un outil IA
   précis (pas seulement Copilot CLI) ; seule la méthode pour le remplir
   automatiquement (interroger `session_store_sql`) est spécifique à
   Copilot CLI — documentée comme telle, avec repli manuel pour un autre
   outil.
3. → Convention de fichier générique :
   - `.drwil/usage.jsonl` (à créer) : fichier append-only, une ligne JSON
     par clôture de lot :
     `{ "chantier": "extraction-ia-first-run-box", "lot": "Lot 8", "tokens": 42000, "modele": "claude-sonnet-5", "duree_min": 95, "date": "2026-10-04" }`.
   - `modele` : identifiant du modèle employé pour ce lot (ex.
     `claude-sonnet-5`) — plusieurs lots peuvent avoir des modèles
     différents, chaque ligne ne porte qu'un seul modèle (si un lot a
     mêlé plusieurs modèles, plusieurs lignes ou `modele: "mixte"`).
   - `duree_min` : temps de mise en place du lot, en minutes (calculé par
     l'IA à partir de l'historique de session au moment de clôturer le
     lot — premier et dernier tour de la portion concernée).
   - N'importe quel outil IA (ou saisie manuelle) peut ajouter une ligne ;
     le kit ne dépend que du format, pas de la source.
4. **Granularité** : par lot/chantier (clé `chantier` + `lot` dans chaque
   ligne), agrégation possible par chantier dans le tableau de bord (total
   tokens, total durée, liste des modèles employés).
5. **Seuil d'alerte** : informatif uniquement pour l'instant (pas de blocage).
6. **Rapports d'analyse** : `docs/recettes/auditer-risques-et-dette.md` et
   `docs/recettes/decouvrir-valeur-produit.md` ajoutent une courte section
   « Aperçu de consommation » en tête de leur sortie si .drwil/usage.jsonl
   existe (totaux + modèles employés), sans bloquer si le fichier est
   absent.

## Périmètre
- Définir et documenter le format .drwil/usage.jsonl (schéma ci-dessus) :
  une recette dédiée `docs/recettes/suivre-consommation-par-lot.md` (à créer)
  (FR/EN) qui explique le format et comment l'IA l'alimente (requête
  `session_store_sql` pour Copilot CLI, estimation manuelle sinon).
- Étendre `.githooks/tableau-de-bord.mjs` (module optionnel existant) pour
  lire ce fichier s'il existe, agréger tokens/durée/modèles par
  chantier/lot, les afficher en colonne/section supplémentaire.
- Ajouter la section « Aperçu de consommation » aux gabarits de sortie de
  `auditer-risques-et-dette.md` et `decouvrir-valeur-produit.md` (FR/EN).
- Si .drwil/usage.jsonl absent : le tableau de bord et les deux skills
  d'analyse doivent continuer à fonctionner comme avant (aucune
  régression), juste sans cette section.

## Hors périmètre
- Facturation réelle / coût en euros (seulement un ordre de grandeur en
  tokens, pas de conversion monétaire).
- Blocage de commit lié à un dépassement (informatif, pas un contrôle
  bloquant — cohérent avec l'ancien défaut `avertissement` de `cadrage`, passé à `bloquant` le 2026-10-06).
- Module autonome (.mjs) d'export automatique (impossible : les données de
  session ne sont accessibles qu'à l'agent IA lui-même, pas à un script
  externe) — remplacé par une recette suivie par l'IA.

## Critères de sortie
- .drwil/usage.jsonl documenté (recette dédiée) et lu par
  `.githooks/tableau-de-bord.mjs` sans régression si absent.
- Recette `suivre-consommation-par-lot` testée sur ce dépôt (au moins une
  ligne d'usage réelle ajoutée, visible dans le tableau de bord).
- Les deux skills d'analyse affichent l'aperçu de consommation quand le
  fichier existe.
- Tests du kit toujours verts.

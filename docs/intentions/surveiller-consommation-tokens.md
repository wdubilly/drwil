# Intention : Surveiller la consommation de tokens par lot/chantier

**Statut** (2026-10-04) : cadré — prêt à implémenter.

## Besoin
Avoir une visibilité sur la consommation de tokens (coût IA) engagée par lot
ou par chantier (`docs/projets/*.md`), et l'afficher comme indicateur
supplémentaire dans le tableau de bord (`docs/recettes/visualiser-avancement.md`,
module optionnel `.githooks/tableau-de-bord.mjs`).

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
1. **Source** : automatique, pas de saisie manuelle.
2. **Généricité** : le mécanisme doit rester indépendant d'un outil IA
   précis (pas seulement Copilot CLI).
3. → Ces deux contraintes ensemble imposent une **convention de fichier
   générique** plutôt qu'une dépendance directe à un outil :
   - `.drwil/usage.jsonl` (à créer) : fichier append-only, une ligne JSON
     par clôture de lot :
     `{ "chantier": "extraction-ia-first-run-box", "lot": "Lot 8", "tokens": 42000, "date": "2026-10-04" }`.
   - N'importe quel outil IA (ou script) peut y ajouter une ligne ; le kit ne
     dépend que du format, pas de la source.
   - Pour Copilot CLI spécifiquement, fournir un **module optionnel séparé**
     (ex. `templates/common/optional/usage-copilot-cli/`) qui sait exporter
     depuis l'historique local (session_store_sql) vers .drwil/usage.jsonl
     — explicitement marqué comme spécifique à l'outil, pas dans le socle.
4. **Granularité** : par lot/chantier (clé `chantier` + `lot` dans chaque
   ligne), agrégation possible par chantier dans le tableau de bord.
5. **Seuil d'alerte** : informatif uniquement pour l'instant (pas de blocage).

## Périmètre
- Définir et documenter le format .drwil/usage.jsonl (schéma ci-dessus)
  dans `docs/ia-first.md` (ou une recette dédiée).
- Étendre `.githooks/tableau-de-bord.mjs` (module optionnel existant) pour lire ce
  fichier s'il existe, agréger les tokens par chantier/lot, les afficher en
  colonne/indicateur supplémentaire à côté de chaque lot.
- Fournir le module optionnel `usage-copilot-cli` (export Copilot CLI →
  fichier générique), hors socle, documenté comme spécifique à cet outil.
- Si .drwil/usage.jsonl absent : le tableau de bord doit continuer à
  fonctionner comme avant (aucune régression), juste sans colonne tokens.

## Hors périmètre
- Facturation réelle / coût en euros (seulement un ordre de grandeur en
  tokens, pas de conversion monétaire).
- Blocage de commit lié à un dépassement (informatif, pas un contrôle
  bloquant — cohérent avec `cadrage` en `avertissement` par défaut).
- Export automatique pour d'autres outils que Copilot CLI (pourra être
  ajouté plus tard sur le même principe de module optionnel).

## Critères de sortie
- .drwil/usage.jsonl documenté et lu par `.githooks/tableau-de-bord.mjs` sans
  régression si absent.
- Module optionnel `usage-copilot-cli` fonctionnel sur ce dépôt (génère au
  moins une ligne d'usage réelle, visible dans le tableau de bord).
- Tests du kit toujours verts.

# Intention : relever le cache lu moyen par requête après la réduction du contexte

**Statut** : proposée le 2026-10-24 — limite du chantier « réduire le contexte
relu par chantier » (décision du demandeur : l'indicateur sorti des critères
d'acceptation devient un relevé, sans seuil).

## Besoin

Savoir si la lecture ciblée (QUA-124, lecture d'un contrat ou d'une entrée de
journal par son identifiant), les sorties courtes (QUA-126, `run-checks` limité
aux échecs), le sous-agent de contrôles (QUA-129) et la lecture forcée
(QUA-132, registre et journal jamais lus en entier avec Claude Code) baissent
vraiment le contexte relu à chaque requête.

## Existant (relevé le 2026-10-24)

- `node .githooks/consumption.mjs --recorded` : « rouvrir après clôture »
  24,9 M de cache lu pour 147 requêtes (≈ 169 k par requête),
  « contournements complétés » 18,0 M pour 143 (≈ 126 k).
- Référence retenue par le demandeur : ≈ 170 k par requête.

## Questions à trancher

- Relever avec `node .githooks/consumption.mjs --recorded` le cache lu moyen
  par requête sur deux chantiers comparables (taille, risque HIGH, nombre de
  requêtes du même ordre) clos après celui-ci ; le comparer aux ≈ 170 k ; le
  consigner au journal, puis supprimer cette fiche.
- Quels chantiers comptent comme « comparables » : à trancher par le
  demandeur au moment du relevé.

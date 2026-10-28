# Projet : `docs/ia-first.md` en sections courtes autonomes, sous un plafond de lecture à la demande abaissé

**Statut** : cadré le 2026-10-28 — à affiner (trois décisions ouvertes).
**Risque** : HIGH
**Maturité** : à affiner
**Intention** : `docs/intentions/fichiers-charges-courts.md`

<!-- scope
files:
  - packages/drwil/templates/common/base/docs/ia-first.md
  - docs/ia-first.md
  - packages/drwil/templates/common/base/.githooks/check-kit-size.mjs
  - .githooks/check-kit-size.mjs
  - .githooks/check-kit-size.test.mjs
  - .drwil/ia-first.json
  - outils/miroirs.json
  - docs/contracts.md
  - docs/architecture.md
  - docs/projects/kit-mechanics.md
  - packages/drwil/CHANGELOG.md
  - docs/intentions/fichiers-charges-courts.md
  - docs/projects/pending.md
  - docs/projects/journal.md
-->

## 1. Besoin

`docs/ia-first.md` fait 916 lignes. Seul le plafond hérité `kitSizeLegacy`
(`.drwil/ia-first.json`) le tolère, au-dessus du plafond de 800 lignes des
documents lus à la demande (QUA-157). Or 800 lignes restent trop pour le coût en
tokens : un agent qui ne cherche qu'une règle en charge des centaines.

Décision du demandeur (2026-10-28) : abaisser le plafond des documents lus à la
demande (400 ou 500 lignes) et découper `docs/ia-first.md` en sections courtes,
autonomes, chargées seulement quand leur situation se présente. La fiche retire
alors `kitSizeLegacy` : plus aucun fichier du kit au-dessus de son plafond.

Fait à peser : environ 250 fichiers citent `docs/ia-first.md` (« section N » dans les
recettes, les contrats, les messages des hooks). Le nom du fichier et la
numérotation de ses sections sont donc un contrat de fait.

## Critères d'acceptation

(les contrats sont à créer au lancement, avec leur champ **Origine** ; ID à
attribuer à ce moment-là dans le registre.)

- Aucun document lu à la demande du kit ne dépasse le nouveau plafond, et
  `kitSizeLegacy` est retiré — contrat à créer (ou QUA-157 modifié, voir
  « Contrats modifiés » au lancement)
- Chaque section issue de la découpe se lit seule : un agent la charge sans
  lire les autres, et chaque renvoi existant vers `docs/ia-first.md` mène à la bonne
  section — contrat à créer
- Aucun contenu n'est perdu : le texte de chaque règle de la section 8 et des
  sections 1 à 7 se retrouve, mot pour mot, dans une section — [humain] revue
  de la découpe

## 2. Hors périmètre

- Les autres documents du kit (recettes, `AGENTS.md`) : leurs plafonds ne
  changent pas, sauf celui des documents lus à la demande.
- Un outil de découpe pour l'adoptant : intention séparée
  (`docs/intentions/alleger-les-fichiers-de-l-adoptant.md`).

## 3. Contraintes

- Code livré : on édite le gabarit, la copie du dépôt suit
  (`npm run installer-depot`).
- Les références existantes ne doivent pas casser : un contrôle de liens ou de
  sections citées, s'il existe, reste vert ; sinon la fiche en pose un.
- Un projet déjà adopté garde son `docs/ia-first.md` à la mise à jour : à
  vérifier avec `drwil update`, aucune perte (même exigence que pour
  `AGENTS.md`).

## 4. Décisions

(validées par le demandeur le 2026-10-28)

1. Abaisser le plafond des documents lus à la demande et découper
   `docs/ia-first.md` en sections courtes autonomes.
2. Retirer `kitSizeLegacy` à la fin du chantier.

## 5. Points à trancher

- [décision] Plafond : 400 ou 500 lignes pour les documents lus à la demande ?
  (ce document ne doit pas lui-même rester un fichier unique de plus de 100
  lignes d'index si on garde un sommaire.)
- [décision] Forme de la découpe : un dossier docs/ia-first/ (dossier) d'un fichier par
  section avec `docs/ia-first.md` gardé comme sommaire court qui aiguille (les
  citations « `docs/ia-first.md`, section N » restent vraies), ou des fichiers
  renommés avec réécriture des ~250 renvois ?
- [décision] Chargement : `node .githooks/glossary.mjs` lit-il une section par
  nom (`--section`), ou seule la lecture directe du fichier de section suffit-elle ?

## 6. Increments

- **Lot 1 — plafond et forme** [IA] : une fois les décisions prises, le plafond
  abaissé dans `.githooks/check-kit-size.mjs` (gabarit et copie), test au nouveau seuil.
- **Lot 2 — découpe** [IA] : sections courtes autonomes, sommaire, renvois
  vérifiés, `kitSizeLegacy` retiré ; carte d'architecture et `kit-mechanics.md`
  à jour ; ligne « Unreleased » du changelog. Critère de sortie :
  `node .githooks/run-checks.mjs` OK, `drwil verify --agent` PASS.

## 7. Reprise

- **Dernier état** (2026-10-28) : cadré, trois décisions à prendre avant le lancement.
- **Travail non commité** : aucun.
- **Prochaine étape** : [décision] trancher les trois points ci-dessus, puis passer la maturité à « prêt ».

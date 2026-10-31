# Projet : ajouter ou adopter un contrat par commande

**Statut** : cadré le 2026-10-30.
**Risque** : HIGH
**Maturité** : prêt
**Intention** : `docs/intentions/installation-fluide.md`

<!-- scope
files:
  - packages/drwil/src/cli-verify.ts
  - packages/drwil/src/cli-contracts.ts
  - packages/drwil/src/cli-texts.ts
  - packages/drwil/src/index.ts
  - packages/drwil/test/cycle.test.mjs
  - packages/drwil/test/kit.test.mjs
  - docs/recipes/adopt-the-kit.md
  - packages/drwil/templates/common/base/docs/recipes/adopt-the-kit.md
  - packages/drwil/README.md
  - packages/drwil/CHANGELOG.md
  - docs/contracts.md
  - docs/contracts-catalog.md
  - docs/projects/kit-mechanics.md
  - docs/architecture.md
  - .drwil/ia-first.json
-->

## 1. Besoin

Adopter un contrat du catalogue revient aujourd'hui à recopier sa ligne, sans le préfixe `catalogue:`, dans
`docs/contracts.md`, à l'adapter à la pile, puis à la retirer du catalogue (un ID ne peut pas figurer aux
deux). Un utilisateur doit pouvoir intégrer un contrat du catalogue ou en écrire un propre au projet sans
recopier des blocs et des lignes de tableau à la main (jugé important, 2026-10-27). Décision du 2026-10-30 :
deux commandes, `drwil contracts add` et `drwil contracts adopt <ID>`.

## Critères d'acceptation

- `drwil contracts adopt <ID>` déplace le contrat du catalogue vers le registre, sans préfixe, et écrit la
  déclaration de son contrôle depuis le catalogue pour la pile — contrat à créer
- `drwil contracts add` crée le squelette d'un contrat propre au projet, d'un ID jamais défini — contrat à
  créer
- Un agent peut lancer l'ajout et l'adoption ; modifier ou retirer un contrat refuse sans le oui de l'humain —
  `QUA-050`
- Un ID déjà défini, un contrat absent du catalogue ou un registre invalide est refusé, sans rien écrire —
  contrat à créer

## 2. Hors périmètre

- Modifier ou retirer un contrat par commande : reste un geste humain, hors de la commande.
- Choisir à la place du demandeur les contrats à adopter : la recette d'adoption les propose un par un.
- Attester le contrat adopté (`drwil attest`).

## 3. Contraintes

- Le gabarit est la seule source ; la copie du dépôt suit (`scopeMirrors`). Un nouveau fichier de code ajoute
  la carte d'architecture (`docs/architecture.md`) et `docs/projects/kit-mechanics.md`.
- QUA-172 : le registre des contrats s'écrit en SCOPING comme une fiche, et reste soumis au cadrage en BUILD ;
  la commande refuse en BUILD hors du cadrage de la fiche active.
- QUA-018 : un contrat du dépôt drwil et un contrat du livrable ne se mélangent pas ; la commande dit lequel
  des deux elle écrit.
- Le plafond de 200 lignes par fichier de code.

## 4. Décisions

Tranchées par le demandeur le 2026-10-30 :

- Ajout et adoption par l'agent ; modifier ou retirer un contrat reste un geste humain.
- La commande écrit la déclaration du contrôle depuis le catalogue (plutôt qu'un squelette seul).

## 5. Points à trancher

- [IA] Forme exacte du squelette d'un contrat propre (champs obligatoires, ID proposé) : à fixer au lot 1
  depuis le modèle du registre.
- [IA] Que fait la commande quand le catalogue ne propose pas de contrôle pour la pile du projet ? À fixer au
  lot 1 (par défaut : refuser en le disant).

## 6. Increments

- **Lot 1 — adopter** [IA] : `drwil contracts adopt <ID>`, tests (catalogue vers registre, ID déjà défini,
  pile sans contrôle). Critère de sortie : un contrat du catalogue adopté en une commande passe
  `drwil contracts` valide.
- **Lot 2 — ajouter** [IA] : `drwil contracts add`, tests, recette d'adoption. Critère de sortie : un contrat
  propre créé en une commande est valide.

## 7. Reprise

- **Dernier état** (2026-10-30) : cadré, aucun code.
- **Travail non commité** : aucun.
- **Prochaine étape** : [décision] lancer par `/drwil-start`.

# Projet : l'e2e et l'attestation disent précisément ce qu'ils prouvent

**Statut** : cadré le 2026-10-30 — rien de commencé.
**Risque** : HIGH
**Maturité** : prêt
**Intention** : `docs/intentions/e2e-et-attestation-precises.md`

<!-- scope
files:
  - packages/drwil/templates/common/base/docs/contracts-catalog.md
  - docs/contracts-catalog.md
  - packages/drwil/templates/common/base/docs/recipes/adopt-the-kit.md
  - docs/recipes/adopt-the-kit.md
  - packages/drwil/templates/common/base/docs/ia-first/5-proving-the-work.md
  - docs/ia-first/5-proving-the-work.md
  - .drwil/ia-first.json
  - docs/contracts.md
  - packages/drwil/test/kit.test.mjs
-->

(cadrage : le catalogue, la recette d'adoption et la section 5 de
`docs/ia-first/` (preuves), gabarit et copies du dépôt, le registre et le
test du paquet. Aucun code livré ne change : c'est de la prose et sa preuve.)

## 1. Besoin

Deux preuves sont dites trop vite. Pour l'e2e (`catalogue:QUA-020`, parcours
critiques couverts par un test de bout en bout), rien ne dit ce que « de bout
en bout » veut dire pour une bibliothèque ou un outil sans interface.
Pour l'attestation (`drwil attest`), la doc ne distingue pas l'identité,
l'approbation et la preuve d'exécution : elle prouve une action interactive
liée au texte et à la preuve du contrat, pas l'identité (l'auteur vient de
la configuration git, déclarative). L'exigence ne change pas : ni exception
ni dérogation aux garanties obligatoires (décision du 2026-10-22).

## Critères d'acceptation

(le contrat est à créer au lancement, avec son champ **Origine** ; ID à
attribuer à ce moment-là dans le registre, après vérification qu'il est libre
au catalogue.)

- Le catalogue définit l'e2e par forme de projet : bibliothèque (installer le
  paquet comme un client, appeler l'API publique, vérifier résultats et
  erreurs), service (un parcours à travers son API), application web (un
  parcours utilisateur) ; la même définition vaut pour tous, sans doublure
  sur ce qu'on veut garantir — contrat à créer
- La recette d'adoption renvoie à cette définition sans la recopier (une
  information, une seule source) — contrat à créer
- La doc des preuves distingue l'identité, l'approbation et la preuve
  d'exécution, et dit ce que garantit `drwil attest` et ce qu'il ne garantit
  pas — contrat à créer

## Contrats modifiés

(aucun à ce stade : la définition de l'e2e et la précision de l'attestation
sont des ajouts de prose. Si le lot montre qu'un contrat existant — `catalogue:QUA-020` du
catalogue, une règle d'attestation du registre — doit changer de critère,
le dire ici et le faire valider avant de l'écrire.)

## 2. Hors périmètre

- Une identité forte en option (commits signés, revue GitHub authentifiée) :
  décision du 2026-10-30, seule la documentation des niveaux est faite ; une
  option pour équipe reste une intention.
- Tout assouplissement de l'exigence d'e2e ou d'attestation.

## 3. Contraintes

- Une information, une seule source : la définition vit dans le catalogue,
  les autres documents la citent.
- Gabarit et copie du dépôt à l'identique (QUA-018, périmètre explicite
  dépôt contre livrable).
- Texte de la prose du kit : une mise à jour rafraîchit une section restée
  telle qu'installée (QUA-190).

## 4. Décisions

- 2026-10-22 (demandeur) : aucune exception ni dérogation aux garanties
  obligatoires ; seule la forme de la preuve varie.
- 2026-10-30 (demandeur, recommandation de l'agent acceptée) : adopter la
  définition de l'e2e par forme de projet dans le catalogue et la recette.
- 2026-10-30 (demandeur, recommandation de l'agent acceptée) : documenter les
  niveaux de garantie de l'attestation, sans identité forte en option.

## 5. Lots

- **Lot 1 — l'e2e défini** : la définition par forme dans le catalogue, le
  renvoi de la recette, le test qui la garde.
- **Lot 2 — l'attestation précisée** : les trois niveaux dans la section 5
  de `docs/ia-first/`, le contrat et son test, la carte à jour si besoin.

## 6. Reprise

- **Dernier état** (2026-10-30) : cadré ; rien de commencé.
- **Prochaine étape** : lancer le lot 1.

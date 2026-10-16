# Intention : la non-régression métier, alimentée chantier après chantier

**Statut** : proposée le 2026-10-16 — vision du demandeur, exprimée en
conversation après la clôture du chantier « cohérence des ID de contrat ».

**Projet** : DRWIL — livrable d'abord (projets équipés), le dépôt suit.

## Besoin

Deux natures de contrats, deux circuits :

| | Bonnes pratiques | Règles métier |
|---|---|---|
| Origine | écrites d'avance, génériques | découvertes chantier après chantier |
| Où elles vivent | le catalogue (`docs/contracts-catalog.md`) | le registre du projet (`docs/contracts.md`) |
| Comment elles entrent | l'utilisateur les demande pour son projet | un critère d'acceptation d'un chantier devient un contrat métier, prouvé par un test |
| Rôle | hygiène, sécurité | non-régression fonctionnelle : un chantier suivant ne peut pas casser une règle sans le voir |

Le registre métier d'un projet doit grandir avec ses chantiers et protéger
chacun d'eux, en disant clairement, quand un test casse, quelle règle et
quel chantier d'origine sont touchés.

## Existant (vérifié le 2026-10-16)

- **Bonnes pratiques** : le catalogue est livré ; la recette d'adoption
  (`docs/recipes/adopt-the-kit.md`, étape 4) propose ses lignes une par
  une, une ligne adoptée passe au registre et quitte le catalogue (QUA-028,
  un ID à un seul endroit).
- **Règles métier** : un critère d'acceptation est prouvé par un contrat
  du registre (QUA-022, preuve d'un critère laissée au registre) ; un
  contrat modifié sans déclaration est une régression (QUA-023,
  régression ou évolution d'un contrat) ; `init` livre un contrat métier
  d'exemple à remplacer, APP-001 (QUA-024, premier contrat métier).

## Ce qui manque

1. **Le lien contrat ↔ tests n'est pas contrôlé chez l'utilisateur** : le
   contrôle `tests-contrats` (`outils/verifier-tests-contrats.mjs`) n'existe
   que dans ce dépôt ; dans un projet équipé, rien ne vérifie que le test
   cité par un contrat métier existe et porte son ID.
2. **Un test qui casse peut être attribué au mauvais contrat** : le statut
   d'un contrat suit son champ Contrôle, pas ses Tests. Constaté le
   2026-10-16 dans une copie jetable : le test de QUA-028 cassé donne bien
   `GOVERNANCE: FAIL`, mais l'échec est attribué à QUA-021, QUA-023 et
   QUA-004 (contrôle `couverture-hooks` partagé), avec l'origine d'un autre
   chantier. Même décalage dans ce dépôt pour QUA-013, QUA-015, QUA-016,
   QUA-017 et QUA-028 (tests rejoués par un contrôle que le contrat ne
   cite pas).
3. **Pas de vue des règles métier** : lesquelles sont prouvées par un
   test, lesquelles restent à compléter (champ Manuel), de quel chantier
   chacune vient.
4. **Pas de recette pour demander une bonne pratique hors adoption**
   (secondaire) : « je veux tel contrat du catalogue maintenant ».

## Décisions

Tranchées par le demandeur le 2026-10-16 (sondage) :

- Points 1 et 2 : réalisés le 2026-10-16 (`docs/projects/journal.md`,
  « Lien contrat ↔ test », QUA-029 et QUA-030) — lien contrat ↔ test livré, bloquant ou avertissement selon
  `newRequirements` ; un contrôle par règle métier, filtré par l'ID, et
  verify signale un contrôle partagé qui échoue.
- Point 3 : la vue des règles métier dans `drwil verify` d'abord ; la vue
  d'avancement plus tard. Précisé le 2026-10-16 : préfixe métier (`APP`
  par défaut, réglable) plus tout contrat qui porte un champ Origine ; un
  bilan d'une ligne, le détail dans le JSON — cadré dans
  `docs/projects/vue-regles-metier.md`, en `[P1]`.

## Questions à trancher

- [décision] Point 4 : recette « demander une bonne pratique hors
  adoption », quand ?

## Liens

- `docs/intentions/catalogue-cycle-de-vie.md` : le contenu du catalogue
  des bonnes pratiques.
- `docs/intentions/non-regression-continue.md` : la capitalisation des
  preuves en tests, livrée par le chantier « capitaliser les
  non-régressions ».
- `docs/intentions/preuve-des-criteres-visible.md` : la preuve des
  critères visible dès verify.

# Intentions

Une **intention** est un besoin exprimé, ni cadré, ni chiffré, ni priorisé :
ce n'est pas un engagement. Chaque fiche dit le besoin tel qu'il a été
formulé, ce qui existe déjà dans le code (relevé à la date de la fiche) et
les questions à trancher avant d'écrire quoi que ce soit.

Cycle de vie : une intention cadrée devient un projet (`docs/projets/`) ;
abandonnée, sa fiche est supprimée avec la raison dans le message de commit.
Un besoin déjà clair et réalisable tel quel ne passe pas par ici : il va
directement dans l'index des chantiers. Forme d'une fiche (contrôlée,
QUA-015) : ligne « Statut » en tête, datée (AAAA-MM-JJ), sections « Besoin »,
« Existant » (relevé dans le code, daté) et « Questions à trancher ».

Les intentions de ce dépôt sont listées une fois, dans l'index des
chantiers (`docs/projets/en-attente.md`, marqueur `[décision]`) : pas de
seconde liste ici.

## Modèle de fiche

```
# Intention : titre court

**Statut** : proposée le AAAA-MM-JJ.

## Besoin

(le besoin tel qu'exprimé, sans reformulation qui tranche à la place du demandeur)

## Existant

(relevé dans le code à la date ci-dessus ; « non vérifié » si pas lu)

## Questions à trancher

- [décision] ...
```

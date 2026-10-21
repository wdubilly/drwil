# Intentions

Une **intention** est un besoin exprimé, ni cadré, ni chiffré, ni priorisé :
ce n'est pas un engagement. Chaque fiche dit le besoin tel qu'il a été
formulé, ce qui existe déjà dans le code (relevé à la date de la fiche) et
les questions à trancher avant d'écrire quoi que ce soit.

Cycle de vie : une intention cadrée devient un projet (`docs/projects/`) ;
abandonnée, sa fiche est supprimée avec la raison dans le message de commit.
Un besoin déjà clair et réalisable tel quel ne passe pas par ici : il va
directement dans l'index des chantiers. Forme d'une fiche (contrôlée,
QUA-015) : ligne « Statut » en tête, datée (AAAA-MM-JJ), sections « Besoin »,
« Existant » (relevé dans le code, daté) et « Questions à trancher ». Une
intention relue plus tard et trouvée en partie dépassée reçoit une ligne
datée sous son Statut, `**Revu le AAAA-MM-JJ** : ce qui est devenu faux,
ce qui reste vivant` ; une intention sans revue datée depuis 30 jours est
signalée par les contrôles. La clôture d'un chantier met à jour
l'intention dont il vient (champ `**Intention**` de la fiche), ou la
résume au journal et la retire si elle est entièrement couverte.
La clôture refuse un chantier dont l'intention n'a pas été touchée (`node .githooks/close.mjs`), et signale en avertissement une intention nouvelle qui cite un chemin déjà cité par une autre.

Une idée d'une ligne, trop légère pour une fiche, se note d'une commande :
`node .githooks/note.mjs "<texte>"` ajoute une ligne datée à
`docs/intentions/notes.md` (si présent) (hors de l'index des chantiers), à tout moment et
depuis tout outil, sans changer d'activité ; une note est toujours une
intention, jamais un ordre de coder. Elle est promue en fiche d'intention
quand elle mûrit, et sa ligne est alors retirée.

Les intentions de ce dépôt sont listées une fois, dans l'index des
chantiers (`docs/projects/pending.md`, marqueur `[décision]`) : pas de
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

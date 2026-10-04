---
name: drwil
description: Point d'entrée pour découvrir les capacités de pilotage du kit drwil. Sans argument, affiche le menu des capacités et leur commande dédiée. Avec un argument (adopter, audit, valeur, conso, avancement), renvoie directement à la recette correspondante.
argument-hint: "[adopter|audit|valeur|conso|avancement]"
arguments: capacite
disable-model-invocation: true
---

Capacité demandée : `$capacite`.

Si `$capacite` est vide, afficher ce menu et s'arrêter là (ne rien lancer
d'autre) :

| Commande | Capacité | Recette |
| --- | --- | --- |
| `/drwil-adopter` | Adopter le kit sur un projet existant | `docs/recettes/adopter-le-kit.md` |
| `/drwil-audit` | Auditer risques et dette | `docs/recettes/auditer-risques-et-dette.md` |
| `/drwil-valeur` | Découvrir la valeur produit | `docs/recettes/decouvrir-valeur-produit.md` |
| `/drwil-conso` | Suivre la consommation par lot | `docs/recettes/suivre-consommation-par-lot.md` |
| `/drwil-avancement` | Visualiser l'avancement | `docs/recettes/visualiser-avancement.md` |

Si `$capacite` correspond à l'une des valeurs `adopter`, `audit`,
`valeur`, `conso`, `avancement`, appliquer directement la recette
associée dans le tableau ci-dessus (ne pas la réécrire ici, la lire et
la suivre). Sinon, signaler que la capacité n'est pas reconnue et
réafficher le menu.

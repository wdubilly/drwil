---
name: drwil
description: Point d'entrée pour découvrir les capacités de pilotage du kit drwil. Sans argument, affiche le menu des capacités et leur commande dédiée. Avec un argument (verify, adopter, audit, valeur, conso, avancement, release), renvoie directement à la capacité correspondante.
argument-hint: "[verify|adopter|audit|valeur|conso|avancement|release]"
arguments: capacite
disable-model-invocation: true
---

Capacité demandée : `$capacite`.

Si `$capacite` est vide, afficher ce menu et s'arrêter là (ne rien lancer
d'autre) :

| Commande | Capacité | Recette |
| --- | --- | --- |
| `/drwil verify` | Le travail est-il vérifié ? (workflow agent / humain ci-dessous) | `docs/ia-first.md`, section 5 |
| `/drwil-adopter` | Adopter le kit sur un projet existant | `docs/recettes/adopter-le-kit.md` |
| `/drwil-audit` | Auditer risques et dette | `docs/recettes/auditer-risques-et-dette.md` |
| `/drwil-valeur` | Découvrir la valeur produit | `docs/recettes/decouvrir-valeur-produit.md` |
| `/drwil-conso` | Suivre la consommation par lot | `docs/recettes/suivre-consommation-par-lot.md` |
| `/drwil-avancement` | Visualiser l'avancement | `docs/recettes/visualiser-avancement.md` |
| `/drwil-release` | Créer une release (tag + note GitHub), module optionnel | `docs/recettes/creer-une-release.md` |

Si `$capacite` vaut `verify` : lancer `npx drwil verify --agent` à la racine
du projet (la CLI `drwil` du projet est la source de vérité ; ne jamais
déduire un verdict soi-même) et suivre sa ligne « Next step » :

- `GOVERNANCE: PASS` : le travail est vérifié ; continuer ou terminer.
- `GOVERNANCE: FAIL` : corriger les contrats en échec, puis relancer
  `/drwil verify`.
- `GOVERNANCE: VERIFY ERROR` : signaler le problème de vérification ; ne
  jamais prétendre que le travail est vérifié.
- `GOVERNANCE: MANUAL REVIEW REQUIRED` : cesser toute prétention de
  validation ; transmettre à l'humain « Human attestation required. », les
  contrats listés et la commande `drwil attest <CONTRACT_ID>`, comme une
  action à faire **par lui**.

Ne jamais exécuter `drwil attest`, ne jamais écrire ni modifier quoi que ce
soit dans le dossier des attestations (.drwil/evidence/attestations), ne
jamais présenter une attestation humaine comme faite par l'agent : un agent
ne s'atteste jamais lui-même.

Si `$capacite` correspond à l'une des valeurs `adopter`, `audit`,
`valeur`, `conso`, `avancement`, `release`, appliquer directement la recette
associée dans le tableau ci-dessus (ne pas la réécrire ici, la lire et
la suivre). Sinon, signaler que la capacité n'est pas reconnue et
réafficher le menu.

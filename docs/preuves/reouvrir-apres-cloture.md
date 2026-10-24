# Preuve de clôture — reouvrir-apres-cloture

**Clos le** : 2026-10-24
**Commit vérifié** : `5f8f5e26da` — verdict `drwil verify` : PASS

critères de ce chantier, et ce qui les prouve aujourd'hui encore (rejoués par `drwil verify` après la clôture) :

| Critère | Contrat | Contrôle | Empreinte des fichiers couverts |
|---|---|---|---|
| En CLOSING, quand la PR du chantier est ouverte et non fusionnée, l'agent rouvre le chantier seul, par une commande : la fiche revient telle qu'elle était au commit qui précède la clôture, l'activité repasse en BUILD sur elle, sur la même branche, sans réécrire l'historique ni pousser en force ; une fusion automatique programmée est annulée avant tout ; la réouverture est refusée, sans rien changer, hors CLOSING, sur une PR fusionnée ou fermée, et quand l'état de la PR est inconnu (gh absent) | `QUA-116` | `tests-qua-116` | — |
| Un correctif de réouverture qui change les règles du jeu (contrat existant modifié ou retiré, hook, seuil, barrière, CI) voit ses commits refusés par la barrière de périmètre jusqu'au oui de l'humain, comme un détour ; un correctif ordinaire passe sans personne | `QUA-117` | `tests-qua-117` | — |
| La nouvelle clôture passe comme la première : une seule entrée de journal pour le chantier (mise à jour, jamais doublée), une seule ligne de consommation, preuve de clôture réécrite sur le nouveau commit vérifié ; l'autorisation de fusion automatique et la file décidées au lancement sont gardées | `QUA-118` | `tests-qua-118` | — |

# Intention : ce que lit un visiteur reste juste sans dépendre de la mémoire de l'agent

**Statut** : proposée le 2026-10-17 — limite de l'entretien courant du
2026-10-17 (README racine en retard, PR #120) ; élargie le même jour à la
cérémonie de clôture (section « Toute clôture fait l'exercice »).

## Besoin

Le 2026-10-17, le README racine était faux sur trois points après la
clôture du chantier consommation (journal du 2026-10-16) : l'étape
CLOSING sans la consommation, la ligne `/drwil-usage` d'avant la mesure
automatique, et « Current status » qui présentait la 0.6.0 comme sortie
alors que la dernière release était la 0.5.1. Aucun contrôle ne l'a vu ;
c'est le demandeur qui a posé la question. Deux causes :

1. **Contenu en double** : le cycle d'un chantier (SCOPING → CLOSING),
   l'installation et les commandes (`init`, `verify`, `attest`,
   `doctor`, `uninstall`) sont écrits à la fois dans `README.md` et dans
   `packages/drwil/README.md`. La clôture a mis à jour l'un, pas l'autre,
   contre la règle « une information a une seule source » (`AGENTS.md`).
2. **Version annoncée non contrôlée** : rien ne compare ce que le README
   dit de la version (sortie ou à venir) au dernier tag publié.

## Existant (vérifié le 2026-10-17)

- QUA-040 (drwil entretient la carte, le README et le changelog) : le
  contrôle `architecture-map` ne vérifie que la carte ; pour le README et
  le changelog, c'est une consigne de clôture.
- QUA-041 (la documentation lue par un nouvel utilisateur dit vrai) :
  satisfait par une attestation humaine, pas par un contrôle automatique.
- La release renomme la section « Unreleased » du changelog
  (`docs/recipes/create-a-release.md`), sans toucher au README.
- La table des skills n'existe que dans `README.md` (pas en double).

## Toute clôture fait l'exercice (ajouté le 2026-10-17)

Même cause de fond : la clôture de l'entretien courant du 2026-10-17 a
sauté la boucle des intentions. L'agent avait tronqué la sortie de
`node .githooks/state.mjs move CLOSING` et n'a pas lu la règle ; une
limite relevée dans son compte rendu (« Current status » à réécrire à la
release) est restée dans le chat. Rien ne l'a rattrapé :

- QUA-036 (la clôture boucle les intentions) dit « à la clôture d'un
  chantier », sans dire si l'entretien courant en est ;
- son seul garde-fou avertit un commit qui supprime une fiche sans
  toucher son intention : la fiche d'entretien courant n'est jamais
  supprimée et n'a pas de champ `**Intention**`, il ne se déclenche
  jamais pour elle ;
- le rappel CLOSING parle de condenser ou supprimer la fiche, ce qui ne
  s'applique pas à l'entretien courant.

**Décision (demandeur, 2026-10-17)** : toute clôture est contrainte à
l'exercice, entretien courant compris — limites non traitées en
intentions, ce que lit l'utilisateur tenu à jour, consommation consignée.

## Questions à trancher


- [décision] Source unique : le détail (cycle, installation, commandes)
  vit dans un seul des deux README, l'autre y renvoie — lequel, sachant
  que `packages/drwil/README.md` est la page affichée par npm une fois le
  paquet publié ? Ou bien un contrôle qui compare les passages communs ?
- [décision] Version annoncée : un contrôle qui compare la version citée
  par le README (et la section « Current status ») au dernier tag, ou une
  étape de la recette de release qui la réécrit ?
- [décision] Livrable ou dépôt : ces contrôles servent-ils aussi chez un
  projet client (son README et ses tags), ou seulement à ce dépôt ?
- [décision] Comment contraindre la clôture, sans dépendre de la
  lecture du rappel : par exemple, refuser le retour en SCOPING (ou
  avertir) tant que le commit de clôture ne déclare pas ses limites —
  une intention citée, ou « Limites : aucune » explicite (dans « Limites
  connues » du journal pour un chantier, dans la ligne du journal de la
  fiche pour l'entretien courant) ? Refus ou avertissement ?
- [décision] Le rappel CLOSING distingue-t-il l'entretien courant (pas de
  condensation ni de suppression, mais le reste de l'exercice) ?

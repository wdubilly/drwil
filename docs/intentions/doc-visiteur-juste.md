# Intention : ce que lit un visiteur reste juste sans dépendre de la mémoire de l'agent

**Statut** : proposée le 2026-10-17 — limite de l'entretien courant du
2026-10-17 (README racine en retard, PR #120).

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

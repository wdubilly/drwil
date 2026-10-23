# Preuve de clôture — deroule-banc

**Clos le** : 2026-10-23
**Commit vérifié** : `1458d2289c` — verdict `drwil verify` : PASS

critères de ce chantier, et ce qui les prouve aujourd'hui encore (rejoués par `drwil verify` après la clôture) :

| Critère | Contrat | Contrôle | Empreinte des fichiers couverts |
|---|---|---|---|
| Chaque passage, mesuré ou non, écrit le déroulé de la session de l'agent à côté de son résultat, tel que reçu, ligne à ligne ; tout jeton ou clé y est masqué avant l'écriture, et le résultat dit le nombre de masques ; le rapport ne lit que les résultats, jamais un déroulé | `QUA-107` | `tests-qua-107` | — |
| La copie est préparée comme chez un utilisateur réel : dans la condition « avec », drwil est installé depuis le tarball du dépôt en dépendance de développement, puis init par ce paquet, et npx drwil s'y résout sur place, jamais sur le registre npm ; dans les deux conditions, la copie a un dépôt distant local où pousser une branche. Prouvé sur une copie préparée réellement : npx drwil verify y tourne hors réseau, aucune fiche bloquante n'y existe, une branche s'y pousse | `QUA-108` | `tests-qua-108` | — |

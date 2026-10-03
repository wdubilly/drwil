# Recette : déployer en production

*(modèle à compléter par le projet — serveur réel, scripts réels)*

Contexte et pièges du serveur : `docs/deploiement.md` si présent. Ne
déployer que sur demande explicite.

1. Sur le poste de dev : contrôles verts, commit poussé sur la branche
   principale.
2. Sur le serveur : récupérer la nouvelle version, reconstruire, relancer.
3. Vérifier que le service répond (ex. une route de santé, un code HTTP
   attendu).
4. En cas d'échec d'un service : consulter ses logs ; lister ici les causes
   déjà rencontrées au fil du temps.
